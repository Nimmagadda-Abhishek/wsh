const express = require('express');
const router = express.Router();
const {
  signup,
  login,
  logout,
  refresh,
  forgotPassword,
  resendVerification,
  resetPassword,
  me
} = require('../controllers/authController');
const auth = require('../middleware/auth');

// POST /api/auth/signup
router.post('/signup', signup);

// POST /api/auth/login
router.post('/login', login);

// POST /api/auth/logout
router.post('/logout', logout);

// POST /api/auth/refresh
router.post('/refresh', refresh);

// POST /api/auth/forgot-password
router.post('/forgot-password', forgotPassword);
router.post('/resend-verification', resendVerification);
router.get('/me', auth, me);

// POST /api/auth/reset-password
router.post('/reset-password', resetPassword);

module.exports = router;
