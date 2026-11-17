const { supabaseAdmin } = require('../config/supabase');

/**
 * Subscription Check Middleware
 *
 * Must be used AFTER authMiddleware (requires req.user).
 * Verifies the authenticated user has an active subscription.
 * If not, returns 403 with subscription_required error.
 */
async function requireSubscription(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required before subscription check'
      });
    }

    const { data, error } = await supabaseAdmin
      .from('user_subscriptions')
      .select('id, status, expires_at, plan_id, subscription_plans(name)')
      .eq('user_id', req.user.id)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (error) {
      console.error('[SubscriptionMiddleware] DB error:', error);
      return res.status(500).json({
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to verify subscription status'
      });
    }

    if (!data) {
      return res.status(403).json({
        success: false,
        error: 'SUBSCRIPTION_REQUIRED',
        message: 'Please subscribe to access this feature'
      });
    }

    // Attach subscription info for controllers to use if needed
    req.subscription = data;
    next();
  } catch (err) {
    console.error('[SubscriptionMiddleware]', err);
    return res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to verify subscription status'
    });
  }
}

module.exports = requireSubscription;
