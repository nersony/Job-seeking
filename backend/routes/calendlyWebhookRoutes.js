// backend/routes/calendlyWebhookRoutes.js
const express = require('express');
const router = express.Router();
const { handleWebhook } = require('../controllers/calendlyWebhookController');

// Webhook endpoint for Calendly
router.post('/webhook', handleWebhook);

module.exports = router;