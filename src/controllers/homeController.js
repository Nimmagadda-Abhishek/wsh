const { supabaseAdmin } = require('../config/supabase');

/**
 * GET /api/home/feed
 * Get paginated feed (posts and announcements), newest first.
 */
async function getFeed(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    const offset = (page - 1) * limit;
    const type = req.query.type; // optional filter: announcement | article | featured

    let query = supabaseAdmin
      .from('posts')
      .select(`
        id, title, content, cover_image_url, type, tags, created_at, updated_at,
        profiles!posts_author_id_fkey ( id, username, full_name, avatar_url ),
        post_likes ( count )
      `, { count: 'exact' })
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (type) query = query.eq('type', type);

    const { data, error, count } = await query;

    if (error) {
      return res.status(500).json({ success: false, error: 'DB_ERROR', message: error.message });
    }

    return res.status(200).json({
      success: true,
      data: data.map(post => ({
        ...post,
        likes_count: post.post_likes?.[0]?.count || 0,
        post_likes: undefined
      })),
      pagination: {
        page,
        limit,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / limit),
        has_next: offset + limit < (count || 0)
      }
    });
  } catch (err) {
    console.error('[HomeController.getFeed]', err);
    return res.status(500).json({ success: false, error: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch feed' });
  }
}

/**
 * GET /api/home/featured
 * Get featured/pinned content.
 */
async function getFeatured(req, res) {
  try {
    const { data, error } = await supabaseAdmin
      .from('posts')
      .select(`
        id, title, content, cover_image_url, type, tags, created_at,
        profiles!posts_author_id_fkey ( id, username, full_name, avatar_url )
      `)
      .eq('is_published', true)
      .eq('type', 'featured')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      return res.status(500).json({ success: false, error: 'DB_ERROR', message: error.message });
    }

    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('[HomeController.getFeatured]', err);
    return res.status(500).json({ success: false, error: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch featured content' });
  }
}

/**
 * GET /api/home/stats
 * Platform stats: total users, events, posts counts.
 */
async function getStats(req, res) {
  try {
    const [
      { count: usersCount },
      { count: eventsCount },
      { count: postsCount },
      { count: subscriptionsCount }
    ] = await Promise.all([
      supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('events').select('*', { count: 'exact', head: true }).eq('is_public', true),
      supabaseAdmin.from('posts').select('*', { count: 'exact', head: true }).eq('is_published', true),
      supabaseAdmin.from('user_subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active')
    ]);

    return res.status(200).json({
      success: true,
      data: {
        total_users: usersCount || 0,
        total_events: eventsCount || 0,
        total_posts: postsCount || 0,
        active_subscribers: subscriptionsCount || 0
      }
    });
  } catch (err) {
    console.error('[HomeController.getStats]', err);
    return res.status(500).json({ success: false, error: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch stats' });
  }
}

/**
 * POST /api/home/posts/:postId/like
 * Like a post.
 */
async function likePost(req, res) {
  try {
    const { postId } = req.params;

    // Check if post exists
    const { data: post } = await supabaseAdmin
      .from('posts')
      .select('id')
      .eq('id', postId)
      .eq('is_published', true)
      .maybeSingle();

    if (!post) {
      return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Post not found' });
    }

    const { error } = await supabaseAdmin
      .from('post_likes')
      .insert({ post_id: postId, user_id: req.user.id });

    if (error) {
      if (error.code === '23505') {
        // Unique constraint — already liked
        return res.status(409).json({ success: false, error: 'ALREADY_LIKED', message: 'You have already liked this post' });
      }
      return res.status(500).json({ success: false, error: 'DB_ERROR', message: error.message });
    }

    // Return updated like count
    const { count } = await supabaseAdmin
      .from('post_likes')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);

    return res.status(200).json({ success: true, data: { post_id: postId, likes_count: count || 0 } });
  } catch (err) {
    console.error('[HomeController.likePost]', err);
    return res.status(500).json({ success: false, error: 'INTERNAL_SERVER_ERROR', message: 'Failed to like post' });
  }
}

/**
 * DELETE /api/home/posts/:postId/like
 * Unlike a post.
 */
async function unlikePost(req, res) {
  try {
    const { postId } = req.params;

    const { error } = await supabaseAdmin
      .from('post_likes')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', req.user.id);

    if (error) {
      return res.status(500).json({ success: false, error: 'DB_ERROR', message: error.message });
    }

    const { count } = await supabaseAdmin
      .from('post_likes')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);

    return res.status(200).json({ success: true, data: { post_id: postId, likes_count: count || 0 } });
  } catch (err) {
    console.error('[HomeController.unlikePost]', err);
    return res.status(500).json({ success: false, error: 'INTERNAL_SERVER_ERROR', message: 'Failed to unlike post' });
  }
}

module.exports = { getFeed, getFeatured, getStats, likePost, unlikePost };
