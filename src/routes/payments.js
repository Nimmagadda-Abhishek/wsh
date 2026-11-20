import crypto from 'crypto';
import { Router } from 'express';
import Razorpay from 'razorpay';
import { z } from 'zod';
import { supabaseAdmin } from '../config/supabase.js';
import { env } from '../config/env.js';
import { requireAuth, requireApproved } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { ApiError, asyncHandler, loadOwnedBusiness, notify, getPage, pageMeta } from '../utils/helpers.js';

const r = Router();
const getRazorpay = () => {
  if (!env.rzpKeyId || !env.rzpKeySecret) throw new ApiError(503, 'Payments are temporarily unavailable.');
  return new Razorpay({ key_id: env.rzpKeyId, key_secret: env.rzpKeySecret });
};
const requirePaymentsEnabled = () => {
  if (!env.paymentsEnabled) throw new ApiError(503, 'Payments are temporarily unavailable.');
};

const safeEqual = (a, b) => {
  const x = Buffer.from(a || ''), y = Buffer.from(b || '');
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};
const hmac = (secret, data) => crypto.createHmac('sha256', secret).update(data).digest('hex');

// Activates (or renews) a business subscription. Idempotent via upsert on business_id.
async function activateSubscription(biz, plan, userId) {
  let end = null;
  if (plan.price_minor > 0) {
    end = new Date();
    plan.interval === 'year' ? end.setFullYear(end.getFullYear() + 1) : end.setMonth(end.getMonth() + 1);
  }
  const { error } = await supabaseAdmin.from('subscriptions').upsert({
    business_id: biz.id, user_id: userId, plan_id: plan.id, status: 'active',
    current_period_start: new Date().toISOString(), current_period_end: end?.toISOString() ?? null,
  }, { onConflict: 'business_id' });
  if (error) throw error;
  await supabaseAdmin.from('businesses').update({ plan_code: plan.code, is_featured: plan.features?.featured === true }).eq('id', biz.id);
}

// Marks a payment paid exactly once, then activates the plan. Safe to call from verify AND webhook.
async function fulfillPayment(orderId, paymentId) {
  const { data: pay } = await supabaseAdmin.from('payments').select('*').eq('razorpay_order_id', orderId).maybeSingle();
  if (!pay) throw new ApiError(404, 'Unknown order');
  if (pay.status === 'paid') {
    if (pay.payment_type === 'business_listing') {
      const { error } = await supabaseAdmin.from('businesses').update({ listing_fee_paid: true })
        .eq('id', pay.business_id).eq('owner_id', pay.user_id);
      if (error) throw error;
    }
    return pay;
  }
  if (pay.payment_type === 'business_listing' && (pay.amount !== 200 || pay.currency !== 'INR'))
    throw new ApiError(400, 'Listing fee order has an invalid amount');

  const { data: claimed } = await supabaseAdmin.from('payments')
    .update({ status: 'paid', razorpay_payment_id: paymentId, paid_at: new Date().toISOString() })
    .eq('id', pay.id).neq('status', 'paid').select().maybeSingle();
  if (!claimed) return pay; // another request already fulfilled it

  if (pay.payment_type === 'business_listing') {
    const { data: biz, error } = await supabaseAdmin.from('businesses')
      .update({ listing_fee_paid: true }).eq('id', pay.business_id).eq('owner_id', pay.user_id).select('id, name').maybeSingle();
    if (error) throw error;
    if (!biz) throw new ApiError(404, 'Business not found for this payment');
    await notify(pay.user_id, 'Listing fee paid', `The ₹2 listing fee for ${biz.name} is confirmed. You can now publish your business.`, { paymentId: pay.id, businessId: biz.id });
    return claimed;
  }

  const [{ data: plan }, { data: biz }] = await Promise.all([
    supabaseAdmin.from('plans').select('*').eq('id', pay.plan_id).single(),
    supabaseAdmin.from('businesses').select('*').eq('id', pay.business_id).single(),
  ]);
  if (plan && biz) {
    await activateSubscription(biz, plan, pay.user_id);
    await notify(pay.user_id, 'Payment successful', `${plan.name} plan is now active for ${biz.name}.`, { paymentId: pay.id });
  }
  return claimed;
}

// GET /api/payments/plans
r.get('/plans', asyncHandler(async (req, res) => {
  const { data, error } = await supabaseAdmin.from('plans').select('*').eq('is_active', true).order('sort_order');
  if (error) throw error;
  res.json({ data });
}));

// POST /api/payments/checkout  { planCode, businessId } -> Razorpay order
r.post('/checkout', requireAuth, requireApproved, validate(z.object({ planCode: z.string().min(1), businessId: z.string().uuid() })),
  asyncHandler(async (req, res) => {
    const { planCode, businessId } = req.body;
    const { data: plan } = await supabaseAdmin.from('plans').select('*').eq('code', planCode).eq('is_active', true).maybeSingle();
    if (!plan) throw new ApiError(404, 'Plan not found');
    const biz = await loadOwnedBusiness(businessId, req.user);

    if (plan.price_minor === 0) {
      const { data: sub } = await supabaseAdmin.from('subscriptions').select('*').eq('business_id', biz.id).eq('status', 'active').maybeSingle();
      if (sub?.current_period_end && new Date(sub.current_period_end) > new Date() && biz.plan_code !== 'free')
        throw new ApiError(409, 'A paid plan is still active. It will expire at the end of the billing period.');
      await activateSubscription(biz, plan, req.user.id);
      return res.json({ data: { free: true, plan: plan.code } });
    }

    requirePaymentsEnabled();
    const order = await getRazorpay().orders.create({
      amount: plan.price_minor, currency: plan.currency,
      receipt: `b_${biz.id.slice(0, 8)}_${Date.now()}`,
      notes: { business_id: biz.id, plan_code: plan.code, user_id: req.user.id },
    });
    const { error } = await supabaseAdmin.from('payments').insert({
      user_id: req.user.id, business_id: biz.id, plan_id: plan.id,
      razorpay_order_id: order.id, amount: plan.price_minor, currency: plan.currency, status: 'created',
    });
    if (error) throw error;
    res.status(201).json({ data: {
      orderId: order.id, amount: order.amount, currency: order.currency, keyId: env.rzpKeyId,
      plan: { code: plan.code, name: plan.name }, prefill: { email: req.user.email },
    } });
  }));

