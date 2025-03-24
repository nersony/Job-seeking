const express = require('express');
const router = express.Router();
const { createCheckoutSession, webhookHandler } = require('../controllers/stripeController');
const { protect } = require('../middleware/authMiddleware');

router.post('/create-checkout-session', protect, createCheckoutSession);
router.post('/webhook', express.raw({ type: 'application/json' }), webhookHandler);

module.exports = router;