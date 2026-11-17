const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { listPlans, getMySubscription, subscribe, cancelSubscription, getStatus } = require('../controllers/subscriptionController');

// All subscription routes require authentication
router.use(authMiddleware);

// GET /api/subscriptions/plans  — no subscription required to view plans
router.get('/plans', listPlans);

// GET /api/subscriptions/status
router.get('/status', getStatus);

// GET /api/subscriptions/my
router.get('/my', getMySubscription);

// POST /api/subscriptions/subscribe
router.post('/subscribe', subscribe);

// POST /api/subscriptions/cancel
router.post('/cancel', cancelSubscription);

module.exports = router;
