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

// Activates one membership for the account, shared by every listing the account owns.
async function activateAccountMembership(plan, userId, razorpaySubscriptionId = null) {
  let end = null;
  if (plan.price_minor > 0) {
    end = new Date();
    plan.interval === 'year' ? end.setFullYear(end.getFullYear() + 1) : end.setMonth(end.getMonth() + 1);
  }
  const { error } = await supabaseAdmin.from('account_memberships').upsert({
    user_id: userId, plan_id: plan.id, status: 'active',
    current_period_start: new Date().toISOString(), current_period_end: end?.toISOString() ?? null,
    razorpay_subscription_id: razorpaySubscriptionId,
  }, { onConflict: 'user_id' });
  if (error) throw error;
  const { error: businessError } = await supabaseAdmin.from('businesses').update({ plan_code: plan.code, is_featured: plan.features?.featured === true, listing_fee_paid: true }).eq('owner_id', userId);
  if (businessError) throw businessError;
}

// Marks a payment paid exactly once, then activates the plan. Safe to call from verify AND webhook.
async function fulfillPayment(orderId, paymentId) {
  const { data: signupPay } = await supabaseAdmin.from('signup_payments').select('*').eq('razorpay_order_id', orderId).maybeSingle();
  if (signupPay) {
    if (signupPay.status !== 'paid') {
      const { data: claimed } = await supabaseAdmin.from('signup_payments')
        .update({ status: 'paid', razorpay_payment_id: paymentId, paid_at: new Date().toISOString() })
        .eq('id', signupPay.id).neq('status', 'paid').select().maybeSingle();
      if (claimed) {
        const { error } = await supabaseAdmin.from('payments').update({ status: 'paid', razorpay_payment_id: paymentId, paid_at: claimed.paid_at }).eq('razorpay_order_id', orderId);
        if (error) throw error;
      }
    }
    if (signupPay.status === 'paid') {
      const { error } = await supabaseAdmin.from('payments').update({ status: 'paid', razorpay_payment_id: signupPay.razorpay_payment_id, paid_at: signupPay.paid_at }).eq('razorpay_order_id', orderId);
      if (error) throw error;
    }
    return { ...signupPay, status: 'paid', payment_type: 'signup_fee' };
  }
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

  const { data: plan } = await supabaseAdmin.from('plans').select('*').eq('id', pay.plan_id).single();
  if (plan && ['member_monthly', 'member_yearly'].includes(plan.code)) {
    await activateAccountMembership(plan, pay.user_id, orderId);
    await notify(pay.user_id, 'Payment successful', `${plan.name} is now active for your WS Hub account.`, { paymentId: pay.id });
  }
  return claimed;
}

// GET /api/payments/plans
r.get('/plans', asyncHandler(async (req, res) => {
  const { data, error } = await supabaseAdmin.from('plans').select('*').eq('is_active', true).order('sort_order');
  if (error) throw error;
  res.json({ data });
}));

// Signup is free. Keep these endpoints as compatibility shims for older clients.
r.get('/signup/status', requireAuth, asyncHandler(async (req, res) => {
  res.json({ data: { paid: true, feeRequired: false, payment: null, amountMinor: 0, currency: 'INR' } });
}));

