const { supabase, supabaseAdmin } = require('../config/supabase');

/**
 * POST /api/auth/signup
 * Register a new user with email, password, and full_name.
 */
async function signup(req, res) {
  try {
    const { email, password, full_name } = req.body;

    if (!email || !password || !full_name) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'email, password, and full_name are required'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Password must be at least 8 characters long'
      });
    }

    // Create user via Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name }
      }
    });

    if (error) {
      return res.status(400).json({
        success: false,
        error: 'SIGNUP_FAILED',
        message: error.message
      });
    }

    // Insert profile row (the trigger should do this, but we ensure it here)
    if (data.user) {
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert({
          id: data.user.id,
          full_name,
          is_profile_complete: false
        }, { onConflict: 'id' });

      if (profileError) {
        console.error('[AuthController.signup] Profile upsert error:', profileError);
      }
    }

    return res.status(201).json({
      success: true,
      data: {
        user: {
          id: data.user?.id,
          email: data.user?.email,
          full_name,
          email_confirmed: !!data.user?.email_confirmed_at
        },
        session: data.session
          ? {
              access_token: data.session.access_token,
              refresh_token: data.session.refresh_token,
              expires_at: data.session.expires_at
            }
          : null,
        message: data.session
          ? 'Account created successfully'
          : 'Account created. Please check your email to confirm your address.'
      }
    });
  } catch (err) {
    console.error('[AuthController.signup]', err);
    return res.status(500).json({ success: false, error: 'INTERNAL_SERVER_ERROR', message: 'Signup failed' });
  }
}

/**
 * POST /api/auth/login
 * Login with email + password, return JWT + user data.
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'email and password are required'
      });
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return res.status(401).json({
        success: false,
        error: 'LOGIN_FAILED',
        message: error.message
      });
    }

    // Fetch profile data
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('username, full_name, avatar_url, is_profile_complete')
      .eq('id', data.user.id)
      .maybeSingle();

    // Check subscription
    const { data: subscription } = await supabaseAdmin
      .from('user_subscriptions')
      .select('status, expires_at, subscription_plans(name)')
      .eq('user_id', data.user.id)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: data.user.id,
          email: data.user.email,
          ...profile
        },
        session: {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at
        },
        subscription: subscription
          ? {
              is_active: true,
              plan_name: subscription.subscription_plans?.name || null,
              expires_at: subscription.expires_at
            }
          : { is_active: false }
      }
    });
  } catch (err) {
    console.error('[AuthController.login]', err);
    return res.status(500).json({ success: false, error: 'INTERNAL_SERVER_ERROR', message: 'Login failed' });
  }
}

/**
 * POST /api/auth/logout
 * Logout and invalidate the current session.
 */
async function logout(req, res) {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return res.status(400).json({
        success: false,
        error: 'LOGOUT_FAILED',
        message: error.message
      });
    }

    return res.status(200).json({
      success: true,
      data: { message: 'Logged out successfully' }
    });
  } catch (err) {
    console.error('[AuthController.logout]', err);
    return res.status(500).json({ success: false, error: 'INTERNAL_SERVER_ERROR', message: 'Logout failed' });
  }
}

/**
 * POST /api/auth/refresh
 * Refresh the access token using a refresh token.
 */
async function refresh(req, res) {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'refresh_token is required'
      });
    }

    const { data, error } = await supabase.auth.refreshSession({ refresh_token });

    if (error) {
      return res.status(401).json({
        success: false,
        error: 'REFRESH_FAILED',
        message: error.message
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        session: {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at
        }
      }
    });
  } catch (err) {
    console.error('[AuthController.refresh]', err);
    return res.status(500).json({ success: false, error: 'INTERNAL_SERVER_ERROR', message: 'Token refresh failed' });
  }
}

/**
 * POST /api/auth/forgot-password
 * Send a password reset email.
 */
async function forgotPassword(req, res) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'email is required'
      });
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: process.env.PASSWORD_RESET_REDIRECT_URL || `${process.env.FRONTEND_URL || 'http://localhost:3001'}/reset-password`
    });

    if (error) {
      return res.status(400).json({
        success: false,
        error: 'FORGOT_PASSWORD_FAILED',
        message: error.message
      });
    }

    return res.status(200).json({
      success: true,
      data: { message: 'Password reset email sent. Please check your inbox.' }
    });
  } catch (err) {
    console.error('[AuthController.forgotPassword]', err);
    return res.status(500).json({ success: false, error: 'INTERNAL_SERVER_ERROR', message: 'Failed to send reset email' });
  }
}

/**
 * POST /api/auth/reset-password
 * Reset password using the token from the reset email.
 * Expects: { access_token (from email link), new_password }
 */
async function resetPassword(req, res) {
  try {
    const { access_token, new_password } = req.body;

    if (!access_token || !new_password) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'access_token and new_password are required'
      });
    }

    if (new_password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Password must be at least 8 characters long'
      });
    }

    // Set the session using the recovery token
    const { error: sessionError } = await supabase.auth.setSession({
      access_token,
      refresh_token: access_token
    });

    if (sessionError) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_TOKEN',
        message: 'Invalid or expired reset token'
      });
    }

    const { error } = await supabase.auth.updateUser({ password: new_password });

    if (error) {
      return res.status(400).json({
        success: false,
        error: 'RESET_FAILED',
        message: error.message
      });
    }

    return res.status(200).json({
      success: true,
      data: { message: 'Password updated successfully. Please log in with your new password.' }
    });
  } catch (err) {
    console.error('[AuthController.resetPassword]', err);
    return res.status(500).json({ success: false, error: 'INTERNAL_SERVER_ERROR', message: 'Password reset failed' });
  }
}

module.exports = { signup, login, logout, refresh, forgotPassword, resetPassword };
