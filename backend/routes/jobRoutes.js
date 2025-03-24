const express = require('express');
const router = express.Router();
const {
  getJobseekers,
  getJobseekerById,
  updateCertification,
  verifyCertification,
  updateCalendlyLink
} = require('../controllers/jobseekerController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Public routes
router.get('/', getJobseekers);
router.get('/:id', getJobseekerById);

// Jobseeker routes
router.put('/certifications', protect, authorize('jobseeker'), updateCertification);
router.put('/calendly', protect, authorize('jobseeker'), updateCalendlyLink);

// Admin routes
router.put('/:id/certifications/:certId/verify', protect, authorize('admin'), verifyCertification);

module.exports = router;