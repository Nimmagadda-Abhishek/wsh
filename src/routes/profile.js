const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
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

// PUT is retained for existing clients; PATCH follows the supplied API contract.
router.put('/', updateProfile);
router.patch('/', updateProfile);

// POST /api/profile/avatar  — requires subscription
router.post('/avatar', upload.single('file'), uploadAvatar);

module.exports = router;
