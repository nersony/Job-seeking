const express = require('express');
const router = express.Router();
const {
  createDispute,
  getMyDisputes,
  getDisputeById,
  updateDispute
} = require('../controllers/disputeController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Protected routes
router.post('/', protect, createDispute);
router.get('/', protect, getMyDisputes);
router.get('/:id', protect, getDisputeById);
router.put('/:id', protect, authorize('admin'), updateDispute);

module.exports = router;