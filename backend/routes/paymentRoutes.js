const express = require('express');
const router = express.Router();
const {
  requestWithdrawal,
  getMyWithdrawals,
  processWithdrawal,
  getEarningsDashboard
} = require('../controllers/paymentController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Jobseeker routes
router.post('/withdrawal', protect, authorize('jobseeker'), requestWithdrawal);
router.get('/withdrawals', protect, authorize('jobseeker'), getMyWithdrawals);
router.get('/earnings', protect, authorize('jobseeker'), getEarningsDashboard);

// Admin routes
router.put('/withdrawals/:id', protect, authorize('admin'), processWithdrawal);

module.exports = router;