r.post('/signup/checkout', requireAuth, validate(z.object({})), asyncHandler(async (req, res) => {
  res.json({ data: { paid: true, feeRequired: false, payment: null, amountMinor: 0, currency: 'INR' } });
}));
// POST /api/payments/checkout { planCode } -> account-level Razorpay subscription
r.post('/checkout', requireAuth, requireApproved, validate(z.object({ planCode: z.enum(['member_monthly', 'member_yearly']) })),
  asyncHandler(async (req, res) => {
    const { planCode } = req.body;
    const { data: plan } = await supabaseAdmin.from('plans').select('*').eq('code', planCode).eq('is_active', true).maybeSingle();
    if (!plan) throw new ApiError(404, 'Plan not found');
    const { data: currentMembership } = await supabaseAdmin.from('account_memberships')
      .select('status, current_period_end').eq('user_id', req.user.id).maybeSingle();
    if (currentMembership?.status === 'active' && new Date(currentMembership.current_period_end) > new Date())
      throw new ApiError(409, 'Your account already has an active auto-renewing membership. Contact WS Hub support to change billing plans.');
    requirePaymentsEnabled();
    const razorpay = getRazorpay();
    const isMonthly = plan.code === 'member_monthly';
    const razorpayPlanId = isMonthly ? env.rzpMonthlyPlanId : env.rzpYearlyPlanId;
    if (!razorpayPlanId) throw new ApiError(503, `Autopay is not configured. Set ${isMonthly ? 'RAZORPAY_MONTHLY_PLAN_ID' : 'RAZORPAY_YEARLY_PLAN_ID'} to the matching Razorpay plan.`);
    const gatewayPlan = await razorpay.plans.fetch(razorpayPlanId);
    const expectedPeriod = isMonthly ? 'monthly' : 'yearly';
    const expectedAmount = isMonthly ? 29900 : 520000;
    if (gatewayPlan.period !== expectedPeriod || gatewayPlan.interval !== 1 || gatewayPlan.item?.amount !== expectedAmount || gatewayPlan.item?.currency !== 'INR')
      throw new ApiError(503, `The configured Razorpay plan must charge ₹${isMonthly ? '299 monthly' : '5,200 yearly'} in INR.`);
    const subscription = await razorpay.subscriptions.create({
      plan_id: razorpayPlanId, total_count: 1200, quantity: 1, customer_notify: true,
      ...(isMonthly ? { addons: [{ item: { name: 'Initial membership payment', amount: 280100, currency: 'INR' } }] } : {}),
      notes: { plan_code: plan.code, user_id: req.user.id },
    });
    const { error } = await supabaseAdmin.from('payments').insert({
      user_id: req.user.id, business_id: null, plan_id: plan.id,
      razorpay_order_id: subscription.id, amount: plan.price_minor, currency: plan.currency, status: 'created',
    });
    if (error) throw error;
    return res.status(201).json({ data: { subscriptionId: subscription.id, amount: plan.price_minor, currency: plan.currency, keyId: env.rzpKeyId, plan: { code: plan.code, name: plan.name, interval: plan.interval }, prefill: { email: req.user.email } } });
  }));

// POST /api/payments/listing-fee/checkout { businessId } -> fixed ₹2 Razorpay order
r.post('/listing-fee/checkout', requireAuth, requireApproved,
  asyncHandler(async () => { throw new ApiError(410, 'Business listings are free and do not require payment.'); }));

