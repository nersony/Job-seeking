// backend/controllers/availabilityController.js
const Jobseeker = require('../models/jobseekerModel');
const Booking = require('../models/bookingModel');
const mongoose = require('mongoose');

/**
 * Update jobseeker's working hours
 * @route   PUT /api/availability/working-hours
 * @access  Private/Jobseeker
 */
exports.updateWorkingHours = async (req, res) => {
  try {
    const jobseeker = await Jobseeker.findOne({ user: req.user._id });

    if (!jobseeker) {
      return res.status(404).json({
        success: false,
        message: 'Jobseeker profile not found'
      });
    }

    // Validate input
    const { workingHours } = req.body;
    const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    // Validate each day's working hours
    daysOfWeek.forEach(day => {
      if (workingHours[day]) {
        // Validate time format
        const startTimeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
        const endTimeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

        if (workingHours[day].isWorking) {
          if (!startTimeRegex.test(workingHours[day].startTime) || 
              !endTimeRegex.test(workingHours[day].endTime)) {
            return res.status(400).json({
              success: false,
              message: `Invalid time format for ${day}`
            });
          }
        }
      }
    });

    // Update working hours
    jobseeker.workingHours = { ...jobseeker.workingHours, ...workingHours };
    await jobseeker.save();

    res.json({
      success: true,
      message: 'Working hours updated successfully',
      workingHours: jobseeker.workingHours
    });
  } catch (error) {
    console.error('Error updating working hours:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Block specific dates for ajobseeker
 * @route   POST /api/availability/block-dates
 * @access  Private/Jobseeker
 */
exports.blockDates = async (req, res) => {
  try {
    const jobseeker = await Jobseeker.findOne({ user: req.user._id });

    if (!jobseeker) {
      return res.status(404).json({
        success: false,
        message: 'Jobseeker profile not found'
      });
    }

    const { startDate, endDate, reason } = req.body;

    // Validate dates
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start and end dates are required'
      });
    }

    const newBlockedPeriod = {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      reason: reason || 'Unavailable'
    };

    // Check for date overlap
    const hasOverlap = jobseeker.blockedDates.some(blockedPeriod => 
      newBlockedPeriod.startDate < blockedPeriod.endDate && 
      newBlockedPeriod.endDate > blockedPeriod.startDate
    );

    if (hasOverlap) {
      return res.status(400).json({
        success: false,
        message: 'This date range conflicts with an existing blocked period'
      });
    }

    // Add blocked date
    jobseeker.blockedDates.push(newBlockedPeriod);
    await jobseeker.save();

    res.json({
      success: true,
      message: 'Dates blocked successfully',
      blockedDates: jobseeker.blockedDates
    });
  } catch (error) {
    console.error('Error blocking dates:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Unblock specific dates for a jobseeker
 * @route   DELETE /api/availability/block-dates/:id
 * @access  Private/Jobseeker
 */
exports.unblockDates = async (req, res) => {
  try {
    const jobseeker = await Jobseeker.findOne({ user: req.user._id });

    if (!jobseeker) {
      return res.status(404).json({
        success: false,
        message: 'Jobseeker profile not found'
      });
    }

    const blockedDateId = req.params.id;

    // Remove the blocked date
    jobseeker.blockedDates = jobseeker.blockedDates.filter(
      blockedDate => blockedDate._id.toString() !== blockedDateId
    );

    await jobseeker.save();

    res.json({
      success: true,
      message: 'Blocked dates removed successfully',
      blockedDates: jobseeker.blockedDates
    });
  } catch (error) {
    console.error('Error unblocking dates:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Check jobseeker availability
 * @route   GET /api/availability/check
 * @access  Public
 */
exports.checkAvailability = async (req, res) => {
  try {
    const { jobseekerId, startTime, endTime } = req.query;

    if (!jobseekerId || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'Job seeker ID, start time, and end time are required'
      });
    }

    // Validate jobseekerId format
    if (!mongoose.Types.ObjectId.isValid(jobseekerId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid jobseeker ID format'
      });
    }

    // Find the jobseeker
    const jobseeker = await Jobseeker.findById(jobseekerId);

    if (!jobseeker) {
      return res.status(404).json({
        success: false,
        message: 'Job seeker not found'
      });
    }

    // Check for existing bookings that conflict
    const conflictingBookings = await Booking.find({
      jobseeker: jobseekerId,
      status: { $in: ['pending', 'confirmed'] },
      $or: [
        // Start time falls within an existing booking
        { 
          startTime: { $lte: new Date(startTime) },
          endTime: { $gte: new Date(startTime) }
        },
        // End time falls within an existing booking
        { 
          startTime: { $lte: new Date(endTime) },
          endTime: { $gte: new Date(endTime) }
        },
        // Booking completely encompasses the requested time
        {
          startTime: { $gte: new Date(startTime) },
          endTime: { $lte: new Date(endTime) }
        }
      ]
    });

    // Check availability using the jobseeker's method
    const isAvailable = jobseeker.isAvailableAt(startTime, endTime) && 
                        conflictingBookings.length === 0;

    return res.json({
      success: true,
      available: isAvailable,
      reason: isAvailable ? null : 'Time slot not available'
    });
  } catch (error) {
    console.error('Error checking availability:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Find available jobseekers
 * @route   GET /api/availability/find-available
 * @access  Public
 */
exports.findAvailableJobseekers = async (req, res) => {
  try {
    const { startTime, endTime, serviceCategory, minRating} = req.query;

    if (!startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'Start time and end time are required'
      });
    }

    // Build query for jobseekers
    const query = { isAvailable: true };
    
    // Add service category filter if provided
    if (serviceCategory) {
      query.serviceCategory = serviceCategory;
    }

    // Add minimum rating filter if provided
    if (minRating) {
      query.rating = { $gte: parseFloat(minRating) };
    }

    // Find all eligible jobseekers
    const jobseekers = await Jobseeker.find(query).populate({
      path: 'user',
      select: 'name email phone'
    });

    // Filter jobseekers by availability
    const availableJobseekers = await Promise.all(
      jobseekers.map(async (jobseeker) => {
        try {
          // Check for existing bookings that conflict
          const conflictingBookings = await Booking.find({
            jobseeker: jobseeker._id,
            status: { $in: ['pending', 'confirmed'] },
            $or: [
              { 
                startTime: { $lte: new Date(startTime) },
                endTime: { $gte: new Date(startTime) }
              },
              { 
                startTime: { $lte: new Date(endTime) },
                endTime: { $gte: new Date(endTime) }
              },
              {
                startTime: { $gte: new Date(startTime) },
                endTime: { $lte: new Date(endTime) }
              }
            ]
          });

          // Check availability using the jobseeker's method
          const isAvailable = jobseeker.isAvailableAt(startTime, endTime) && 
                              conflictingBookings.length === 0;

          return isAvailable ? jobseeker : null;
        } catch (error) {
          console.error(`Error checking availability for jobseeker ${jobseeker._id}:`, error);
          return null;
        }
      })
    );

    // Filter out null results
    const filteredJobseekers = availableJobseekers.filter(js => js !== null);

    // Return data for the client
    res.json({
      success: true,
      count: filteredJobseekers.length,
      jobseekers: filteredJobseekers
    });
  } catch (error) {
    console.error('Error finding available jobseekers:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};