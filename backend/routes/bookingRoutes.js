const express = require("express");
const router = express.Router();
const {
  createBooking,
  getMyBookings,
  getBookingById,
  updateBookingStatus,
  uploadPaymentProof,
  updateBookingWithCalendlyEvent,
} = require("../controllers/bookingController");
const { protect, authorize } = require("../middleware/authMiddleware");

// Protected routes
router.post("/", protect, authorize("enduser"), createBooking);
router.get("/", protect, getMyBookings);
router.get("/:id", protect, getBookingById);
router.put("/:id/status", protect, updateBookingStatus);
router.put(
  "/:id/payment-proof",
  protect,
  authorize("enduser"),
  uploadPaymentProof
);
router.put("/:id/calendly-event", protect, updateBookingWithCalendlyEvent);
module.exports = router;
