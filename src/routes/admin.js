import { Router } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../config/supabase.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { ApiError, asyncHandler, getPage, pageMeta, notify } from '../utils/helpers.js';

const r = Router();
r.use(requireAuth, requireAdmin);

const count = (t, f) => { let q = supabaseAdmin.from(t).select('*', { count: 'exact', head: true }); if (f) q = f(q); return q.then((x) => x.count); };

// GET /api/admin/stats
r.get('/stats', asyncHandler(async (req, res) => {
  const [users, businesses, published, reviews, paid] = await Promise.all([
    count('profiles'), count('businesses'), count('businesses', (q) => q.eq('status', 'published')), count('reviews'),
    supabaseAdmin.from('payments').select('amount').eq('status', 'paid'),
  ]);
  const pendingUsers = await count('profiles', (q) => q.eq('approval_status', 'pending'));
  res.json({ data: { users, pendingUsers, businesses, published, reviews, revenueMinor: (paid.data || []).reduce((s, p) => s + p.amount, 0) } });
}));

// GET /api/admin/users?q=
r.get('/users', asyncHandler(async (req, res) => {
  const pg = getPage(req.query);
  let q = supabaseAdmin.from('profiles').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range(pg.from, pg.to);
  if (req.query.q) q = q.ilike('full_name', `%${String(req.query.q).replace(/[%,()*]/g, ' ')}%`);
  if (req.query.approvalStatus && ['pending', 'approved', 'rejected'].includes(String(req.query.approvalStatus))) q = q.eq('approval_status', req.query.approvalStatus);
  const { data, count: total, error } = await q;
  if (error) throw error;
  res.json({ data, meta: pageMeta(pg, total) });
}));

// PATCH /api/admin/users/:id/approval
r.patch('/users/:id/approval', validate(z.object({ status: z.enum(['approved', 'rejected']), note: z.string().trim().max(500).optional() })), asyncHandler(async (req, res) => {
  const approved = req.body.status === 'approved';
  const { data, error } = await supabaseAdmin.from('profiles').update({
    approval_status: req.body.status,
    approval_note: req.body.note || null,
    approved_at: approved ? new Date().toISOString() : null,
    approved_by: approved ? req.user.id : null,
  }).eq('id', req.params.id).select().maybeSingle();
  if (error) throw error;
  if (!data) throw new ApiError(404, 'User not found');
  await notify(data.id, approved ? 'Account approved' : 'Account not approved', approved ? 'An administrator approved your WS Hub account.' : (req.body.note || 'An administrator could not approve your WS Hub account.'), { approvalStatus: req.body.status });
  res.json({ data });
}));

// PATCH /api/admin/users/:id/role
r.patch('/users/:id/role', validate(z.object({ role: z.enum(['user', 'business_owner', 'admin']) })), asyncHandler(async (req, res) => {
  const { data, error } = await supabaseAdmin.from('profiles').update({ role: req.body.role }).eq('id', req.params.id).select().maybeSingle();
  if (error) throw error;
  if (!data) throw new ApiError(404, 'User not found');
  res.json({ data });
}));

// GET /api/admin/businesses?status=
r.get('/businesses', asyncHandler(async (req, res) => {
  const pg = getPage(req.query);
  let q = supabaseAdmin.from('businesses').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range(pg.from, pg.to);
  if (req.query.status) q = q.eq('status', req.query.status);
  const { data, count: total, error } = await q;
  if (error) throw error;
  res.json({ data, meta: pageMeta(pg, total) });
}));

