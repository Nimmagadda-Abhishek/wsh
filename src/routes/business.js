import { Router } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../config/supabase.js';
import { requireAuth, requireApproved, optionalAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { ApiError, asyncHandler, getPage, pageMeta, slugify, clean, isUuid, isAdmin, loadOwnedBusiness, notify } from '../utils/helpers.js';
import { upload, uploadImage } from '../utils/upload.js';

const r = Router();
const MAX_BUSINESSES_PER_USER = 5;

const LIST_FIELDS = 'id, name, slug, description, logo_url, cover_url, city, state, listing_type, established_year, employee_count, map_url, products, gallery, startup_details, avg_rating, review_count, is_verified, is_featured, category:categories(id, name, slug)';

const hoursSchema = z.record(z.string(), z.object({ open: z.string().optional(), close: z.string().optional(), closed: z.boolean().optional() }));
const productSchema = z.object({ name: z.string().trim().min(1).max(120), description: z.string().trim().max(1000), image: z.string().url().nullable().optional(), price: z.string().trim().max(50).optional() });
const gallerySchema = z.object({ image: z.string().url(), label: z.string().trim().max(200), group: z.enum(['Office', 'Team', 'Events', 'Products', 'Other']) });
const startupDetailsSchema = z.object({
  stage: z.string().trim().max(40).optional(),
  problem: z.string().trim().max(2000).optional(),
  solution: z.string().trim().max(2000).optional(),
  targetAudience: z.string().trim().max(1000).optional(),
  uniqueValue: z.string().trim().max(1000).optional(),
  businessModel: z.string().trim().max(250).optional(),
  marketSize: z.string().trim().max(250).optional(),
  technologies: z.array(z.string().trim().max(50)).max(20).optional(),
  traction: z.object({ users: z.string().trim().max(80).optional(), customers: z.string().trim().max(80).optional(), revenue: z.string().trim().max(80).optional(), growth: z.string().trim().max(80).optional() }).optional(),
  funding: z.object({ status: z.enum(['Bootstrapped', 'Raising', 'Funded']).optional(), amountRaised: z.string().trim().max(80).optional(), seeking: z.string().trim().max(80).optional() }).optional(),
  followers: z.number().int().min(0).max(100000000).optional(),
  achievements: z.array(z.string().trim().min(1).max(300)).max(30).optional(),
}).optional();
const bodySchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(5000),
  mission: z.string().trim().max(2000).nullable(),
  vision: z.string().trim().max(2000).nullable(),
  categoryId: z.string().uuid().nullable(),
  email: z.string().email().nullable(),
  phone: z.string().trim().max(20).nullable(),
  website: z.string().url().nullable(),
  address: z.string().trim().max(250).nullable(),
  mapUrl: z.string().url().nullable(),
  city: z.string().trim().max(80).nullable(),
  state: z.string().trim().max(80).nullable(),
  country: z.string().trim().max(80).nullable(),
  postalCode: z.string().trim().max(15).nullable(),
  latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable(),
  logoUrl: z.string().url().nullable(),
  coverUrl: z.string().url().nullable(),
  listingType: z.enum(['business', 'startup']),
  establishedYear: z.number().int().min(1800).max(new Date().getFullYear()).nullable(),
  employeeCount: z.number().int().min(0).max(10000000).nullable(),
  products: z.array(productSchema).max(100),
  gallery: z.array(gallerySchema).max(100),
  startupDetails: startupDetailsSchema,
  hours: hoursSchema,
  socialLinks: z.record(z.string(), z.string().url()),
  tags: z.array(z.string().trim().max(30)).max(15),
}).partial();

const toRow = (b) => clean({
  name: b.name, description: b.description, mission: b.mission, vision: b.vision, category_id: b.categoryId, email: b.email, phone: b.phone,
  website: b.website, address: b.address, city: b.city, state: b.state, country: b.country,
  map_url: b.mapUrl, listing_type: b.listingType, established_year: b.establishedYear, employee_count: b.employeeCount,
  postal_code: b.postalCode, latitude: b.latitude, longitude: b.longitude, hours: b.hours,
  social_links: b.socialLinks, tags: b.tags, logo_url: b.logoUrl, cover_url: b.coverUrl, products: b.products, gallery: b.gallery, startup_details: b.startupDetails,
});

