const { supabaseAdmin } = require('../config/supabase');

/**
 * GET /api/events
 * List events with pagination and optional filters.
 */
async function listEvents(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const offset = (page - 1) * limit;
    const { category, date_from, date_to, sort_by } = req.query;

    let query = supabaseAdmin
      .from('events')
      .select(`
        id, title, description, cover_image_url, location, event_date, end_date,
        category, tags, max_attendees, is_public, created_at,
        profiles!events_organizer_id_fkey ( id, username, full_name, avatar_url ),
        event_registrations ( count )
      `, { count: 'exact' })
      .eq('is_public', true)
      .range(offset, offset + limit - 1);

    if (category) query = query.eq('category', category);
    if (date_from) query = query.gte('event_date', date_from);
    if (date_to) query = query.lte('event_date', date_to);

    const sortField = sort_by === 'created_at' ? 'created_at' : 'event_date';
    query = query.order(sortField, { ascending: true });

    const { data, error, count } = await query;

    if (error) {
      return res.status(500).json({ success: false, error: 'DB_ERROR', message: error.message });
    }

    return res.status(200).json({
      success: true,
      data: data.map(event => ({
        ...event,
        attendees_count: event.event_registrations?.[0]?.count || 0,
        event_registrations: undefined
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
    console.error('[EventsController.listEvents]', err);
    return res.status(500).json({ success: false, error: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch events' });
  }
}

/**
 * GET /api/events/my
 * Get events the authenticated user has registered for.
 */
async function getMyEvents(req, res) {
  try {
    const { data, error } = await supabaseAdmin
      .from('event_registrations')
      .select(`
        id, status, registered_at,
        events (
          id, title, description, cover_image_url, location, event_date,
          end_date, category, tags, is_public
        )
      `)
      .eq('user_id', req.user.id)
      .order('registered_at', { ascending: false });

    if (error) {
      return res.status(500).json({ success: false, error: 'DB_ERROR', message: error.message });
    }

    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('[EventsController.getMyEvents]', err);
    return res.status(500).json({ success: false, error: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch your events' });
  }
}

/**
 * GET /api/events/:id
 * Get a single event's full details.
 */
async function getEventById(req, res) {
  try {
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('events')
      .select(`
        *,
        profiles!events_organizer_id_fkey ( id, username, full_name, avatar_url ),
        event_registrations ( count )
      `)
      .eq('id', id)
      .maybeSingle();

    if (error) {
      return res.status(500).json({ success: false, error: 'DB_ERROR', message: error.message });
    }

    if (!data) {
      return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Event not found' });
    }

    // Check if the requesting user is registered
    const { data: userReg } = await supabaseAdmin
      .from('event_registrations')
      .select('id, status')
      .eq('event_id', id)
      .eq('user_id', req.user.id)
      .maybeSingle();

    return res.status(200).json({
      success: true,
      data: {
        ...data,
        attendees_count: data.event_registrations?.[0]?.count || 0,
        event_registrations: undefined,
        user_registration: userReg || null
      }
    });
  } catch (err) {
    console.error('[EventsController.getEventById]', err);
    return res.status(500).json({ success: false, error: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch event' });
  }
}

/**
 * POST /api/events
 * Create a new event.
 */
async function createEvent(req, res) {
  try {
    const {
      title, description, cover_image_url, location,
      event_date, end_date, category, tags, max_attendees, is_public
    } = req.body;

    if (!title || !event_date) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'title and event_date are required'
      });
    }

    const { data, error } = await supabaseAdmin
      .from('events')
      .insert({
        title,
        description,
        cover_image_url,
        location,
        event_date,
        end_date,
        category,
        tags: tags || [],
        max_attendees: max_attendees || null,
        is_public: is_public !== undefined ? is_public : true,
        organizer_id: req.user.id
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ success: false, error: 'CREATE_FAILED', message: error.message });
    }

    return res.status(201).json({ success: true, data: { event: data } });
  } catch (err) {
    console.error('[EventsController.createEvent]', err);
    return res.status(500).json({ success: false, error: 'INTERNAL_SERVER_ERROR', message: 'Failed to create event' });
  }
}

/**
 * PUT /api/events/:id
 * Update an event (organizer only).
 */
async function updateEvent(req, res) {
  try {
    const { id } = req.params;

    // Verify ownership
    const { data: existing } = await supabaseAdmin
      .from('events')
      .select('organizer_id')
      .eq('id', id)
      .maybeSingle();

    if (!existing) {
      return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Event not found' });
    }

    if (existing.organizer_id !== req.user.id) {
      return res.status(403).json({ success: false, error: 'FORBIDDEN', message: 'Only the event organizer can update this event' });
    }

    const allowedFields = ['title', 'description', 'cover_image_url', 'location', 'event_date', 'end_date', 'category', 'tags', 'max_attendees', 'is_public'];
    const updates = { updated_at: new Date().toISOString() };
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }

    const { data, error } = await supabaseAdmin
      .from('events')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ success: false, error: 'UPDATE_FAILED', message: error.message });
    }

    return res.status(200).json({ success: true, data: { event: data } });
  } catch (err) {
    console.error('[EventsController.updateEvent]', err);
    return res.status(500).json({ success: false, error: 'INTERNAL_SERVER_ERROR', message: 'Failed to update event' });
  }
}

/**
 * DELETE /api/events/:id
 * Delete an event (organizer only).
 */
async function deleteEvent(req, res) {
  try {
    const { id } = req.params;

    const { data: existing } = await supabaseAdmin
      .from('events')
      .select('organizer_id')
      .eq('id', id)
      .maybeSingle();

    if (!existing) {
      return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Event not found' });
    }

    if (existing.organizer_id !== req.user.id) {
      return res.status(403).json({ success: false, error: 'FORBIDDEN', message: 'Only the event organizer can delete this event' });
    }

    const { error } = await supabaseAdmin.from('events').delete().eq('id', id);

    if (error) {
      return res.status(500).json({ success: false, error: 'DELETE_FAILED', message: error.message });
    }

    return res.status(200).json({ success: true, data: { message: 'Event deleted successfully' } });
  } catch (err) {
    console.error('[EventsController.deleteEvent]', err);
    return res.status(500).json({ success: false, error: 'INTERNAL_SERVER_ERROR', message: 'Failed to delete event' });
  }
}

/**
 * POST /api/events/:id/register
 * Register for an event (requires active subscription).
 */
async function registerForEvent(req, res) {
  try {
    const { id } = req.params;

    // Check event exists and is public
    const { data: event } = await supabaseAdmin
      .from('events')
      .select('id, title, max_attendees, event_date')
      .eq('id', id)
      .eq('is_public', true)
      .maybeSingle();

    if (!event) {
      return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Event not found or not public' });
    }

    // Check if event is in the future
    if (new Date(event.event_date) < new Date()) {
      return res.status(400).json({ success: false, error: 'EVENT_PAST', message: 'Cannot register for a past event' });
    }

    // Check capacity if max_attendees is set
    if (event.max_attendees) {
      const { count } = await supabaseAdmin
        .from('event_registrations')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', id)
        .eq('status', 'registered');

      if ((count || 0) >= event.max_attendees) {
        return res.status(400).json({ success: false, error: 'EVENT_FULL', message: 'This event has reached its maximum capacity' });
      }
    }

    // Check if already registered
    const { data: existing } = await supabaseAdmin
      .from('event_registrations')
      .select('id, status')
      .eq('event_id', id)
      .eq('user_id', req.user.id)
      .maybeSingle();

    if (existing) {
      if (existing.status === 'registered') {
        return res.status(409).json({ success: false, error: 'ALREADY_REGISTERED', message: 'You are already registered for this event' });
      }
      // Re-activate cancelled registration
      const { data: updated, error } = await supabaseAdmin
        .from('event_registrations')
        .update({ status: 'registered', registered_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) return res.status(500).json({ success: false, error: 'DB_ERROR', message: error.message });
      return res.status(200).json({ success: true, data: { registration: updated } });
    }

    const { data, error } = await supabaseAdmin
      .from('event_registrations')
      .insert({ event_id: id, user_id: req.user.id, status: 'registered' })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ success: false, error: 'REGISTRATION_FAILED', message: error.message });
    }

    return res.status(201).json({ success: true, data: { registration: data, event_title: event.title } });
  } catch (err) {
    console.error('[EventsController.registerForEvent]', err);
    return res.status(500).json({ success: false, error: 'INTERNAL_SERVER_ERROR', message: 'Failed to register for event' });
  }
}