// POST /api/payments/listing-fee/checkout { businessId } -> fixed ₹2 Razorpay order
r.post('/listing-fee/checkout', requireAuth, requireApproved,
  validate(z.object({ businessId: z.string().uuid() })), asyncHandler(async (req, res) => {
    requirePaymentsEnabled();
    const biz = await loadOwnedBusiness(req.body.businessId, req.user);
    if (biz.listing_fee_paid) return res.json({ data: { paid: true, businessId: biz.id } });

    const order = await getRazorpay().orders.create({
      amount: 200, currency: 'INR', receipt: `listing_${biz.id.slice(0, 8)}_${Date.now()}`,
      notes: { business_id: biz.id, payment_type: 'business_listing', user_id: req.user.id },
    });
    const { error } = await supabaseAdmin.from('payments').insert({
      user_id: req.user.id, business_id: biz.id, payment_type: 'business_listing',
      razorpay_order_id: order.id, amount: 200, currency: 'INR', status: 'created',
    });
    if (error) throw error;
    res.status(201).json({ data: {
      orderId: order.id, amount: order.amount, currency: order.currency, keyId: env.rzpKeyId,
      name: 'WS Hub business listing fee', description: 'One-time business listing fee',
      prefill: { email: req.user.email }, businessId: biz.id,
    } });
  }));

// POST /api/payments/verify  – call after Razorpay Checkout success handler
r.post('/verify', requireAuth, requireApproved, validate(z.object({
  razorpay_order_id: z.string(), razorpay_payment_id: z.string(), razorpay_signature: z.string(),
})), asyncHandler(async (req, res) => {
  requirePaymentsEnabled();
  const { razorpay_order_id: oid, razorpay_payment_id: pid, razorpay_signature: sig } = req.body;
  if (!safeEqual(hmac(env.rzpKeySecret, `${oid}|${pid}`), sig)) throw new ApiError(400, 'Invalid payment signature');
  const { data: own } = await supabaseAdmin.from('payments').select('user_id').eq('razorpay_order_id', oid).maybeSingle();
  if (!own || own.user_id !== req.user.id) throw new ApiError(404, 'Order not found');
  const pay = await fulfillPayment(oid, pid);
  res.json({ data: { status: pay.status, message: 'Payment verified' } });
}));

// GET /api/payments/history
r.get('/history', requireAuth, requireApproved, asyncHandler(async (req, res) => {
  const pg = getPage(req.query);
  const { data, count, error } = await supabaseAdmin.from('payments')
    .select('id, amount, currency, status, payment_type, paid_at, created_at, razorpay_payment_id, plan:plans(code, name), business:businesses(id, name)', { count: 'exact' })
    .eq('user_id', req.user.id).order('created_at', { ascending: false }).range(pg.from, pg.to);
  if (error) throw error;
  res.json({ data, meta: pageMeta(pg, count) });
}));

// GET /api/payments/subscription/:businessId
r.get('/subscription/:businessId', requireAuth, requireApproved, asyncHandler(async (req, res) => {
  const biz = await loadOwnedBusiness(req.params.businessId, req.user);
  const { data } = await supabaseAdmin.from('subscriptions').select('*, plan:plans(*)').eq('business_id', biz.id).maybeSingle();
  res.json({ data: data ?? { plan: { code: 'free' }, status: 'active' } });
}));

// ---- Webhook (mounted in app.js with express.raw BEFORE express.json) ----
export const webhookHandler = asyncHandler(async (req, res) => {
  requirePaymentsEnabled();
  if (!env.rzpWebhookSecret) throw new ApiError(503, 'Payment webhook is not configured. Set RAZORPAY_WEBHOOK_SECRET in the backend environment.');
  const raw = req.body; // Buffer
  if (!safeEqual(hmac(env.rzpWebhookSecret, raw), req.headers['x-razorpay-signature'])) throw new ApiError(400, 'Invalid signature');
  const event = JSON.parse(raw.toString('utf8'));
  const p = event?.payload?.payment?.entity;

  if (event.event === 'payment.captured' || event.event === 'order.paid') {
    const pay = p ?? event.payload?.order?.entity;
    const orderId = p?.order_id ?? pay?.id;
    if (orderId) await fulfillPayment(orderId, p?.id ?? null).catch((e) => console.error('webhook fulfill:', e.message));
  } else if (event.event === 'payment.failed' && p?.order_id) {
    await supabaseAdmin.from('payments').update({ status: 'failed', razorpay_payment_id: p.id }).eq('razorpay_order_id', p.order_id).eq('status', 'created');
  }
  res.json({ received: true });
});

export default r;
