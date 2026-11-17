const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { universalSearch, searchUsers, searchEvents } = require('../controllers/searchController');

// All search routes require authentication
router.use(authMiddleware);

// GET /api/search?q=&type=users|events|posts&page=1&limit=10
router.get('/', universalSearch);

// GET /api/search/users?q=
router.get('/users', searchUsers);

// GET /api/search/events?q=&category=&date_from=&date_to=
router.get('/events', searchEvents);

module.exports = router;
