const { supabase } = require('../config/supabase');

/**
 * JWT Authentication Middleware
 *
 * Reads the Bearer token from the Authorization header,
 * verifies it with Supabase, and attaches the user + token to req.
 *
 * Usage: router.use(authMiddleware) or router.get('/path', authMiddleware, handler)
 */
async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Missing or malformed Authorization header. Expected: Bearer <token>'
      });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'No token provided'
      });
    }

    // Verify the token with Supabase
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data?.user) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: error?.message || 'Invalid or expired token'
      });
    }

    // Attach user and raw token to request for downstream use
    req.user = data.user;
    req.accessToken = token;

    next();
  } catch (err) {
    console.error('[AuthMiddleware]', err);
    return res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to authenticate request'
    });
  }
}

module.exports = authMiddleware;
