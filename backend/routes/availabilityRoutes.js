// backend/routes/availabilityRoutes.js
const express = require('express');
const router = express.Router();
const {
  updateWorkingHours,
  blockDates,
  unblockDates,
  checkAvailability,
  findAvailableJobseekers
} = require('../controllers/availabilityController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Public routes
router.get('/check', checkAvailability);
router.get('/find-available', findAvailableJobseekers);

// Protected routes for jobseekers
router.put('/working-hours', protect, authorize('jobseeker'), updateWorkingHours);
router.post('/block-dates', protect, authorize('jobseeker'), blockDates);
router.delete('/block-dates/:id', protect, authorize('jobseeker'), unblockDates);

module.exports = router;