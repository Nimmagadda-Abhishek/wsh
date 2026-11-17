const { supabaseAdmin } = require('../config/supabase');

/**
 * GET /api/subscriptions/plans
 * List all active subscription plans.
 */
async function listPlans(req, res) {
  try {
    const { data, error } = await supabaseAdmin
      .from('subscription_plans')
      .select('id, name, description, price, currency, duration_days, features')
      .eq('is_active', true)
      .order('price', { ascending: true });

    if (error) {
      return res.status(500).json({ success: false, error: 'DB_ERROR', message: error.message });
    }

    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('[SubscriptionController.listPlans]', err);
    return res.status(500).json({ success: false, error: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch plans' });
  }
}

/**
 * GET /api/subscriptions/my
 * Get the authenticated user's current subscription.
 */
async function getMySubscription(req, res) {
  try {
    const { data, error } = await supabaseAdmin
      .from('user_subscriptions')
      .select(`
        id, status, started_at, expires_at, created_at,
        subscription_plans ( id, name, description, price, currency, duration_days, features )
      `)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(5); // Return history

    if (error) {
      return res.status(500).json({ success: false, error: 'DB_ERROR', message: error.message });
    }

    const active = data?.find(s => s.status === 'active' && new Date(s.expires_at) > new Date());

    return res.status(200).json({
      success: true,
      data: {
        current: active || null,
        history: data || []
      }
    });
  } catch (err) {
    console.error('[SubscriptionController.getMySubscription]', err);
    return res.status(500).json({ success: false, error: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch subscription' });
  }
}

/**
 * POST /api/subscriptions/subscribe
 * Subscribe to a plan.
 * Body: { plan_id }
 *
 * NOTE: In production, this should integrate a payment gateway (Stripe, etc.)
 * before creating the subscription. This implementation assumes payment is
 * already verified externally or for demo/test environments.
 */
async function subscribe(req, res) {
  try {
    const { plan_id } = req.body;

    if (!plan_id) {
      return res.status(400).json({ success: false, error: 'VALIDATION_ERROR', message: 'plan_id is required' });
    }

    // Validate plan exists and is active
    const { data: plan, error: planError } = await supabaseAdmin
      .from('subscription_plans')
      .select('id, name, duration_days, price, currency')
      .eq('id', plan_id)
      .eq('is_active', true)
      .maybeSingle();

    if (planError || !plan) {
      return res.status(404).json({ success: false, error: 'PLAN_NOT_FOUND', message: 'Plan not found or not active' });
    }

    // Cancel any existing active subscription
    await supabaseAdmin
      .from('user_subscriptions')
      .update({ status: 'cancelled' })
      .eq('user_id', req.user.id)
      .eq('status', 'active');

    // Create new subscription
    const startedAt = new Date();
    const expiresAt = new Date(startedAt);
    expiresAt.setDate(expiresAt.getDate() + plan.duration_days);

    const { data: subscription, error: subError } = await supabaseAdmin
      .from('user_subscriptions')
      .insert({
        user_id: req.user.id,
        plan_id: plan.id,
        status: 'active',
        started_at: startedAt.toISOString(),
        expires_at: expiresAt.toISOString()
      })
      .select(`
        id, status, started_at, expires_at,
        subscription_plans ( name, price, currency )
      `)
      .single();

    if (subError) {
      return res.status(500).json({ success: false, error: 'SUBSCRIPTION_FAILED', message: subError.message });
    }

    // Update the profile's subscription reference
    await supabaseAdmin
      .from('profiles')
      .update({ subscription_id: subscription.id })
      .eq('id', req.user.id);

    return res.status(201).json({
      success: true,
      data: {
        subscription,
        message: `Successfully subscribed to ${plan.name}`
      }
    });
  } catch (err) {
    console.error('[SubscriptionController.subscribe]', err);
    return res.status(500).json({ success: false, error: 'INTERNAL_SERVER_ERROR', message: 'Failed to create subscription' });
  }
}

/**
 * POST /api/subscriptions/cancel
 * Cancel the user's current active subscription.
 */
async function cancelSubscription(req, res) {
  try {
    const { data: existing } = await supabaseAdmin
      .from('user_subscriptions')
      .select('id')
      .eq('user_id', req.user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (!existing) {
      return res.status(404).json({ success: false, error: 'NO_ACTIVE_SUBSCRIPTION', message: 'No active subscription found' });
    }

    const { error } = await supabaseAdmin
      .from('user_subscriptions')
      .update({ status: 'cancelled' })
      .eq('id', existing.id);

    if (error) {
      return res.status(500).json({ success: false, error: 'CANCEL_FAILED', message: error.message });
    }

    return res.status(200).json({
      success: true,
      data: { message: 'Subscription cancelled successfully' }
    });
  } catch (err) {
    console.error('[SubscriptionController.cancelSubscription]', err);
    return res.status(500).json({ success: false, error: 'INTERNAL_SERVER_ERROR', message: 'Failed to cancel subscription' });
  }
}

/**
 * GET /api/subscriptions/status
 * Quick status check for the current user's subscription.
 */
async function getStatus(req, res) {
  try {
    const { data, error } = await supabaseAdmin
      .from('user_subscriptions')
      .select(`
        status, expires_at,
        subscription_plans ( name, price, currency )
      `)
      .eq('user_id', req.user.id)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (error) {
      return res.status(500).json({ success: false, error: 'DB_ERROR', message: error.message });
    }

    if (!data) {
      return res.status(200).json({
        success: true,
        data: {
          is_active: false,
          plan_name: null,
          expires_at: null
        }
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        is_active: true,
        plan_name: data.subscription_plans?.name || null,
        price: data.subscription_plans?.price || null,
        currency: data.subscription_plans?.currency || null,
        expires_at: data.expires_at,
        days_remaining: Math.max(0, Math.ceil((new Date(data.expires_at) - new Date()) / (1000 * 60 * 60 * 24)))
      }
    });
  } catch (err) {
    console.error('[SubscriptionController.getStatus]', err);
    return res.status(500).json({ success: false, error: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch subscription status' });
  }
}

module.exports = { listPlans, getMySubscription, subscribe, cancelSubscription, getStatus };
