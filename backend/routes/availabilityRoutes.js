// backend/routes/availabilityRoutes.js
const express = require('express');
const router = express.Router();
const {
  checkJobseekerAvailability,
  findAvailableJobseekers,
  getJobseekerWeeklyAvailability,
  setupWebhookSubscription
} = require('../controllers/availabilityController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Public routes
router.get('/check', checkJobseekerAvailability);
router.get('/find-available', findAvailableJobseekers);
router.get('/weekly/:id', getJobseekerWeeklyAvailability);

// Protected routes
router.post('/setup-webhook', protect, authorize('jobseeker'), setupWebhookSubscription);

module.exports = router;