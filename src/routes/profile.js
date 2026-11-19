import { Router } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../config/supabase.js';
import { requireAuth, requireApproved } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { ApiError, asyncHandler, getPage, pageMeta, clean } from '../utils/helpers.js';
import { upload, uploadImage } from '../utils/upload.js';

const r = Router();

const updateSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,30}$/, '3-30 chars: a-z, 0-9, underscore'),
  bio: z.string().trim().max(500),
  phone: z.string().trim().max(20),
  city: z.string().trim().max(80),
  country: z.string().trim().max(80),
  socialLinks: z.record(z.string().trim().min(1).max(40), z.string().url().refine((value) => /^https?:\/\//i.test(value), 'Links must use HTTP or HTTPS'))
    .refine((links) => Object.keys(links).length <= 10, 'Use up to 10 social links'),
}).partial();

// GET /api/profile  – my profile + counters
r.get('/', requireAuth, requireApproved, asyncHandler(async (req, res) => {
  const uid = req.user.id;
  const [profile, biz, fav, notif] = await Promise.all([
    supabaseAdmin.from('profiles').select('*').eq('id', uid).single(),
    supabaseAdmin.from('businesses').select('id', { count: 'exact', head: true }).eq('owner_id', uid),
    supabaseAdmin.from('favorites').select('business_id', { count: 'exact', head: true }).eq('user_id', uid),
    supabaseAdmin.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', uid).eq('is_read', false),
  ]);
  if (profile.error) throw new ApiError(404, 'Profile not found');
  res.json({ data: { ...profile.data, email: req.user.email, counts: { businesses: biz.count, favorites: fav.count, unreadNotifications: notif.count } } });
}));

// PATCH /api/profile
r.patch('/', requireAuth, requireApproved, validate(updateSchema), asyncHandler(async (req, res) => {
  const b = req.body;
  const patch = clean({ full_name: b.fullName, username: b.username, bio: b.bio, phone: b.phone, city: b.city, country: b.country, social_links: b.socialLinks });
  if (!Object.keys(patch).length) throw new ApiError(400, 'Nothing to update');
  const { data, error } = await supabaseAdmin.from('profiles').update(patch).eq('id', req.user.id).select().single();
  if (error) throw error;
  res.json({ data });
}));

// POST /api/profile/avatar  (multipart, field "file")
r.post('/avatar', requireAuth, requireApproved, upload.single('file'), asyncHandler(async (req, res) => {
  const url = await uploadImage('avatars', req.user.id, req.file);
  const { data, error } = await supabaseAdmin.from('profiles').update({ avatar_url: url }).eq('id', req.user.id).select().single();
  if (error) throw error;
  res.json({ data });
}));

// DELETE /api/profile  – permanently delete account and all owned data
r.delete('/', requireAuth, requireApproved, asyncHandler(async (req, res) => {
  const { error } = await supabaseAdmin.auth.admin.deleteUser(req.user.id);
  if (error) throw new ApiError(500, error.message);
  res.json({ data: { message: 'Account deleted' } });
}));

// GET /api/profile/public/:username
r.get('/public/:username', asyncHandler(async (req, res) => {
  const { data: p } = await supabaseAdmin.from('profiles')
    .select('id, email, full_name, username, avatar_url, bio, phone, city, country, social_links, created_at')
    .eq('username', req.params.username.toLowerCase()).eq('approval_status', 'approved').maybeSingle();
  if (!p) throw new ApiError(404, 'Profile not found');
  const { data: businesses } = await supabaseAdmin.from('businesses')
    .select('id, name, slug, logo_url, city, avg_rating, review_count').eq('owner_id', p.id).eq('status', 'published').eq('listing_fee_paid', true);
  res.json({ data: { ...p, businesses } });
}));

// GET /api/profile/favorites
r.get('/favorites', requireAuth, requireApproved, asyncHandler(async (req, res) => {
  const pg = getPage(req.query);
  const { data, count, error } = await supabaseAdmin.from('favorites')
    .select('created_at, business:businesses(id, name, slug, logo_url, city, avg_rating, review_count, status)', { count: 'exact' })
    .eq('user_id', req.user.id).order('created_at', { ascending: false }).range(pg.from, pg.to);
  if (error) throw error;
  res.json({ data: data.filter((f) => f.business?.status === 'published'), meta: pageMeta(pg, count) });
}));

// GET /api/profile/notifications?unread=true
r.get('/notifications', requireAuth, requireApproved, asyncHandler(async (req, res) => {
  const pg = getPage(req.query);
  let q = supabaseAdmin.from('notifications').select('*', { count: 'exact' }).eq('user_id', req.user.id)
    .order('created_at', { ascending: false }).range(pg.from, pg.to);
  if (req.query.unread === 'true') q = q.eq('is_read', false);
  const { data, count, error } = await q;
  if (error) throw error;
  res.json({ data, meta: pageMeta(pg, count) });
}));

// PATCH /api/profile/notifications/read  { ids?: [] }  (omit ids = mark all)
r.patch('/notifications/read', requireAuth, requireApproved, validate(z.object({ ids: z.array(z.string().uuid()).optional() })),
  asyncHandler(async (req, res) => {
    let q = supabaseAdmin.from('notifications').update({ is_read: true }).eq('user_id', req.user.id).eq('is_read', false);
    if (req.body.ids?.length) q = q.in('id', req.body.ids);
    const { error } = await q;
    if (error) throw error;
    res.json({ data: { message: 'Marked as read' } });
  }));

export default r;
