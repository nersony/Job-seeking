const Dispute = require('../models/disputeModel');
const Booking = require('../models/bookingModel');
const Jobseeker = require('../models/jobseekerModel');

// @desc    Create a new dispute
// @route   POST /api/disputes
// @access  Private
exports.createDispute = async (req, res) => {
  try {
    const { bookingId, issueType, description } = req.body;

    if (!bookingId || !issueType || !description) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    // Check if booking exists
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Verify user is associated with the booking
    const isEndUser = booking.endUser.toString() === req.user._id.toString();
    let isJobseeker = false;
    
    if (req.user.role === 'jobseeker') {
      const jobseekerProfile = await Jobseeker.findOne({ user: req.user._id });
      if (jobseekerProfile && booking.jobseeker.toString() === jobseekerProfile._id.toString()) {
        isJobseeker = true;
      }
    }

    if (!isEndUser && !isJobseeker && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to create a dispute for this booking'
      });
    }

    // Check if a dispute already exists for this booking
    const existingDispute = await Dispute.findOne({ booking: bookingId });
    if (existingDispute) {
      return res.status(400).json({
        success: false,
        message: 'A dispute already exists for this booking',
        dispute: existingDispute
      });
    }

    // Create dispute
    const dispute = await Dispute.create({
      booking: bookingId,
      reportedBy: req.user._id,
      issueType,
      description,
      status: 'open'
    });

    res.status(201).json({
      success: true,
      dispute
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get disputes for the current user
// @route   GET /api/disputes
// @access  Private
exports.getMyDisputes = async (req, res) => {
  try {
    let disputes;

    if (req.user.role === 'admin') {
      // Admins can see all disputes
      disputes = await Dispute.find({})
        .populate({
          path: 'booking',
          populate: [
            {
              path: 'endUser',
              select: 'name email'
            },
            {
              path: 'jobseeker',
              select: 'serviceCategory',
              populate: {
                path: 'user',
                select: 'name email'
              }
            }
          ]
        })
        .populate('reportedBy', 'name email role')
        .sort('-createdAt');
    } else if (req.user.role === 'jobseeker') {
      // Get jobseeker profile
      const jobseekerProfile = await Jobseeker.findOne({ user: req.user._id });
      
      if (!jobseekerProfile) {
        return res.status(404).json({
          success: false,
          message: 'Jobseeker profile not found'
        });
      }
      
      // Get bookings for this jobseeker
      const bookings = await Booking.find({ jobseeker: jobseekerProfile._id });
      const bookingIds = bookings.map(booking => booking._id);
      
      // Get disputes related to these bookings
      disputes = await Dispute.find({
        $or: [
          { booking: { $in: bookingIds } },
          { reportedBy: req.user._id }
        ]
      })
        .populate({
          path: 'booking',
          populate: [
            {
              path: 'endUser',
              select: 'name email'
            },
            {
              path: 'jobseeker',
              select: 'serviceCategory',
              populate: {
                path: 'user',
                select: 'name email'
              }
            }
          ]
        })
        .populate('reportedBy', 'name email role')
        .sort('-createdAt');
    } else {
      // End users - get disputes reported by them or related to their bookings
      disputes = await Dispute.find({
        $or: [
          { reportedBy: req.user._id },
          { 
            booking: { 
              $in: await Booking.find({ endUser: req.user._id }).distinct('_id') 
            } 
          }
        ]
      })
        .populate({
          path: 'booking',
          populate: [
            {
              path: 'endUser',
              select: 'name email'
            },
            {
              path: 'jobseeker',
              select: 'serviceCategory',
              populate: {
                path: 'user',
                select: 'name email'
              }
            }
          ]
        })
        .populate('reportedBy', 'name email role')
        .sort('-createdAt');
    }

    res.json({
      success: true,
      count: disputes.length,
      disputes
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get dispute by ID
// @route   GET /api/disputes/:id
// @access  Private
exports.getDisputeById = async (req, res) => {
  try {
    const dispute = await Dispute.findById(req.params.id)
      .populate({
        path: 'booking',
        populate: [
          {
            path: 'endUser',
            select: 'name email'
          },
          {
            path: 'jobseeker',
            select: 'serviceCategory',
            populate: {
              path: 'user',
              select: 'name email'
            }
          }
        ]
      })
      .populate('reportedBy', 'name email role');

    if (!dispute) {
      return res.status(404).json({
        success: false,
        message: 'Dispute not found'
      });
    }

    // Check if user is authorized to view this dispute
    const isReporter = dispute.reportedBy._id.toString() === req.user._id.toString();
    const isBookingEndUser = dispute.booking.endUser._id.toString() === req.user._id.toString();
    let isBookingJobseeker = false;

    if (req.user.role === 'jobseeker') {
      const jobseekerProfile = await Jobseeker.findOne({ user: req.user._id });
      if (jobseekerProfile && dispute.booking.jobseeker._id.toString() === jobseekerProfile._id.toString()) {
        isBookingJobseeker = true;
      }
    }

    if (!isReporter && !isBookingEndUser && !isBookingJobseeker && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this dispute'
      });
    }

    res.json({
      success: true,
      dispute
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update dispute status (admin only)
// @route   PUT /api/disputes/:id
// @access  Private/Admin
exports.updateDispute = async (req, res) => {
  try {
    const { status, resolution, adminNotes } = req.body;

    if (!status || !['investigating', 'resolved', 'closed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid status'
      });
    }

    const dispute = await Dispute.findById(req.params.id);

    if (!dispute) {
      return res.status(404).json({
        success: false,
        message: 'Dispute not found'
      });
    }

    dispute.status = status;
    
    if (resolution) {
      dispute.resolution = resolution;
    }
    
    if (adminNotes) {
      dispute.adminNotes = adminNotes;
    }

    if (status === 'resolved' || status === 'closed') {
      dispute.resolvedAt = Date.now();
    }

    await dispute.save();

    res.json({
      success: true,
      message: `Dispute status updated to ${status}`,
      dispute
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};