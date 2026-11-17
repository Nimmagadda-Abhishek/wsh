import crypto from 'crypto';
import { supabaseAdmin } from '../config/supabase.js';

export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export const getPage = (q) => {
  const page = Math.max(parseInt(q.page) || 1, 1);
  const limit = Math.min(Math.max(parseInt(q.limit) || 12, 1), 50);
  const from = (page - 1) * limit;
  return { page, limit, from, to: from + limit - 1 };
};

export const pageMeta = ({ page, limit }, total) => ({
  page,
  limit,
  total: total ?? 0,
  totalPages: Math.ceil((total ?? 0) / limit),
});

export const slugify = (s) =>
  s.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_-]+/g, '-').slice(0, 60) +
  '-' + crypto.randomBytes(3).toString('hex');

export const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));

export const isUuid = (s) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

export async function notify(userId, title, body, data = {}) {
  await supabaseAdmin.from('notifications').insert({ user_id: userId, title, body, data });
}

export async function isAdmin(userId) {
  const { data } = await supabaseAdmin.from('profiles').select('role').eq('id', userId).maybeSingle();
  return data?.role === 'admin';
}

// Loads a business and verifies the user owns it (admins bypass).
export async function loadOwnedBusiness(id, user) {
  if (!isUuid(id)) throw new ApiError(400, 'Invalid business id');
  const { data } = await supabaseAdmin.from('businesses').select('*').eq('id', id).maybeSingle();
  if (!data) throw new ApiError(404, 'Business not found');
  if (data.owner_id !== user.id && !(await isAdmin(user.id))) throw new ApiError(403, 'You do not own this business');
  return data;
}
