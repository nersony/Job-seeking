const Booking = require("../models/bookingModel");
const Jobseeker = require("../models/jobseekerModel");
const User = require("../models/userModel");

// @desc    Create new booking
// @route   POST /api/bookings
// @access  Private/EndUser
exports.createBooking = async (req, res) => {
  try {
    const { jobseekerId, service, startTime, endTime, location, notes } =
      req.body;

    // Validate input
    if (!jobseekerId || !service || !startTime || !endTime || !location) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required booking details",
      });
    }

    // Check if jobseeker exists
    const jobseeker = await Jobseeker.findById(jobseekerId);
    if (!jobseeker) {
      return res.status(404).json({
        success: false,
        message: "Jobseeker not found",
      });
    }

    // Calculate booking duration in hours
    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationHours = (end - start) / (1000 * 60 * 60);

    // Calculate total amount
    const totalAmount = jobseeker.hourlyRate * durationHours;

    // Create booking
    const booking = await Booking.create({
      endUser: req.user._id,
      jobseeker: jobseekerId,
      service,
      startTime: start,
      endTime: end,
      location,
      totalAmount,
      notes,
    });

    res.status(201).json({
      success: true,
      booking,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// @desc    Get all bookings for the current user
// @route   GET /api/bookings
// @access  Private
exports.getMyBookings = async (req, res) => {
  try {
    let bookings;

    if (req.user.role === "enduser") {
      // Get bookings where user is the endUser
      bookings = await Booking.find({ endUser: req.user._id })
        .populate({
          path: "jobseeker",
          select: "serviceCategory hourlyRate",
          populate: {
            path: "user",
            select: "name email phone",
          },
        })
        .sort("-createdAt");
    } else if (req.user.role === "jobseeker") {
      // Get jobseeker profile
      const jobseekerProfile = await Jobseeker.findOne({ user: req.user._id });

      if (!jobseekerProfile) {
        return res.status(404).json({
          success: false,
          message: "Jobseeker profile not found",
        });
      }

      // Get bookings where user is the jobseeker
      bookings = await Booking.find({ jobseeker: jobseekerProfile._id })
        .populate({
          path: "endUser",
          select: "name email phone",
        })
        .sort("-createdAt");
    } else if (req.user.role === "admin") {
      // Admins can see all bookings
      bookings = await Booking.find({})
        .populate({
          path: "jobseeker",
          select: "serviceCategory hourlyRate",
          populate: {
            path: "user",
            select: "name email phone",
          },
        })
        .populate({
          path: "endUser",
          select: "name email phone",
        })
        .sort("-createdAt");
    }

    res.json({
      success: true,
      count: bookings.length,
      bookings,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// @desc    Get booking by ID
// @route   GET /api/bookings/:id
// @access  Private
exports.getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate({
        path: "jobseeker",
        select: "serviceCategory hourlyRate",
        populate: {
          path: "user",
          select: "name email phone",
        },
      })
      .populate({
        path: "endUser",
        select: "name email phone",
      });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    // Check if the user is authorized to view this booking
    if (
      req.user.role !== "admin" &&
      booking.endUser._id.toString() !== req.user._id.toString() &&
      !(
        req.user.role === "jobseeker" &&
        booking.jobseeker.user._id.toString() === req.user._id.toString()
      )
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to access this booking",
      });
    }

    res.json({
      success: true,
      booking,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// @desc    Update booking status
// @route   PUT /api/bookings/:id/status
// @access  Private
exports.updateBookingStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!status || !["confirmed", "completed", "cancelled"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid status",
      });
    }

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    // Check authorization
    if (
      req.user.role === "enduser" &&
      booking.endUser.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this booking",
      });
    }

    if (req.user.role === "jobseeker") {
      const jobseekerProfile = await Jobseeker.findOne({ user: req.user._id });

      if (
        !jobseekerProfile ||
        booking.jobseeker.toString() !== jobseekerProfile._id.toString()
      ) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to update this booking",
        });
      }
    }

    // Update booking status
    booking.status = status;
    await booking.save();

    res.json({
      success: true,
      message: `Booking status updated to ${status}`,
      booking,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// @desc    Upload payment proof
// @route   PUT /api/bookings/:id/payment-proof
// @access  Private/EndUser
exports.uploadPaymentProof = async (req, res) => {
  try {
    const { paymentProof } = req.body;

    if (!paymentProof) {
      return res.status(400).json({
        success: false,
        message: "Please provide payment proof",
      });
    }

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    // Ensure only the endUser can upload payment proof
    if (booking.endUser.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to upload payment proof for this booking",
      });
    }

    booking.paymentProof = paymentProof;
    booking.paymentStatus = "paid";
    await booking.save();

    res.json({
      success: true,
      message: "Payment proof uploaded successfully",
      booking,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// @desc    Update booking with Calendly event data
// @route   PUT /api/bookings/:id/calendly-event
// @access  Private
exports.updateBookingWithCalendlyEvent = async (req, res) => {
  try {
    const { calendlyEventUri, calendlyInviteeUri } = req.body;

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    // Check authorization
    if (
      req.user.role === "enduser" &&
      booking.endUser.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this booking",
      });
    }

    if (req.user.role === "jobseeker") {
      const jobseekerProfile = await Jobseeker.findOne({ user: req.user._id });

      if (
        !jobseekerProfile ||
        booking.jobseeker.toString() !== jobseekerProfile._id.toString()
      ) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to update this booking",
        });
      }
    }

    // Update booking with Calendly event data
    booking.calendlyEventUri = calendlyEventUri;
    booking.calendlyInviteeUri = calendlyInviteeUri;
    await booking.save();

    res.json({
      success: true,
      message: "Booking updated with Calendly event data",
      booking,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
