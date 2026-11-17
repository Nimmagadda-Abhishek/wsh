const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { getFeed, getFeatured, getStats, likePost, unlikePost } = require('../controllers/homeController');

// All home routes require authentication
router.use(authMiddleware);

// GET /api/home/feed
router.get('/feed', getFeed);

// GET /api/home/featured
router.get('/featured', getFeatured);

// GET /api/home/stats
router.get('/stats', getStats);

// POST /api/home/posts/:postId/like
router.post('/posts/:postId/like', likePost);

// DELETE /api/home/posts/:postId/like
router.delete('/posts/:postId/like', unlikePost);

module.exports = router;
