import crypto from 'node:crypto';
import { Router } from 'express';
import Razorpay from 'razorpay';
import { z } from 'zod';
import { supabaseAdmin } from '../config/supabase.js';
import { env } from '../config/env.js';
import { requireAuth, requireApproved } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { ApiError, asyncHandler, getPage, pageMeta, slugify } from '../utils/helpers.js';
import { upload, uploadImage } from '../utils/upload.js';
import { verifyCheckoutSignature } from '../utils/razorpay.js';
import { fulfillEventTicketOrder } from '../utils/event-tickets.js';

const r = Router();
const EVENT_FIELDS = 'id, host_user_id, title, slug, description, banner_url, start_at, location, format, languages, learning_outcomes, audience, requirements, agenda, speakers, sponsors, venue_details, gallery, is_free, registration_fee_minor, ticket_capacity, tickets_sold, status, created_at, host:profiles!events_host_user_id_fkey(id, full_name, avatar_url)';
const jsonField = (schema, fallback) => z.preprocess((value) => {
  if (typeof value !== 'string') return value ?? fallback;
  try { return JSON.parse(value); } catch { return value; }
}, schema);
const multipartBoolean = z.preprocess((value) => {
  if (value === true || value === 'true' || value === '1') return true;
  if (value === false || value === 'false' || value === '0') return false;
  return value;
}, z.boolean());

const createEventSchema = z.object({
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().min(1).max(10000),
  startAt: z.string().datetime({ offset: true }),
  location: z.string().trim().min(2).max(300),
  isFree: multipartBoolean,
  registrationFee: z.coerce.number().finite().min(0).max(1000000),
  ticketCapacity: z.coerce.number().int().min(1).max(1000000),
  format: z.enum(['In-Person', 'Online', 'Hybrid']).default('In-Person'),
  languages: jsonField(z.array(z.string().trim().min(1).max(40)).max(10), ['English']),
  learningOutcomes: jsonField(z.array(z.string().trim().min(1).max(300)).max(20), []),
  audience: jsonField(z.array(z.string().trim().min(1).max(200)).max(20), []),
  requirements: jsonField(z.array(z.string().trim().min(1).max(300)).max(20), []),
  agenda: jsonField(z.array(z.object({ time: z.string().max(60), title: z.string().trim().min(1).max(160), desc: z.string().max(1000).default('') })).max(30), []),
  speakers: jsonField(z.array(z.object({ name: z.string().trim().min(1).max(120), role: z.string().max(120).default(''), company: z.string().max(160).default(''), bio: z.string().max(1000).default('') })).max(30), []),
  sponsors: jsonField(z.array(z.object({ name: z.string().trim().min(1).max(160), tier: z.string().max(40).default('Community') })).max(30), []),
  venueDetails: jsonField(z.object({ venueName: z.string().max(200).default(''), address: z.string().max(500).default(''), parking: z.string().max(500).default(''), transit: z.string().max(500).default(''), hotels: z.array(z.string().max(160)).max(20).default([]) }), { venueName: '', address: '', parking: '', transit: '', hotels: [] }),
}).refine((value) => (value.isFree ? value.registrationFee === 0 : value.registrationFee > 0), {
  message: 'Free events must have a zero fee; paid events must have a fee greater than zero',
  path: ['registrationFee'],
});

const registrationSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
});

const verifySchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().regex(/^[a-f\d]{64}$/i),
});

function getRazorpay() {
  if (!env.rzpKeyId || !env.rzpKeySecret) throw new ApiError(503, 'Paid event registration is not configured.');
  return new Razorpay({ key_id: env.rzpKeyId, key_secret: env.rzpKeySecret });
}

async function addAvailability(events) {
  if (!events.length) return [];
  const ids = events.map((event) => event.id);
  const { data: registrations, error } = await supabaseAdmin.from('event_registrations')
    .select('event_id, status, expires_at').in('event_id', ids);
  if (error) throw error;
  const now = Date.now();
  const occupied = new Map();
  for (const registration of registrations || []) {
    if (registration.status === 'confirmed' || registration.status === 'payment_review' ||
      (registration.status === 'pending' && registration.expires_at && new Date(registration.expires_at).getTime() > now)) {
      occupied.set(registration.event_id, (occupied.get(registration.event_id) || 0) + 1);
    }
  }
  return events.map((event) => ({
    ...event,
    tickets_remaining: Math.max(0, event.ticket_capacity - (occupied.get(event.id) || 0)),
  }));
}

