import { Router } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../config/supabase.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { ApiError, asyncHandler, getPage, pageMeta, notify } from '../utils/helpers.js';

const r = Router();
r.use(requireAuth, requireAdmin);

const count = (t, f) => { let q = supabaseAdmin.from(t).select('*', { count: 'exact', head: true }); if (f) q = f(q); return q.then((x) => x.count); };

// Homepage featured business/startup ordering
r.get('/settings/homepage-featured-order', asyncHandler(async (req, res) => {
  const { data, error } = await supabaseAdmin.from('app_settings').select('setting_value')
    .eq('setting_key', 'homepage_featured_order').maybeSingle();
  if (error) throw error;
  res.json({ data: { order: data?.setting_value === 'rating' ? 'rating' : 'latest' } });
}));

r.patch('/settings/homepage-featured-order', validate(z.object({ order: z.enum(['latest', 'rating']) })), asyncHandler(async (req, res) => {
  const { data, error } = await supabaseAdmin.from('app_settings').upsert({
    setting_key: 'homepage_featured_order', setting_value: req.body.order, updated_by: req.user.id, updated_at: new Date().toISOString(),
  }, { onConflict: 'setting_key' }).select('setting_value').single();
  if (error) throw error;
  res.json({ data: { order: data.setting_value } });
}));

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
  let query = supabaseAdmin.from('payments')
    .select('*, plan:plans(code, name), business:businesses(name), payer:profiles!payments_user_id_fkey(full_name, email)', { count: 'exact' })
    .order('created_at', { ascending: false }).range(pg.from, pg.to);
  if (req.query.status) query = query.eq('status', String(req.query.status));
  const { data, count: total, error } = await query;
  if (error) throw error;
  res.json({ data: data || [], meta: pageMeta(pg, total) });
}));

export default r;