// ---------------------------------------------------------------- list / search
// GET /api/businesses?q=&category=slug&city=&minRating=&sort=rating|newest|name|popular&page=&limit=
r.get('/', asyncHandler(async (req, res) => {
  const pg = getPage(req.query);
  const { q, category, city, minRating, listingType, sort = 'rating' } = req.query;
  let query = supabaseAdmin.from('businesses').select(LIST_FIELDS, { count: 'exact' }).eq('status', 'published');

  if (listingType === 'business' || listingType === 'startup') query = query.eq('listing_type', listingType);

  if (q) {
    const s = String(q).replace(/[%,()*]/g, ' ').trim().slice(0, 80);
    if (s) query = query.or(`name.ilike.%${s}%,description.ilike.%${s}%`);
  }
  if (category) {
    const { data: c } = await supabaseAdmin.from('categories').select('id').eq('slug', category).maybeSingle();
    if (!c) return res.json({ data: [], meta: pageMeta(pg, 0) });
    query = query.eq('category_id', c.id);
  }
  if (city) query = query.ilike('city', String(city).replace(/[%,()*]/g, ' ').trim());
  if (minRating) query = query.gte('avg_rating', Number(minRating) || 0);

  const sortCol = { rating: 'avg_rating', newest: 'created_at', name: 'name', popular: 'view_count' }[sort] || 'avg_rating';
  const { data, count, error } = await query
    .order('is_featured', { ascending: false })
    .order(sortCol, { ascending: sort === 'name' })
    .range(pg.from, pg.to);
  if (error) throw error;
  res.json({ data, meta: pageMeta(pg, count) });
}));

// GET /api/businesses/mine
r.get('/mine', requireAuth, requireApproved, asyncHandler(async (req, res) => {
  const { data, error } = await supabaseAdmin.from('businesses')
    .select(`${LIST_FIELDS}, status, plan_code, view_count, created_at`).eq('owner_id', req.user.id).order('created_at', { ascending: false });
  if (error) throw error;
  res.json({ data });
}));

// ---------------------------------------------------------------- create
// POST /api/businesses  (created as draft)
r.post('/', requireAuth, requireApproved, validate(bodySchema.required({ name: true })), asyncHandler(async (req, res) => {
  const { count } = await supabaseAdmin.from('businesses').select('id', { count: 'exact', head: true }).eq('owner_id', req.user.id);
  if (count >= MAX_BUSINESSES_PER_USER) throw new ApiError(403, `You can create up to ${MAX_BUSINESSES_PER_USER} businesses`);

  const { data, error } = await supabaseAdmin.from('businesses')
    .insert({ ...toRow(req.body), owner_id: req.user.id, slug: slugify(req.body.name), status: 'draft' }).select().single();
  if (error) throw error;
  // Promote account to business_owner on first business
  await supabaseAdmin.from('profiles').update({ role: 'business_owner' }).eq('id', req.user.id).eq('role', 'user');
  res.status(201).json({ data });
}));

// ---------------------------------------------------------------- read one
// GET /api/businesses/:idOrSlug
r.get('/:idOrSlug', optionalAuth, asyncHandler(async (req, res) => {
  const key = req.params.idOrSlug;
  const { data: biz, error } = await supabaseAdmin.from('businesses')
    .select('*, category:categories(id, name, slug), owner:profiles!businesses_owner_id_fkey(id, full_name, username, avatar_url)')
    .eq(isUuid(key) ? 'id' : 'slug', key).maybeSingle();
  if (error) throw error;
  if (!biz) throw new ApiError(404, 'Business not found');

  const isOwner = req.user?.id === biz.owner_id;
  if (biz.status !== 'published' && !isOwner && !(req.user && await isAdmin(req.user.id)))
    throw new ApiError(404, 'Business not found');

  const [services, reviews, fav] = await Promise.all([
    supabaseAdmin.from('business_services').select('*').eq('business_id', biz.id).eq('is_active', true).order('created_at'),
    supabaseAdmin.from('reviews').select('id, rating, comment, created_at, reviewer:profiles(full_name, username, avatar_url)')
      .eq('business_id', biz.id).order('created_at', { ascending: false }).limit(5),
    req.user ? supabaseAdmin.from('favorites').select('business_id').eq('user_id', req.user.id).eq('business_id', biz.id).maybeSingle() : { data: null },
  ]);
  if (services.error) throw services.error;
  res.json({ data: { ...biz, services: services.data, recentReviews: reviews.data, isFavorite: !!fav.data, isOwner } });
}));

