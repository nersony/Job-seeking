// backend/routes/calendlyRoutes.js
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  scrapeCalendlyData,
  getWeeklyAvailability,
  getAvailableTimes,
  findAvailableJobseekers,
  createSchedulingLink,
  checkJobseekerAvailability
} = require('../controllers/calendlyController');
const {
  getAuthUrl,
  handleOAuthCallback,
  refreshToken,
  disconnectCalendly
} = require('../controllers/calendlyAuthController');
const { handleWebhook } = require('../controllers/calendlyWebhookController');
// Public routes
router.get('/scrape/:calendlyLink', scrapeCalendlyData);
router.get('/auth/url', getAuthUrl);
router.get('/oauth/callback', handleOAuthCallback);
router.get('/available-jobseekers', findAvailableJobseekers);
router.get('/check-jobseeker-availability', checkJobseekerAvailability);
router.post('/webhook', handleWebhook);
// Protected routes
router.post('/auth/refresh', protect, authorize('jobseeker'), refreshToken);
router.delete('/auth/disconnect', protect, authorize('jobseeker'), disconnectCalendly);
router.get('/weekly-availability', protect, authorize('jobseeker'), getWeeklyAvailability);
router.get('/available-times', protect, getAvailableTimes);
router.post('/create-scheduling-link', protect, authorize('jobseeker'), createSchedulingLink);
module.exports = router;