function dbEventError(error) {
  const message = error?.message || '';
  if (message.includes('event_sold_out')) return new ApiError(409, 'This event has no tickets remaining.');
  if (message.includes('event_not_found')) return new ApiError(404, 'Event not found.');
  if (message.includes('event_not_available')) return new ApiError(409, 'This event is not accepting registrations.');
  if (message.includes('event_registration_closed')) return new ApiError(409, 'Registration for this event has closed.');
  return error;
}

function publicRegistration(registration) {
  return {
    id: registration.id,
    eventId: registration.event_id,
    ticketCode: registration.ticket_code,
    attendeeName: registration.attendee_name,
    amountMinor: registration.amount_minor,
    status: registration.status,
    paidAt: registration.paid_at,
    createdAt: registration.created_at,
  };
}

// GET /api/events?page=&limit=&q= - public, published event list.
r.get('/', asyncHandler(async (req, res) => {
  const pg = getPage(req.query);
  let query = supabaseAdmin.from('events').select(EVENT_FIELDS, { count: 'exact' }).eq('status', 'published');
  const q = String(req.query.q || '').replace(/[%,()*]/g, ' ').trim().slice(0, 80);
  if (q) query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%,location.ilike.%${q}%`);
  const { data, count, error } = await query.order('start_at', { ascending: true }).range(pg.from, pg.to);
  if (error) throw error;
  res.set('Cache-Control', 'public, max-age=30');
  res.json({ data: await addAvailability(data || []), meta: pageMeta(pg, count) });
}));

// Organizer's events and attendee's tickets; route before /:eventId.
r.get('/mine/hosted', requireAuth, requireApproved, asyncHandler(async (req, res) => {
  const { data, error } = await supabaseAdmin.from('events').select(EVENT_FIELDS)
    .eq('host_user_id', req.user.id).order('created_at', { ascending: false });
  if (error) throw error;
  res.json({ data: await addAvailability(data || []) });
}));

r.get('/mine/registrations', requireAuth, requireApproved, asyncHandler(async (req, res) => {
  const { data, error } = await supabaseAdmin.from('event_registrations')
    .select('id, event_id, attendee_name, attendee_email, ticket_code, amount_minor, status, paid_at, created_at, checked_in_at, event:events!inner(id,title,slug,start_at,host_user_id)')
    .eq('event.host_user_id', req.user.id).eq('status', 'confirmed').order('created_at', { ascending: false });
  if (error) throw error;
  res.json({ data: data || [] });
}));

r.post('/mine/registrations/:registrationId/check-in', requireAuth, requireApproved, asyncHandler(async (req, res) => {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(req.params.registrationId)) throw new ApiError(400, 'Invalid registration id.');
  const { data: registration, error: lookupError } = await supabaseAdmin.from('event_registrations')
    .select('id,status,checked_in_at,event:events!inner(host_user_id)').eq('id', req.params.registrationId)
    .eq('event.host_user_id', req.user.id).maybeSingle();
  if (lookupError) throw lookupError;
  if (!registration) throw new ApiError(404, 'Registration not found for an event you host.');
  if (registration.status !== 'confirmed') throw new ApiError(409, 'Only confirmed tickets can be checked in.');
  if (registration.checked_in_at) return res.json({ data: { id: registration.id, checked_in_at: registration.checked_in_at } });
  const checkedInAt = new Date().toISOString();
  const { data, error } = await supabaseAdmin.from('event_registrations').update({ checked_in_at: checkedInAt })
    .eq('id', registration.id).is('checked_in_at', null).select('id,checked_in_at').single();
  if (error) throw error;
  res.json({ data });
}));

r.get('/mine/tickets', requireAuth, asyncHandler(async (req, res) => {
  const { data, error } = await supabaseAdmin.from('event_registrations')
    .select('id, event_id, attendee_name, attendee_email, ticket_code, amount_minor, status, paid_at, created_at, event:events(id,title,slug,description,banner_url,start_at,location,format,languages,learning_outcomes,audience,requirements,agenda,speakers,sponsors,venue_details,gallery,is_free,registration_fee_minor,ticket_capacity,tickets_sold)')
    .eq('user_id', req.user.id).in('status', ['confirmed', 'payment_review']).order('created_at', { ascending: false });
  if (error) throw error;
  res.json({ data: data || [] });
}));

// POST /api/events (multipart/form-data: banner, title, description, startAt,
// location, isFree, registrationFee in rupees, ticketCapacity)
r.post('/', requireAuth, requireApproved, upload.fields([{ name: 'banner', maxCount: 1 }, { name: 'gallery', maxCount: 8 }]), validate(createEventSchema), asyncHandler(async (req, res) => {
  const banner = req.files?.banner?.[0];
  if (!banner) throw new ApiError(400, 'Upload an event banner using the "banner" field.');
  const body = req.body;
  const startAt = new Date(body.startAt);
  if (!Number.isFinite(startAt.getTime()) || startAt <= new Date()) throw new ApiError(400, 'Event date and time must be in the future.');
  const bannerUrl = await uploadImage('event-banners', req.user.id, banner);
  const gallery = await Promise.all((req.files?.gallery || []).map((file) => uploadImage('event-banners', `${req.user.id}/gallery`, file)));
  const { data, error } = await supabaseAdmin.from('events').insert({
    host_user_id: req.user.id,
    title: body.title,
    slug: slugify(body.title),
    description: body.description,
    banner_url: bannerUrl,
    start_at: startAt.toISOString(),
    location: body.location,
    format: body.format,
    languages: body.languages,
    learning_outcomes: body.learningOutcomes,
    audience: body.audience,
    requirements: body.requirements,
    agenda: body.agenda,
    speakers: body.speakers,
    sponsors: body.sponsors,
    venue_details: body.venueDetails,
    gallery,
    is_free: body.isFree,
    registration_fee_minor: body.isFree ? 0 : Math.round(body.registrationFee * 100),
    ticket_capacity: body.ticketCapacity,
    status: 'published',
  }).select(EVENT_FIELDS).single();
  if (error) throw error;
  res.status(201).json({ data: { ...data, tickets_remaining: data.ticket_capacity } });
}));

// POST /api/events/registrations/verify - verifies and fulfills a paid ticket.
r.post('/registrations/verify', requireAuth, validate(verifySchema), asyncHandler(async (req, res) => {
  const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = req.body;
  if (!env.paymentsEnabled) throw new ApiError(503, 'Payments are temporarily unavailable.');
  if (!verifyCheckoutSignature(env.rzpKeySecret, orderId, paymentId, signature)) throw new ApiError(400, 'Invalid payment signature.');

  const { data: registration, error } = await supabaseAdmin.from('event_registrations')
    .select('id, user_id, event_id, amount_minor, status, razorpay_order_id')
    .eq('razorpay_order_id', orderId).maybeSingle();
  if (error) throw error;
  if (!registration || registration.user_id !== req.user.id) throw new ApiError(404, 'Ticket payment order not found.');
  if (registration.status === 'confirmed') return res.json({ data: { status: 'confirmed', registrationId: registration.id, message: 'Ticket payment verified.' } });
  if (registration.status === 'payment_review') return res.json({ data: { status: 'payment_review', registrationId: registration.id, message: 'Payment received; ticket capacity needs organizer review.' } });
  if (!['pending', 'cancelled'].includes(registration.status)) throw new ApiError(409, 'This ticket reservation is no longer pending.');

  const gateway = getRazorpay();
  let payment = await gateway.payments.fetch(paymentId);
  if (payment.status === 'authorized') payment = await gateway.payments.capture(paymentId, registration.amount_minor, 'INR');
  if (payment.order_id !== orderId || payment.amount !== registration.amount_minor || payment.currency !== 'INR' || payment.status !== 'captured')
    throw new ApiError(400, 'Payment has not been captured for the expected ticket amount.');

  const fulfilled = await fulfillEventTicketOrder(orderId, paymentId);
  if (!fulfilled) throw new ApiError(404, 'Ticket payment order not found.');
  res.json({ data: { status: fulfilled.status, registrationId: fulfilled.id, ticketCode: fulfilled.ticket_code, message: fulfilled.status === 'confirmed' ? 'Ticket payment verified.' : 'Payment received; ticket capacity needs organizer review.' } });
}));

// GET /api/events/:eventIdOrSlug - public event detail.
r.get('/:eventIdOrSlug', asyncHandler(async (req, res) => {
  const key = req.params.eventIdOrSlug;
  let query = supabaseAdmin.from('events').select(EVENT_FIELDS).eq('status', 'published');
  query = query.eq(key.match(/^[0-9a-f-]{36}$/i) ? 'id' : 'slug', key);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  if (!data) throw new ApiError(404, 'Event not found.');
  res.json({ data: (await addAvailability([data]))[0] });
}));

// POST /api/events/:eventId/register - free registration or paid checkout order.
r.post('/:eventId/register', requireAuth, validate(registrationSchema), asyncHandler(async (req, res) => {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(req.params.eventId)) throw new ApiError(400, 'Invalid event id.');
  const { data: event, error: eventError } = await supabaseAdmin.from('events').select('id,title,is_free,registration_fee_minor,status,start_at')
    .eq('id', req.params.eventId).maybeSingle();
  if (eventError) throw eventError;
  if (!event || event.status !== 'published') throw new ApiError(404, 'Event not found.');
  if (!event.is_free && (!env.paymentsEnabled || !env.rzpKeyId || !env.rzpKeySecret)) throw new ApiError(503, 'Paid event registration is not configured.');

  const ticketCode = `WSH-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
  const { data: reserved, error: reserveError } = await supabaseAdmin.rpc('reserve_event_ticket', {
    p_event_id: event.id,
    p_user_id: req.user.id,
    p_attendee_name: req.body.name,
    p_attendee_email: req.body.email,
    p_ticket_code: ticketCode,
  });
  if (reserveError) throw dbEventError(reserveError);
  const registration = Array.isArray(reserved) ? reserved[0] : reserved;
  if (!registration) throw new ApiError(500, 'Could not reserve an event ticket.');

  if (registration.status === 'confirmed') {
    return res.status(201).json({ data: { type: 'ticket', registration: publicRegistration(registration), ticket: { code: registration.ticket_code } } });
  }
  if (registration.status !== 'pending') throw new ApiError(409, 'This event registration is not available.');
  if (registration.ticket_code !== ticketCode && !registration.razorpay_order_id)
    throw new ApiError(409, 'A ticket checkout is already being prepared for this account. Please retry shortly.');
  if (registration.razorpay_order_id) {
    return res.status(200).json({ data: { type: 'checkout', registration: publicRegistration(registration), order: { id: registration.razorpay_order_id, amount: registration.amount_minor, currency: 'INR', keyId: env.rzpKeyId } } });
  }

  const gateway = getRazorpay();
  let order;
  try {
    order = await gateway.orders.create({
      amount: registration.amount_minor,
      currency: 'INR',
      receipt: `evt_${registration.id.replaceAll('-', '').slice(0, 36)}`,
      notes: { purpose: 'event_ticket', event_id: event.id, registration_id: registration.id, user_id: req.user.id },
    });
  } catch (error) {
    await supabaseAdmin.from('event_registrations').update({ status: 'cancelled', expires_at: null }).eq('id', registration.id).eq('status', 'pending');
    throw error;
  }

  const { data: attached, error: attachError } = await supabaseAdmin.from('event_registrations')
    .update({ razorpay_order_id: order.id }).eq('id', registration.id).eq('status', 'pending').is('razorpay_order_id', null)
    .select('id').maybeSingle();
  if (attachError) throw attachError;
  if (!attached) throw new ApiError(409, 'Ticket checkout was already created. Refresh your event registrations and retry.');

  res.status(201).json({ data: {
    type: 'checkout',
    registration: publicRegistration({ ...registration, razorpay_order_id: order.id }),
    order: { id: order.id, amount: order.amount, currency: order.currency, keyId: env.rzpKeyId, prefill: { name: req.body.name, email: req.body.email } },
  } });
}));

export default r;