// POST /api/businesses/:id/view  – count a page view
r.post('/:id/view', asyncHandler(async (req, res) => {
  if (!isUuid(req.params.id)) throw new ApiError(400, 'Invalid business id');
  await supabaseAdmin.rpc('increment_business_views', { bid: req.params.id });
  res.status(204).end();
}));

// ---------------------------------------------------------------- update / delete / publish
r.patch('/:id', requireAuth, requireApproved, validate(bodySchema), asyncHandler(async (req, res) => {
  await loadOwnedBusiness(req.params.id, req.user);
  const patch = toRow(req.body);
  if (!Object.keys(patch).length) throw new ApiError(400, 'Nothing to update');
  const { data, error } = await supabaseAdmin.from('businesses').update(patch).eq('id', req.params.id).select().single();
  if (error) throw error;
  res.json({ data });
}));

r.delete('/:id', requireAuth, requireApproved, asyncHandler(async (req, res) => {
  await loadOwnedBusiness(req.params.id, req.user);
  const { error } = await supabaseAdmin.from('businesses').delete().eq('id', req.params.id);
  if (error) throw error;
  res.json({ data: { message: 'Business deleted' } });
}));

// POST /api/businesses/:id/publish | /unpublish
r.post('/:id/publish', requireAuth, requireApproved, asyncHandler(async (req, res) => {
  const biz = await loadOwnedBusiness(req.params.id, req.user);
  if (biz.status === 'suspended') throw new ApiError(403, 'This business is suspended. Contact support.');
  const missing = ['description', 'category_id', 'city'].filter((f) => !biz[f]);
  if (!biz.phone && !biz.email) missing.push('phone or email');
  if (missing.length) throw new ApiError(422, 'Complete your business profile before publishing', { missing });
  const { data, error } = await supabaseAdmin.from('businesses').update({ status: 'published' }).eq('id', biz.id).select().single();
  if (error) throw error;
  await notify(biz.owner_id, 'Business published', `${biz.name} is now live on the portal.`, { businessId: biz.id });
  res.json({ data });
}));

r.post('/:id/unpublish', requireAuth, requireApproved, asyncHandler(async (req, res) => {
  const biz = await loadOwnedBusiness(req.params.id, req.user);
  if (biz.status === 'suspended') throw new ApiError(403, 'This business is suspended');
  const { data, error } = await supabaseAdmin.from('businesses').update({ status: 'draft' }).eq('id', biz.id).select().single();
  if (error) throw error;
  res.json({ data });
}));

// ---------------------------------------------------------------- media
r.post('/:id/logo', requireAuth, requireApproved, upload.single('file'), asyncHandler(async (req, res) => {
  const biz = await loadOwnedBusiness(req.params.id, req.user);
  const url = await uploadImage('business-media', `${biz.id}/logo`, req.file);
  const { data, error } = await supabaseAdmin.from('businesses').update({ logo_url: url }).eq('id', biz.id).select().single();
  if (error) throw error;
  res.json({ data });
}));

r.post('/:id/cover', requireAuth, requireApproved, upload.single('file'), asyncHandler(async (req, res) => {
  const biz = await loadOwnedBusiness(req.params.id, req.user);
  const url = await uploadImage('business-media', `${biz.id}/cover`, req.file);
  const { data, error } = await supabaseAdmin.from('businesses').update({ cover_url: url }).eq('id', biz.id).select().single();
  if (error) throw error;
  res.json({ data });
}));

r.post('/:id/portfolio-media', requireAuth, requireApproved, upload.single('file'), asyncHandler(async (req, res) => {
  const biz = await loadOwnedBusiness(req.params.id, req.user);
  const kind = req.query.kind;
  if (kind !== 'product' && kind !== 'gallery') throw new ApiError(400, 'Media kind must be product or gallery');
  const url = await uploadImage('business-media', `${biz.id}/portfolio/${kind}`, req.file);
  res.status(201).json({ data: { url } });
}));

// ---------------------------------------------------------------- services
const serviceSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000),
  price: z.number().min(0).max(100000000),
  currency: z.string().length(3),
  isActive: z.boolean(),
}).partial();

