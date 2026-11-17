const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const requireSubscription = require('../middleware/subscription');
const {
  listEvents,
  getMyEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  registerForEvent,
  cancelRegistration,
  getAttendees
} = require('../controllers/eventsController');

// All events routes require authentication
router.use(authMiddleware);

// GET /api/events/my  — must be before /:id to avoid conflict
router.get('/my', getMyEvents);

// GET /api/events
router.get('/', listEvents);

// GET /api/events/:id
router.get('/:id', getEventById);

// POST /api/events  — create event (no subscription required to organize)
router.post('/', createEvent);

// PUT /api/events/:id  — update event (organizer only)
router.put('/:id', updateEvent);

// DELETE /api/events/:id  — delete event (organizer only)
router.delete('/:id', deleteEvent);

// POST /api/events/:id/register  — register for event (requires subscription)
router.post('/:id/register', requireSubscription, registerForEvent);

// DELETE /api/events/:id/register  — cancel registration
router.delete('/:id/register', cancelRegistration);

// GET /api/events/:id/attendees
router.get('/:id/attendees', getAttendees);

module.exports = router;
