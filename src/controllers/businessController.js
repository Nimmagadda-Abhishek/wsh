const { supabaseAdmin } = require('../config/supabase');

const BUSINESS_FIELDS = {
  name: 'name', description: 'description', categoryId: 'category_id',
  email: 'email', phone: 'phone', website: 'website', address: 'address',
  city: 'city', state: 'state', country: 'country', postalCode: 'postal_code',
  latitude: 'latitude', longitude: 'longitude', hours: 'hours',
  socialLinks: 'social_links', tags: 'tags', logoUrl: 'logo_url', coverUrl: 'cover_url'
};

function toDb(body, create = false) {
  const row = {};
  for (const [key, column] of Object.entries(BUSINESS_FIELDS)) {
    if (body[key] !== undefined) row[column] = body[key];
  }
  if (create) row.status = 'draft';
  return row;
}

function validBody(body, create = false) {
  if (create && (typeof body.name !== 'string' || body.name.trim().length < 2 || body.name.trim().length > 120)) return 'name must be 2 to 120 characters';
  if (body.name !== undefined && (typeof body.name !== 'string' || body.name.trim().length < 2 || body.name.trim().length > 120)) return 'name must be 2 to 120 characters';
  if (body.description !== undefined && (typeof body.description !== 'string' || body.description.length > 5000)) return 'description must be at most 5000 characters';
  if (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) return 'email must be valid';
  if (body.categoryId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.categoryId)) return 'categoryId must be a UUID';
  if (body.website && !/^https?:\/\//i.test(body.website)) return 'website must be a valid URL';
  if (body.tags !== undefined && (!Array.isArray(body.tags) || body.tags.length > 15 || body.tags.some(t => typeof t !== 'string' || t.length > 30))) return 'tags must contain at most 15 strings of 30 characters';
  if (body.latitude !== undefined && (typeof body.latitude !== 'number' || body.latitude < -90 || body.latitude > 90)) return 'latitude must be between -90 and 90';
  if (body.longitude !== undefined && (typeof body.longitude !== 'number' || body.longitude < -180 || body.longitude > 180)) return 'longitude must be between -180 and 180';
  return null;
}

function slugify(name) {
  const base = name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 55) || 'business';
  return `${base}-${Math.random().toString(36).slice(2, 7)}`;
}

function fail(res, status, error, message, details) {
  return res.status(status).json({ success: false, error, message, ...(details ? { details } : {}) });
}

async function listMine(req, res) {
  const { data, error } = await supabaseAdmin.from('businesses').select('*').eq('owner_id', req.user.id).order('created_at', { ascending: false });
  if (error) return fail(res, 500, 'DB_ERROR', 'Could not load businesses');
  return res.json({ success: true, data: data || [] });
}

async function listCategories(_req, res) {
  const { data, error } = await supabaseAdmin.from('business_categories').select('id, name, slug').eq('is_active', true).order('sort_order');
  if (error) return fail(res, 500, 'DB_ERROR', 'Could not load business categories');
  return res.json({ success: true, data: data || [] });
}

async function create(req, res) {
  const message = validBody(req.body, true);
  if (message) return fail(res, 400, 'VALIDATION_ERROR', message);
  const { count, error: countError } = await supabaseAdmin.from('businesses').select('id', { count: 'exact', head: true }).eq('owner_id', req.user.id);
  if (countError) return fail(res, 500, 'DB_ERROR', 'Could not verify business limit');
  if (count >= 5) return fail(res, 403, 'BUSINESS_LIMIT_REACHED', 'You can create up to 5 businesses');
  const row = { ...toDb(req.body, true), owner_id: req.user.id, slug: slugify(req.body.name.trim()), plan_code: 'free', tags: req.body.tags || [] };
  const { data, error } = await supabaseAdmin.from('businesses').insert(row).select('*').single();
  if (error) return fail(res, 500, 'DB_ERROR', 'Could not create business');
  await supabaseAdmin.from('profiles').update({ role: 'business_owner' }).eq('id', req.user.id);
  return res.status(201).json({ success: true, data: { business: data } });
}

async function getOne(req, res) {
  const key = req.params.idOrSlug;
  const query = supabaseAdmin.from('businesses').select('*, category:business_categories(id, name, slug)');
  const { data, error } = await (/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(key)
    ? query.eq('id', key)
    : query.eq('slug', key)).maybeSingle();
  if (error) return fail(res, 500, 'DB_ERROR', 'Could not load business');
  if (!data || (data.status !== 'published' && data.owner_id !== req.user?.id)) return fail(res, 404, 'NOT_FOUND', 'Business not found');
  return res.json({ success: true, data: { business: data } });
}

async function update(req, res) {
  const message = validBody(req.body);
  if (message) return fail(res, 400, 'VALIDATION_ERROR', message);
  const updates = toDb(req.body);
  if (!Object.keys(updates).length) return fail(res, 400, 'VALIDATION_ERROR', 'Provide at least one field to update');
  updates.updated_at = new Date().toISOString();
  const { data, error } = await supabaseAdmin.from('businesses').update(updates).eq('id', req.params.id).eq('owner_id', req.user.id).select('*').maybeSingle();
  if (error) return fail(res, 500, 'DB_ERROR', 'Could not update business');
  if (!data) return fail(res, 404, 'NOT_FOUND', 'Business not found');
  return res.json({ success: true, data: { business: data } });
}

async function setStatus(req, res) {
  const { data: business, error: readError } = await supabaseAdmin.from('businesses').select('*').eq('id', req.params.id).eq('owner_id', req.user.id).maybeSingle();
  if (readError) return fail(res, 500, 'DB_ERROR', 'Could not load business');
  if (!business) return fail(res, 404, 'NOT_FOUND', 'Business not found');
  if (req.body.status === 'published') {
    const missing = ['description', 'category_id', 'city'].filter(k => !business[k]);
    if (!business.phone && !business.email) missing.push('phone or email');
    if (missing.length) return fail(res, 422, 'PROFILE_INCOMPLETE', 'Complete your business profile before publishing', { missing });
  }
  const { data, error } = await supabaseAdmin.from('businesses').update({ status: req.body.status, updated_at: new Date().toISOString() }).eq('id', business.id).eq('owner_id', req.user.id).select('*').single();
  if (error) return fail(res, 500, 'DB_ERROR', 'Could not change business status');
  return res.json({ success: true, data: { business: data } });
}

async function publish(req, res) { return setStatus({ ...req, body: { status: 'published' } }, res); }
async function unpublish(req, res) { return setStatus({ ...req, body: { status: 'draft' } }, res); }

module.exports = { listMine, listCategories, create, getOne, update, publish, unpublish };