// POST /api/payments/verify  – call after Razorpay Checkout success handler
r.post('/verify', requireAuth, validate(z.object({
  razorpay_order_id: z.string().optional(), razorpay_subscription_id: z.string().optional(), razorpay_payment_id: z.string(), razorpay_signature: z.string(),
}).refine((body) => Boolean(body.razorpay_order_id) !== Boolean(body.razorpay_subscription_id), 'Provide exactly one order or subscription ID')), asyncHandler(async (req, res) => {
  requirePaymentsEnabled();
  const { razorpay_order_id: oid, razorpay_subscription_id: sid, razorpay_payment_id: pid, razorpay_signature: sig } = req.body;
  const gatewayId = sid || oid;
  if (!safeEqual(hmac(env.rzpKeySecret, sid ? `${pid}|${sid}` : `${oid}|${pid}`), sig)) throw new ApiError(400, 'Invalid payment signature');
  const { data: ownSignup } = oid ? await supabaseAdmin.from('signup_payments').select('user_id, amount_minor').eq('razorpay_order_id', oid).maybeSingle() : { data: null };
  const { data: own } = ownSignup ? { data: ownSignup } : await supabaseAdmin.from('payments').select('user_id, amount, currency, plan:plans(code)').eq('razorpay_order_id', gatewayId).maybeSingle();
  if (!own || own.user_id !== req.user.id) throw new ApiError(404, 'Order not found');
  if (sid && !['member_monthly', 'member_yearly'].includes(own.plan?.code)) throw new ApiError(400, 'Subscription does not match a membership plan');
  if (!ownSignup) {
    const { data: profile } = await supabaseAdmin.from('profiles').select('role, approval_status').eq('id', req.user.id).maybeSingle();
    if (profile?.role !== 'admin' && profile?.approval_status !== 'approved') throw new ApiError(403, 'Payments are available only to approved accounts.');
  }
  let remotePayment = await getRazorpay().payments.fetch(pid);
  if (sid && remotePayment.status === 'authorized') remotePayment = await getRazorpay().payments.capture(pid, own.amount, own.currency);
  const expectedAmount = ownSignup ? ownSignup.amount_minor : own.amount;
  const expectedCurrency = ownSignup ? 'INR' : own.currency;
  if ((!sid && remotePayment.order_id !== oid) || (sid && remotePayment.subscription_id !== sid) || remotePayment.amount !== expectedAmount || remotePayment.currency !== expectedCurrency || remotePayment.status !== 'captured')
    throw new ApiError(400, ownSignup ? 'Payment is not captured for this ₹2 order yet. Please retry shortly.' : 'Payment is not captured for the expected order amount yet.');
  const pay = await fulfillPayment(gatewayId, pid);
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

// GET /api/payments/subscription/:businessId (account membership for compatibility with listing editor)
r.get('/subscription/:businessId', requireAuth, requireApproved, asyncHandler(async (req, res) => {
  await loadOwnedBusiness(req.params.businessId, req.user);
  const { data } = await supabaseAdmin.from('account_memberships').select('*, plan:plans(*)').eq('user_id', req.user.id).maybeSingle();
  res.json({ data: data ?? { plan: { code: 'free' }, status: 'active' } });
}));

r.get('/membership', requireAuth, requireApproved, asyncHandler(async (req, res) => {
  const { data, error } = await supabaseAdmin.from('account_memberships').select('*, plan:plans(*)').eq('user_id', req.user.id).maybeSingle();
  if (error) throw error;
  res.json({ data: data ?? { plan: { code: 'free' }, status: 'inactive' } });
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
    const orderId = p?.subscription_id ?? p?.order_id ?? pay?.id;
    if (orderId) await fulfillPayment(orderId, p?.id ?? null);
  } else if (event.event === 'payment.failed' && (p?.subscription_id || p?.order_id)) {
    await supabaseAdmin.from('payments').update({ status: 'failed', razorpay_payment_id: p.id }).eq('razorpay_order_id', p.subscription_id || p.order_id).eq('status', 'created');
  } else if (event.event === 'subscription.charged') {
    const sub = event.payload?.subscription?.entity;
    if (sub?.id) {
      const start = sub.current_start ? new Date(sub.current_start * 1000).toISOString() : new Date().toISOString();
      const end = sub.current_end ? new Date(sub.current_end * 1000) : new Date(start);
      const { data: local } = await supabaseAdmin.from('account_memberships').select('user_id, plan:plans(interval)').eq('razorpay_subscription_id', sub.id).maybeSingle();
      if (local) {
        if (!sub.current_end) local.plan?.interval === 'year' ? end.setFullYear(end.getFullYear() + 1) : end.setMonth(end.getMonth() + 1);
        await supabaseAdmin.from('account_memberships').update({ status: 'active', current_period_start: start, current_period_end: end.toISOString() }).eq('user_id', local.user_id);
        const { data: plan } = await supabaseAdmin.from('account_memberships').select('plan:plans(code, features)').eq('user_id', local.user_id).single();
        await supabaseAdmin.from('businesses').update({ plan_code: plan?.plan?.code, is_featured: plan?.plan?.features?.featured === true, listing_fee_paid: true }).eq('owner_id', local.user_id);
      }
    }
  } else if ((event.event === 'subscription.halted' || event.event === 'subscription.cancelled') && event.payload?.subscription?.entity?.id) {
    const subId = event.payload.subscription.entity.id;
    const { data: local } = await supabaseAdmin.from('account_memberships').update({ status: event.event === 'subscription.cancelled' ? 'cancelled' : 'expired' }).eq('razorpay_subscription_id', subId).select('user_id').maybeSingle();
    if (local?.user_id) await supabaseAdmin.from('businesses').update({ status: 'draft', plan_code: 'free', listing_fee_paid: false, is_featured: false }).eq('owner_id', local.user_id);
  }
  res.json({ received: true });
});

export default r;
