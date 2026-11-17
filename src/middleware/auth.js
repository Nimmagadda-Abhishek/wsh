import { supabaseAdmin } from '../config/supabase.js';
import { ApiError, asyncHandler, isAdmin } from '../utils/helpers.js';

const bearer = (req) => {
  const h = req.headers.authorization || '';
  return h.startsWith('Bearer ') ? h.slice(7) : null;
};

export const requireAuth = asyncHandler(async (req, res, next) => {
  const token = bearer(req);
  if (!token) throw new ApiError(401, 'Missing access token');
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) throw new ApiError(401, 'Invalid or expired token');
  req.user = data.user;
  req.token = token;
  next();
});

export const requireApproved = asyncHandler(async (req, res, next) => {
  const { data, error } = await supabaseAdmin.from('profiles')
    .select('role, approval_status').eq('id', req.user.id).maybeSingle();
  if (error) throw error;
  if (!data) throw new ApiError(403, 'Account profile is not available');
  if (data.role !== 'admin' && data.approval_status !== 'approved') {
    throw new ApiError(403, 'Your account is awaiting administrator approval', {
      code: 'ACCOUNT_PENDING_APPROVAL', approvalStatus: data.approval_status || 'pending',
    });
  }
  req.profile = data;
  next();
});

// Attaches req.user if a valid token is present, otherwise continues anonymously.
export const optionalAuth = asyncHandler(async (req, res, next) => {
  const token = bearer(req);
  if (token) {
    const { data } = await supabaseAdmin.auth.getUser(token);
    if (data?.user) { req.user = data.user; req.token = token; }
  }
  next();
});

export const requireAdmin = asyncHandler(async (req, res, next) => {
  if (!(await isAdmin(req.user.id))) throw new ApiError(403, 'Admin access required');
  next();
});