/**
 * DELETE /api/events/:id/register
 * Cancel event registration.
 */
async function cancelRegistration(req, res) {
  try {
    const { id } = req.params;

    const { data: existing } = await supabaseAdmin
      .from('event_registrations')
      .select('id')
      .eq('event_id', id)
      .eq('user_id', req.user.id)
      .eq('status', 'registered')
      .maybeSingle();

    if (!existing) {
      return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Registration not found' });
    }

    const { error } = await supabaseAdmin
      .from('event_registrations')
      .update({ status: 'cancelled' })
      .eq('id', existing.id);

    if (error) {
      return res.status(500).json({ success: false, error: 'DB_ERROR', message: error.message });
    }

    return res.status(200).json({ success: true, data: { message: 'Registration cancelled successfully' } });
  } catch (err) {
    console.error('[EventsController.cancelRegistration]', err);
    return res.status(500).json({ success: false, error: 'INTERNAL_SERVER_ERROR', message: 'Failed to cancel registration' });
  }
}

/**
 * GET /api/events/:id/attendees
 * Get list of attendees for an event.
 */
async function getAttendees(req, res) {
  try {
    const { id } = req.params;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const { data, error, count } = await supabaseAdmin
      .from('event_registrations')
      .select(`
        id, status, registered_at,
        profiles!event_registrations_user_id_fkey ( id, username, full_name, avatar_url )
      `, { count: 'exact' })
      .eq('event_id', id)
      .eq('status', 'registered')
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
    console.error('[EventsController.getAttendees]', err);
    return res.status(500).json({ success: false, error: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch attendees' });
  }
}

module.exports = {
  listEvents,
  getMyEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  registerForEvent,
  cancelRegistration,
  getAttendees
};