r.post('/:id/services', requireAuth, requireApproved, validate(serviceSchema.required({ name: true })), asyncHandler(async (req, res) => {
  const biz = await loadOwnedBusiness(req.params.id, req.user);
  // Enforce plan limit
  const [{ data: plan }, { count }] = await Promise.all([
    supabaseAdmin.from('plans').select('features').eq('code', biz.plan_code).maybeSingle(),
    supabaseAdmin.from('business_services').select('id', { count: 'exact', head: true }).eq('business_id', biz.id),
  ]);
  const max = plan?.features?.max_services ?? 5;
  if (count >= max) throw new ApiError(403, `Your "${biz.plan_code}" plan allows up to ${max} services. Upgrade to add more.`);

  const b = req.body;
  const { data, error } = await supabaseAdmin.from('business_services')
    .insert(clean({ business_id: biz.id, name: b.name, description: b.description, price: b.price, currency: b.currency, is_active: b.isActive })).select().single();
  if (error) throw error;
  res.status(201).json({ data });
}));

r.get('/:id/services', asyncHandler(async (req, res) => {
  const { data, error } = await supabaseAdmin.from('business_services').select('*').eq('business_id', req.params.id).eq('is_active', true);
  if (error) throw error;
  res.json({ data });
}));

r.patch('/:id/services/:serviceId', requireAuth, requireApproved, validate(serviceSchema), asyncHandler(async (req, res) => {
  await loadOwnedBusiness(req.params.id, req.user);
  const b = req.body;
  const patch = clean({ name: b.name, description: b.description, price: b.price, currency: b.currency, is_active: b.isActive });
  const { data, error } = await supabaseAdmin.from('business_services').update(patch)
    .eq('id', req.params.serviceId).eq('business_id', req.params.id).select().maybeSingle();
  if (error) throw error;
  if (!data) throw new ApiError(404, 'Service not found');
  res.json({ data });
}));

r.delete('/:id/services/:serviceId', requireAuth, requireApproved, asyncHandler(async (req, res) => {
  await loadOwnedBusiness(req.params.id, req.user);
  const { error } = await supabaseAdmin.from('business_services').delete().eq('id', req.params.serviceId).eq('business_id', req.params.id);
  if (error) throw error;
  res.json({ data: { message: 'Service deleted' } });
}));

// ---------------------------------------------------------------- reviews
r.get('/:id/reviews', asyncHandler(async (req, res) => {
  const pg = getPage(req.query);
  const { data, count, error } = await supabaseAdmin.from('reviews')
    .select('id, rating, comment, created_at, reviewer:profiles(full_name, username, avatar_url)', { count: 'exact' })
    .eq('business_id', req.params.id).order('created_at', { ascending: false }).range(pg.from, pg.to);
  if (error) throw error;
  res.json({ data, meta: pageMeta(pg, count) });
}));

// POST /api/businesses/:id/reviews  – create or update my review
r.post('/:id/reviews', requireAuth, requireApproved, validate(z.object({ rating: z.number().int().min(1).max(5), comment: z.string().trim().max(2000).optional() })),
  asyncHandler(async (req, res) => {
    const { data: biz } = await supabaseAdmin.from('businesses').select('id, owner_id, name, status').eq('id', req.params.id).maybeSingle();
    if (!biz || biz.status !== 'published') throw new ApiError(404, 'Business not found');
    if (biz.owner_id === req.user.id) throw new ApiError(403, 'You cannot review your own business');
    const { data, error } = await supabaseAdmin.from('reviews')
      .upsert({ business_id: biz.id, user_id: req.user.id, rating: req.body.rating, comment: req.body.comment }, { onConflict: 'business_id,user_id' })
      .select().single();
    if (error) throw error;
    await notify(biz.owner_id, 'New review', `${biz.name} received a ${req.body.rating}-star review.`, { businessId: biz.id });
    res.status(201).json({ data });
  }));

r.delete('/:id/reviews/mine', requireAuth, requireApproved, asyncHandler(async (req, res) => {
  const { error } = await supabaseAdmin.from('reviews').delete().eq('business_id', req.params.id).eq('user_id', req.user.id);
  if (error) throw error;
  res.json({ data: { message: 'Review deleted' } });
}));

// ---------------------------------------------------------------- favorites
r.post('/:id/favorite', requireAuth, requireApproved, asyncHandler(async (req, res) => {
  if (!isUuid(req.params.id)) throw new ApiError(400, 'Invalid business id');
  const { error } = await supabaseAdmin.from('favorites').upsert({ user_id: req.user.id, business_id: req.params.id });
  if (error) throw error;
  res.status(201).json({ data: { isFavorite: true } });
}));

r.delete('/:id/favorite', requireAuth, requireApproved, asyncHandler(async (req, res) => {
  await supabaseAdmin.from('favorites').delete().eq('user_id', req.user.id).eq('business_id', req.params.id);
  res.json({ data: { isFavorite: false } });
}));

export default r;
