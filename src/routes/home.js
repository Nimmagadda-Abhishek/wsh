import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { asyncHandler } from '../utils/helpers.js';

const r = Router();
const CARD = 'id, name, slug, description, logo_url, cover_url, city, avg_rating, review_count, is_verified, is_featured, category:categories(name, slug)';

// GET /api/home  – everything the landing page needs in one call
r.get('/', asyncHandler(async (req, res) => {
  const pub = () => supabaseAdmin.from('businesses').select(CARD).eq('status', 'published');
  const results = await Promise.all([
    supabaseAdmin.from('categories').select('id, name, slug, icon').order('sort_order'),
    pub().eq('is_featured', true).order('avg_rating', { ascending: false }).limit(8),
    pub().gte('review_count', 1).order('avg_rating', { ascending: false }).order('review_count', { ascending: false }).limit(8),
    pub().order('created_at', { ascending: false }).limit(8),
    supabaseAdmin.from('plans').select('code, name, description, price_minor, currency, interval, features').eq('is_active', true).order('sort_order'),
    supabaseAdmin.from('businesses').select('id', { count: 'exact', head: true }).eq('status', 'published'),
    supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true }),
  ]);
  const [categories, featured, topRated, latest, plans, bizCount, userCount] = results;
  const failed = results.find((result) => result.error);
  if (failed?.error) throw failed.error;
  const featuredIds = new Set((featured.data || []).map((business) => business.id));
  const businessShowcase = [
    ...(featured.data || []),
    ...(latest.data || []).filter((business) => !featuredIds.has(business.id)),
  ].slice(0, 8);
  res.set('Cache-Control', 'public, max-age=60');
  res.json({ data: {
    categories: categories.data, featured: businessShowcase, topRated: topRated.data, latest: latest.data, plans: plans.data,
    stats: { businesses: bizCount.count, users: userCount.count },
  } });
}));

// GET /api/home/categories
r.get('/categories', asyncHandler(async (req, res) => {
  const { data, error } = await supabaseAdmin.from('categories').select('id, name, slug, icon').order('sort_order');
  if (error) throw error;
  res.set('Cache-Control', 'public, max-age=300');
  res.json({ data });
}));

// GET /api/home/search?q=  – quick autocomplete (businesses + categories)
r.get('/search', asyncHandler(async (req, res) => {
  const s = String(req.query.q || '').replace(/[%,()*]/g, ' ').trim().slice(0, 60);
  if (s.length < 2) return res.json({ data: { businesses: [], categories: [] } });
  const [b, c] = await Promise.all([
    supabaseAdmin.from('businesses').select('id, name, slug, logo_url, city').eq('status', 'published').ilike('name', `%${s}%`).limit(6),
    supabaseAdmin.from('categories').select('id, name, slug').ilike('name', `%${s}%`).limit(4),
  ]);
  res.json({ data: { businesses: b.data, categories: c.data } });
}));

export default r;