// PATCH /api/admin/businesses/:id  { status?, isVerified?, isFeatured? }
r.patch('/businesses/:id', validate(z.object({
  status: z.enum(['draft', 'published', 'suspended']).optional(), isVerified: z.boolean().optional(), isFeatured: z.boolean().optional(),
})), asyncHandler(async (req, res) => {
  const { status, isVerified, isFeatured } = req.body;
  const patch = {};
  if (status !== undefined) patch.status = status;
  if (isVerified !== undefined) patch.is_verified = isVerified;
  if (isFeatured !== undefined) patch.is_featured = isFeatured;
  if (!Object.keys(patch).length) throw new ApiError(400, 'Nothing to update');
  const { data, error } = await supabaseAdmin.from('businesses').update(patch).eq('id', req.params.id).select().maybeSingle();
  if (error) throw error;
  if (!data) throw new ApiError(404, 'Business not found');
  if (status === 'suspended') await notify(data.owner_id, 'Business suspended', `${data.name} was suspended by an administrator.`, { businessId: data.id });
  if (isVerified) await notify(data.owner_id, 'Business verified', `${data.name} now has a verified badge.`, { businessId: data.id });
  res.json({ data });
}));

// DELETE /api/admin/reviews/:id  – moderation
r.delete('/reviews/:id', asyncHandler(async (req, res) => {
  const { error } = await supabaseAdmin.from('reviews').delete().eq('id', req.params.id);
  if (error) throw error;
  res.json({ data: { message: 'Review removed' } });
}));

// GET /api/admin/payments
r.get('/payments', asyncHandler(async (req, res) => {
  const pg = getPage(req.query);
  const paymentStatuses = ['created', 'paid', 'failed', 'refunded'];
  if (req.query.status && !paymentStatuses.includes(String(req.query.status))) throw new ApiError(400, 'Invalid payment status');
  // Fetch enough rows from each ledger to produce a correctly sorted combined page.
  let businessPaymentsQuery = supabaseAdmin.from('payments')
    .select('*, plan:plans(code, name), business:businesses(name), payer:profiles!payments_user_id_fkey(full_name, email)', { count: 'exact' })
    .order('created_at', { ascending: false }).range(0, pg.to);
  let signupPaymentsQuery = supabaseAdmin.from('signup_payments')
    .select('id, email, user_id, razorpay_order_id, razorpay_payment_id, amount_minor, status, created_at, paid_at', { count: 'exact' })
    .not('user_id', 'is', null).not('razorpay_payment_id', 'is', null)
    .order('created_at', { ascending: false }).range(0, pg.to);
  if (req.query.status) {
    businessPaymentsQuery = businessPaymentsQuery.eq('status', String(req.query.status));
    signupPaymentsQuery = signupPaymentsQuery.eq('status', String(req.query.status));
  }
  const [businessPayments, signupPayments] = await Promise.all([businessPaymentsQuery, signupPaymentsQuery]);
  if (businessPayments.error) throw businessPayments.error;
  if (signupPayments.error) throw signupPayments.error;

  const signupUserIds = [...new Set((signupPayments.data || []).map((payment) => payment.user_id).filter(Boolean))];
  const payerProfiles = signupUserIds.length
    ? await supabaseAdmin.from('profiles').select('id, full_name, email').in('id', signupUserIds)
    : { data: [], error: null };
  if (payerProfiles.error) throw payerProfiles.error;
  const payerById = new Map((payerProfiles.data || []).map((profile) => [profile.id, profile]));

  const businessRows = (businessPayments.data || []).map((payment) => ({ ...payment, payment_type: 'business_plan' }));
  const signupRows = (signupPayments.data || []).map((payment) => ({
    id: payment.id,
    user_id: payment.user_id,
    razorpay_order_id: payment.razorpay_order_id,
    razorpay_payment_id: payment.razorpay_payment_id,
    amount: payment.amount_minor,
    currency: 'INR',
    status: payment.status,
    paid_at: payment.paid_at,
    created_at: payment.created_at,
    payment_type: 'joining_fee',
    plan: { code: 'JOINING_FEE', name: 'Account joining fee' },
    business: null,
    payer: { ...payerById.get(payment.user_id), email: payerById.get(payment.user_id)?.email || payment.email },
  }));
  const data = [...businessRows, ...signupRows]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(pg.from, pg.to + 1);
  const total = (businessPayments.count || 0) + (signupPayments.count || 0);
  res.json({ data, meta: pageMeta(pg, total) });
}));

export default r;
