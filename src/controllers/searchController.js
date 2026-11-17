const { supabaseAdmin } = require('../config/supabase');

/**
 * GET /api/search?q=&type=users|events|posts&page=1&limit=10
 * Universal search across users, events, and posts.
 */
async function universalSearch(req, res) {
  try {
    const q = (req.query.q || '').trim();
    const type = req.query.type; // optional: 'users', 'events', 'posts'
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    const offset = (page - 1) * limit;

    if (!q) {
      return res.status(400).json({ success: false, error: 'VALIDATION_ERROR', message: 'Query parameter q is required' });
    }

    const results = {};
    const searches = [];

    if (!type || type === 'users') {
      searches.push(
        supabaseAdmin
          .from('profiles')
          .select('id, username, full_name, bio, avatar_url, location', { count: 'exact' })
          .or(`username.ilike.%${q}%,full_name.ilike.%${q}%,bio.ilike.%${q}%`)
          .range(offset, offset + limit - 1)
          .then(r => { results.users = { data: r.data || [], total: r.count || 0 }; })
      );
    }

    if (!type || type === 'events') {
      searches.push(
        supabaseAdmin
          .from('events')
          .select('id, title, description, event_date, location, category, cover_image_url', { count: 'exact' })
          .eq('is_public', true)
          .or(`title.ilike.%${q}%,description.ilike.%${q}%,location.ilike.%${q}%,category.ilike.%${q}%`)
          .range(offset, offset + limit - 1)
          .then(r => { results.events = { data: r.data || [], total: r.count || 0 }; })
      );
    }

    if (!type || type === 'posts') {
      searches.push(
        supabaseAdmin
          .from('posts')
          .select('id, title, content, type, cover_image_url, created_at', { count: 'exact' })
          .eq('is_published', true)
          .or(`title.ilike.%${q}%,content.ilike.%${q}%`)
          .range(offset, offset + limit - 1)
          .then(r => { results.posts = { data: r.data || [], total: r.count || 0 }; })
      );
    }

    await Promise.all(searches);

    return res.status(200).json({
      success: true,
      data: {
        query: q,
        type: type || 'all',
        results
      },
      pagination: { page, limit }
    });
  } catch (err) {
    console.error('[SearchController.universalSearch]', err);
    return res.status(500).json({ success: false, error: 'INTERNAL_SERVER_ERROR', message: 'Search failed' });
  }
}

/**
 * GET /api/search/users?q=
 * Search users by name or username.
 */
async function searchUsers(req, res) {
  try {
    const q = (req.query.q || '').trim();
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    const offset = (page - 1) * limit;

    if (!q) {
      return res.status(400).json({ success: false, error: 'VALIDATION_ERROR', message: 'Query parameter q is required' });
    }

    const { data, error, count } = await supabaseAdmin
      .from('profiles')
      .select('id, username, full_name, bio, avatar_url, location', { count: 'exact' })
      .or(`username.ilike.%${q}%,full_name.ilike.%${q}%,bio.ilike.%${q}%`)
      .range(offset, offset + limit - 1);

    if (error) {
      return res.status(500).json({ success: false, error: 'DB_ERROR', message: error.message });
    }

    return res.status(200).json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / limit),
        has_next: offset + limit < (count || 0)
      }
    });
  } catch (err) {
    console.error('[SearchController.searchUsers]', err);
    return res.status(500).json({ success: false, error: 'INTERNAL_SERVER_ERROR', message: 'User search failed' });
  }
}

/**
 * GET /api/search/events?q=&category=&date_from=&date_to=
 * Search events with optional filters.
 */
async function searchEvents(req, res) {
  try {
    const q = (req.query.q || '').trim();
    const { category, date_from, date_to } = req.query;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('events')
      .select(`
        id, title, description, event_date, end_date, location, category,
        cover_image_url, max_attendees, tags,
        profiles!events_organizer_id_fkey ( id, username, full_name, avatar_url )
      `, { count: 'exact' })
      .eq('is_public', true)
      .order('event_date', { ascending: true })
      .range(offset, offset + limit - 1);

    if (q) {
      query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%,location.ilike.%${q}%`);
    }

    if (category) {
      query = query.eq('category', category);
    }

    if (date_from) {
      query = query.gte('event_date', date_from);
    }

    if (date_to) {
      query = query.lte('event_date', date_to);
    }

    const { data, error, count } = await query;

    if (error) {
      return res.status(500).json({ success: false, error: 'DB_ERROR', message: error.message });
    }

    return res.status(200).json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / limit),
        has_next: offset + limit < (count || 0)
      }
    });
  } catch (err) {
    console.error('[SearchController.searchEvents]', err);
    return res.status(500).json({ success: false, error: 'INTERNAL_SERVER_ERROR', message: 'Event search failed' });
  }
}

module.exports = { universalSearch, searchUsers, searchEvents };
