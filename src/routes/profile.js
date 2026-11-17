const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const requireSubscription = require('../middleware/subscription');
const {
  getOwnProfile,
  getPublicProfile,
  updateProfile,
  uploadAvatar,
  completionStatus,
  upload
} = require('../controllers/profileController');

// All profile routes require authentication
router.use(authMiddleware);

// GET /api/profile/completion-status  — must be before /:userId to avoid conflict
router.get('/completion-status', completionStatus);

// GET /api/profile
router.get('/', getOwnProfile);

// GET /api/profile/:userId  — public profile view, auth but no subscription needed
router.get('/:userId', getPublicProfile);

// PUT /api/profile  — requires subscription
router.put('/', requireSubscription, updateProfile);

// POST /api/profile/avatar  — requires subscription
router.post('/avatar', requireSubscription, upload.single('avatar'), uploadAvatar);

module.exports = router;
