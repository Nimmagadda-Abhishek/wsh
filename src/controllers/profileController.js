const { supabaseAdmin, createUserClient } = require('../config/supabase');
const multer = require('multer');
const path = require('path');

// In-memory storage for avatar uploads (we pass them to Supabase Storage)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (jpg, jpeg, png, webp, gif) are allowed'));
    }
  }
});

/**
 * GET /api/profile
 * Get the authenticated user's own profile.
 */
async function getOwnProfile(req, res) {
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select(`
        id, username, full_name, bio, avatar_url,
        phone, location, city, country, website, is_profile_complete,
        created_at, updated_at,
        user_subscriptions!profiles_subscription_id_fkey (
          status, expires_at,
          subscription_plans ( name, price, currency )
        )
      `)
      .eq('id', req.user.id)
      .maybeSingle();

    if (error) {
      return res.status(500).json({ success: false, error: 'DB_ERROR', message: error.message });
    }

    if (!data) {
      return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Profile not found' });
    }

    return res.status(200).json({ success: true, data: { profile: data } });
  } catch (err) {
    console.error('[ProfileController.getOwnProfile]', err);
    return res.status(500).json({ success: false, error: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch profile' });
  }
}

/**
 * GET /api/profile/:userId
 * Get any user's public profile.
 */
async function getPublicProfile(req, res) {
  try {
    const { userId } = req.params;

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, username, full_name, bio, avatar_url, location, website, created_at')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      return res.status(500).json({ success: false, error: 'DB_ERROR', message: error.message });
    }

    if (!data) {
      return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'User not found' });
    }

    return res.status(200).json({ success: true, data: { profile: data } });
  } catch (err) {
    console.error('[ProfileController.getPublicProfile]', err);
    return res.status(500).json({ success: false, error: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch profile' });
  }
}

/**
 * PATCH /api/profile
 * Update the authenticated user's profile.
 */
async function updateProfile(req, res) {
  try {
    const username = req.body.username;
    const full_name = req.body.full_name ?? req.body.fullName;
    const bio = req.body.bio;
    const phone = req.body.phone;
    const location = req.body.location ?? req.body.city;
    const city = req.body.city;
    const country = req.body.country;
    const website = req.body.website;

    // Build update payload with only provided fields
    const updates = { updated_at: new Date().toISOString() };
    if (username !== undefined) updates.username = username;
    if (full_name !== undefined) updates.full_name = full_name;
    if (bio !== undefined) updates.bio = bio;
    if (phone !== undefined) updates.phone = phone;
    if (location !== undefined) updates.location = location;
    if (city !== undefined) updates.city = city;
    if (country !== undefined) updates.country = country;
    if (website !== undefined) updates.website = website;

    // Check if profile is "complete" after this update
    const requiredFields = ['username', 'full_name', 'bio'];
    const { data: existing } = await supabaseAdmin
      .from('profiles')
      .select('username, full_name, bio')
      .eq('id', req.user.id)
      .maybeSingle();

    const merged = { ...existing, ...updates };
    const isComplete = requiredFields.every(f => merged[f] && merged[f].trim() !== '');
    if (isComplete) updates.is_profile_complete = true;

    // Use user-scoped client so RLS is enforced
    const userClient = createUserClient(req.accessToken);
    const { data, error } = await userClient
      .from('profiles')
      .update(updates)
      .eq('id', req.user.id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ success: false, error: 'UPDATE_FAILED', message: error.message });
    }

    return res.status(200).json({ success: true, data: { profile: data } });
  } catch (err) {
    console.error('[ProfileController.updateProfile]', err);
    return res.status(500).json({ success: false, error: 'INTERNAL_SERVER_ERROR', message: 'Failed to update profile' });
  }
}

/**
 * POST /api/profile/avatar
 * Upload a profile avatar to Supabase Storage.
 */
async function uploadAvatar(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'VALIDATION_ERROR', message: 'No file uploaded' });
    }

    const ext = path.extname(req.file.originalname).toLowerCase();
    const fileName = `${req.user.id}/avatar_${Date.now()}${ext}`;
    const bucket = 'avatars';

    const { error: uploadError } = await supabaseAdmin.storage
      .from(bucket)
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: true
      });

    if (uploadError) {
      return res.status(500).json({ success: false, error: 'UPLOAD_FAILED', message: uploadError.message });
    }

    const { data: urlData } = supabaseAdmin.storage.from(bucket).getPublicUrl(fileName);
    const avatarUrl = urlData.publicUrl;

    // Update profile with new avatar URL
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
      .eq('id', req.user.id)
      .select('avatar_url')
      .single();

    if (error) {
      return res.status(500).json({ success: false, error: 'DB_ERROR', message: error.message });
    }

    return res.status(200).json({
      success: true,
      data: { avatar_url: data.avatar_url, message: 'Avatar uploaded successfully' }
    });
  } catch (err) {
    console.error('[ProfileController.uploadAvatar]', err);
    return res.status(500).json({ success: false, error: 'INTERNAL_SERVER_ERROR', message: 'Failed to upload avatar' });
  }
}

/**
 * GET /api/profile/completion-status
 * Check if the user's profile is complete + subscription status.
 */
async function completionStatus(req, res) {
  try {
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('is_profile_complete, username, full_name, bio, avatar_url')
      .eq('id', req.user.id)
      .maybeSingle();

    if (profileError) {
      return res.status(500).json({ success: false, error: 'DB_ERROR', message: profileError.message });
    }

    const { data: subscription } = await supabaseAdmin
      .from('user_subscriptions')
      .select('status, expires_at, subscription_plans(name, price, currency)')
      .eq('user_id', req.user.id)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    const missingFields = [];
    if (!profile?.username) missingFields.push('username');
    if (!profile?.full_name) missingFields.push('full_name');
    if (!profile?.bio) missingFields.push('bio');
    if (!profile?.avatar_url) missingFields.push('avatar_url');

    return res.status(200).json({
      success: true,
      data: {
        is_profile_complete: profile?.is_profile_complete || false,
        missing_fields: missingFields,
        has_active_subscription: !!subscription,
        subscription: subscription
          ? {
              plan_name: subscription.subscription_plans?.name,
              price: subscription.subscription_plans?.price,
              currency: subscription.subscription_plans?.currency,
              expires_at: subscription.expires_at
            }
          : null,
        can_update_profile: !!subscription
      }
    });
  } catch (err) {
    console.error('[ProfileController.completionStatus]', err);
    return res.status(500).json({ success: false, error: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch completion status' });
  }
}

module.exports = {
  getOwnProfile,
  getPublicProfile,
  updateProfile,
  uploadAvatar,
  completionStatus,
  upload
};
