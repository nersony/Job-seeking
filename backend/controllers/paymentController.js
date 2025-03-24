const Withdrawal = require('../models/withdrawalModel');
const Jobseeker = require('../models/jobseekerModel');
const Booking = require('../models/bookingModel');

// @desc    Request withdrawal
// @route   POST /api/payments/withdrawal
// @access  Private/Jobseeker
exports.requestWithdrawal = async (req, res) => {
  try {
    const {
      amount,
      paymentMethod,
      paymentDetails
    } = req.body;

    if (!amount || !paymentMethod || !paymentDetails) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required withdrawal details'
      });
    }

    // Get jobseeker profile
    const jobseekerProfile = await Jobseeker.findOne({ user: req.user._id });
    
    if (!jobseekerProfile) {
      return res.status(404).json({
        success: false,
        message: 'Jobseeker profile not found'
      });
    }

    // Calculate earnings from completed bookings
    const completedBookings = await Booking.find({
      jobseeker: jobseekerProfile._id,
      status: 'completed',
      paymentStatus: 'paid'
    });

    const totalEarnings = completedBookings.reduce((acc, booking) => acc + booking.totalAmount, 0);

    // Calculate pending withdrawals
    const pendingWithdrawals = await Withdrawal.find({
      jobseeker: jobseekerProfile._id,
      status: { $in: ['pending', 'approved'] }
    });

    const totalPendingWithdrawals = pendingWithdrawals.reduce((acc, withdrawal) => acc + withdrawal.amount, 0);

    // Calculate available balance
    const availableBalance = totalEarnings - totalPendingWithdrawals;

    if (amount > availableBalance) {
      return res.status(400).json({
        success: false,
        message: `Insufficient balance. Available: ${availableBalance}, Requested: ${amount}`
      });
    }

    // Create withdrawal request
    const withdrawal = await Withdrawal.create({
      jobseeker: jobseekerProfile._id,
      amount,
      paymentMethod,
      paymentDetails,
      status: 'pending',
      requestDate: Date.now()
    });

    res.status(201).json({
      success: true,
      withdrawal,
      availableBalance: availableBalance - amount
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get withdrawal requests for a jobseeker
// @route   GET /api/payments/withdrawals
// @access  Private/Jobseeker
exports.getMyWithdrawals = async (req, res) => {
  try {
    // Get jobseeker profile
    const jobseekerProfile = await Jobseeker.findOne({ user: req.user._id });
    
    if (!jobseekerProfile) {
      return res.status(404).json({
        success: false,
        message: 'Jobseeker profile not found'
      });
    }

    // Get withdrawals
    const withdrawals = await Withdrawal.find({ jobseeker: jobseekerProfile._id })
      .sort('-requestDate');

    res.json({
      success: true,
      count: withdrawals.length,
      withdrawals
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Process withdrawal request (admin only)
// @route   PUT /api/payments/withdrawals/:id
// @access  Private/Admin
exports.processWithdrawal = async (req, res) => {
  try {
    const { status, notes } = req.body;

    if (!status || !['approved', 'rejected', 'completed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid status'
      });
    }

    const withdrawal = await Withdrawal.findById(req.params.id);

    if (!withdrawal) {
      return res.status(404).json({
        success: false,
        message: 'Withdrawal request not found'
      });
    }

    withdrawal.status = status;
    
    if (notes) {
      withdrawal.notes = notes;
    }

    if (status === 'completed' || status === 'rejected') {
      withdrawal.processedDate = Date.now();
    }

    await withdrawal.save();

    res.json({
      success: true,
      message: `Withdrawal request ${status}`,
      withdrawal
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get earnings dashboard data
// @route   GET /api/payments/earnings
// @access  Private/Jobseeker
exports.getEarningsDashboard = async (req, res) => {
  try {
    // Get jobseeker profile
    const jobseekerProfile = await Jobseeker.findOne({ user: req.user._id });
    
    if (!jobseekerProfile) {
      return res.status(404).json({
        success: false,
        message: 'Jobseeker profile not found'
      });
    }

    // Calculate total completed bookings
    const completedBookings = await Booking.find({
      jobseeker: jobseekerProfile._id,
      status: 'completed',
      paymentStatus: 'paid'
    });

    const totalEarnings = completedBookings.reduce((acc, booking) => acc + booking.totalAmount, 0);

    // Calculate pending withdrawals
    const pendingWithdrawals = await Withdrawal.find({
      jobseeker: jobseekerProfile._id,
      status: { $in: ['pending', 'approved'] }
    });

    const totalPendingWithdrawals = pendingWithdrawals.reduce((acc, withdrawal) => acc + withdrawal.amount, 0);

    // Calculate completed withdrawals
    const completedWithdrawals = await Withdrawal.find({
      jobseeker: jobseekerProfile._id,
      status: 'completed'
    });

    const totalCompletedWithdrawals = completedWithdrawals.reduce((acc, withdrawal) => acc + withdrawal.amount, 0);

    // Calculate available balance
    const availableBalance = totalEarnings - totalPendingWithdrawals - totalCompletedWithdrawals;

    // Get recent transactions
    const recentCompletedBookings = await Booking.find({
      jobseeker: jobseekerProfile._id,
      status: 'completed',
      paymentStatus: 'paid'
    })
      .sort('-createdAt')
      .limit(5)
      .populate({
        path: 'endUser',
        select: 'name'
      });

    const recentWithdrawals = await Withdrawal.find({
      jobseeker: jobseekerProfile._id
    })
      .sort('-requestDate')
      .limit(5);

    res.json({
      success: true,
      earnings: {
        totalEarnings,
        availableBalance,
        pendingWithdrawals: totalPendingWithdrawals,
        completedWithdrawals: totalCompletedWithdrawals,
        recentCompletedBookings,
        recentWithdrawals
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};