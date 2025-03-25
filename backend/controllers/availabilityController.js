// backend/controllers/availabilityController.js
const Jobseeker = require('../models/jobseekerModel');
const CalendlyAvailability = require('../models/calendlyAvailabilityModel');
const CalendlyService = require('../services/calendlyService');
const mongoose = require('mongoose');

/**
 * Check if jobseeker is available at a specific time
 * @route   GET /api/availability/check
 * @access  Public
 */
exports.checkJobseekerAvailability = async (req, res) => {
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

    // Format dates properly
    const startDate = new Date(startTime);
    const endDate = new Date(endTime);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date/time format. Please use ISO format (YYYY-MM-DDTHH:MM:SS)'
      });
    }

    // Check if the requested time is in the past
    if (startDate < new Date()) {
      return res.json({
        success: true,
        available: false,
        reason: 'Cannot book time slots in the past'
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

    // Check if jobseeker is generally available (isAvailable flag)
    if (!jobseeker.isAvailable) {
      return res.json({
        success: true,
        available: false,
        reason: 'Provider is not currently accepting bookings'
      });
    }

    // First check local database for availability
    const availability = await CalendlyAvailability.findOne({ jobseeker: jobseekerId });
    let isAvailable = false;
    let reason = 'No availability data';

    if (availability) {
      // Check the availability record
      isAvailable = availability.isAvailableAt(startDate, endTime);
      reason = isAvailable ? null : 'Time slot not available in provider\'s calendar';
    } else if (jobseeker.calendlyAccessToken && jobseeker.calendlyUri) {
      // If no local record but has Calendly integration, check with Calendly API
      try {
        // Refresh token if needed
        if (jobseeker.calendlyTokenExpiry && new Date(jobseeker.calendlyTokenExpiry) <= new Date()) {
          try {
            const tokenData = await CalendlyService.refreshToken(jobseeker.calendlyRefreshToken);
            jobseeker.calendlyAccessToken = tokenData.access_token;
            jobseeker.calendlyRefreshToken = tokenData.refresh_token || jobseeker.calendlyRefreshToken;
            jobseeker.calendlyTokenExpiry = new Date(Date.now() + tokenData.expires_in * 1000);
            await jobseeker.save();
          } catch (refreshError) {
            console.error('Error refreshing token:', refreshError);
            return res.json({
              success: true,
              available: false,
              reason: 'Failed to verify availability with provider\'s calendar'
            });
          }
        }

        // Check availability with Calendly
        isAvailable = await CalendlyService.isAvailable(
          jobseeker.calendlyAccessToken,
          jobseeker.calendlyUri,
          startDate.toISOString(),
          endDate.toISOString()
        );
        reason = isAvailable ? null : 'Time slot not available in provider\'s calendar';
      } catch (error) {
        console.error('Error checking Calendly availability:', error);
        return res.json({
          success: true,
          available: false,
          reason: 'Failed to verify availability with provider\'s calendar'
        });
      }
    } else {
      // If no Calendly integration and no local record, assume available
      // This is a fallback and can be adjusted based on your business logic
      isAvailable = true;
      reason = null;
    }

    return res.json({
      success: true,
      available: isAvailable,
      reason
    });
  } catch (error) {
    console.error('Error in availability check:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Find all jobseekers available at a specific time
 * @route   GET /api/availability/find-available
 * @access  Public
 */
exports.findAvailableJobseekers = async (req, res) => {
  try {
    const { startTime, endTime, serviceCategory } = req.query;

    if (!startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'Start time and end time are required'
      });
    }

    // Format dates properly
    const startDate = new Date(startTime);
    const endDate = new Date(endTime);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date/time format. Please use ISO format (YYYY-MM-DDTHH:MM:SS)'
      });
    }

    // Build query for jobseekers
    const query = { isAvailable: true };
    
    // Add service category filter if provided
    if (serviceCategory) {
      query.serviceCategory = serviceCategory;
    }

    // Find all eligible jobseekers
    const jobseekers = await Jobseeker.find(query).populate({
      path: 'user',
      select: 'name email phone'
    });

    // Get the day of week
    const dayIndex = startDate.getDay();
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = days[dayIndex];

    console.log(`Finding available jobseekers for ${dayName}, ${startDate.toISOString()} to ${endDate.toISOString()}`);

    // Check availability for each jobseeker
    const availabilityChecks = await Promise.all(
      jobseekers.map(async (jobseeker) => {
        try {
          // First check local database for availability
          const availability = await CalendlyAvailability.findOne({ jobseeker: jobseeker._id });
          let isAvailable = false;

          if (availability) {
            // Check the availability record
            isAvailable = availability.isAvailableAt(startDate, endDate);
          } else if (jobseeker.calendlyAccessToken && jobseeker.calendlyUri) {
            // If no local record but has Calendly integration, check with Calendly API
            try {
              // Refresh token if needed
              if (jobseeker.calendlyTokenExpiry && new Date(jobseeker.calendlyTokenExpiry) <= new Date()) {
                try {
                  const tokenData = await CalendlyService.refreshToken(jobseeker.calendlyRefreshToken);
                  jobseeker.calendlyAccessToken = tokenData.access_token;
                  jobseeker.calendlyRefreshToken = tokenData.refresh_token || jobseeker.calendlyRefreshToken;
                  jobseeker.calendlyTokenExpiry = new Date(Date.now() + tokenData.expires_in * 1000);
                  await jobseeker.save();
                } catch (refreshError) {
                  console.error('Error refreshing token:', refreshError);
                  return { jobseeker, available: false };
                }
              }

              // Check availability with Calendly
              isAvailable = await CalendlyService.isAvailable(
                jobseeker.calendlyAccessToken,
                jobseeker.calendlyUri,
                startDate.toISOString(),
                endDate.toISOString()
              );
            } catch (error) {
              console.error(`Error checking Calendly availability for jobseeker ${jobseeker._id}:`, error);
              return { jobseeker, available: false };
            }
          } else {
            // If no Calendly integration and no local record, assume available
            isAvailable = true;
          }

          return {
            jobseeker,
            available: isAvailable
          };
        } catch (error) {
          console.error(`Error checking availability for jobseeker ${jobseeker._id}:`, error);
          return { jobseeker, available: false };
        }
      })
    );

    // Filter to only available jobseekers
    const availableJobseekers = availabilityChecks
      .filter(result => result.available)
      .map(result => result.jobseeker);

    // Return data for the client
    res.json({
      success: true,
      count: availableJobseekers.length,
      jobseekers: availableJobseekers
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

/**
 * Get weekly availability for a jobseeker
 * @route   GET /api/availability/weekly/:id
 * @access  Public
 */
exports.getJobseekerWeeklyAvailability = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Valid jobseeker ID is required'
      });
    }

    // Find the jobseeker
    const jobseeker = await Jobseeker.findById(id);

    if (!jobseeker) {
      return res.status(404).json({
        success: false,
        message: 'Job seeker not found'
      });
    }

    // Check if jobseeker has availability data in the database
    const availability = await CalendlyAvailability.findOne({ jobseeker: id });

    if (availability) {
      // Return the locally stored availability
      return res.json({
        success: true,
        scheduleName: availability.scheduleName,
        availability: availability.weeklyAvailability,
        lastUpdated: availability.lastUpdated
      });
    } else if (jobseeker.calendlyAccessToken && jobseeker.calendlyUri) {
      // If no local availability data but jobseeker has Calendly connected, fetch it from Calendly
      try {
        // Refresh token if needed
        if (jobseeker.calendlyTokenExpiry && new Date(jobseeker.calendlyTokenExpiry) <= new Date()) {
          try {
            const tokenData = await CalendlyService.refreshToken(jobseeker.calendlyRefreshToken);
            jobseeker.calendlyAccessToken = tokenData.access_token;
            jobseeker.calendlyRefreshToken = tokenData.refresh_token || jobseeker.calendlyRefreshToken;
            jobseeker.calendlyTokenExpiry = new Date(Date.now() + tokenData.expires_in * 1000);
            await jobseeker.save();
          } catch (refreshError) {
            console.error('Error refreshing token:', refreshError);
            return res.status(401).json({
              success: false,
              message: 'Failed to refresh calendar access'
            });
          }
        }

        // Fetch weekly availability from Calendly
        const result = await CalendlyService.getWeeklyAvailability(
          jobseeker.calendlyAccessToken,
          jobseeker.calendlyUri
        );

        // Store this availability data in our database for future use
        const newAvailability = new CalendlyAvailability({
          jobseeker: jobseeker._id,
          scheduleUri: 'fetched-from-api',
          scheduleName: result.scheduleName,
          weeklyAvailability: result.availability,
          lastUpdated: new Date()
        });
        await newAvailability.save();

        // Return the availability data
        return res.json({
          success: true,
          scheduleName: result.scheduleName,
          availability: result.availability,
          lastUpdated: new Date()
        });
      } catch (error) {
        console.error('Error fetching Calendly weekly availability:', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch availability from calendar',
          error: error.message
        });
      }
    } else {
      // If no Calendly integration, return default business hours
      return res.json({
        success: true,
        scheduleName: 'Default Schedule',
        availability: CalendlyService.getDefaultAvailability(),
        lastUpdated: null
      });
    }
  } catch (error) {
    console.error('Error getting weekly availability:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Set up a Calendly webhook subscription for a jobseeker
 * @route   POST /api/availability/setup-webhook
 * @access  Private/Jobseeker
 */
exports.setupWebhookSubscription = async (req, res) => {
  try {
    // Get jobseeker profile
    const jobseeker = await Jobseeker.findOne({ user: req.user._id });
    
    if (!jobseeker) {
      return res.status(404).json({
        success: false,
        message: 'Jobseeker profile not found'
      });
    }
    
    // Check if Calendly is connected
    if (!jobseeker.calendlyAccessToken || !jobseeker.calendlyUri) {
      return res.status(400).json({
        success: false,
        message: 'Calendly account not connected'
      });
    }
    
    // Refresh token if needed
    if (jobseeker.calendlyTokenExpiry && new Date(jobseeker.calendlyTokenExpiry) <= new Date()) {
      try {
        const tokenData = await CalendlyService.refreshToken(jobseeker.calendlyRefreshToken);
        jobseeker.calendlyAccessToken = tokenData.access_token;
        jobseeker.calendlyRefreshToken = tokenData.refresh_token || jobseeker.calendlyRefreshToken;
        jobseeker.calendlyTokenExpiry = new Date(Date.now() + tokenData.expires_in * 1000);
        await jobseeker.save();
      } catch (refreshError) {
        console.error('Error refreshing token:', refreshError);
        return res.status(401).json({
          success: false,
          message: 'Failed to refresh Calendly token'
        });
      }
    }
    
    // Define the webhook URL
    // In a production environment, this should be a publicly accessible URL
    const webhookUrl = `${process.env.API_BASE_URL || 'https://your-domain.com'}/api/calendly/webhook`;
    
    // Define the events we want to subscribe to
    const events = [
      'invitee.created',
      'invitee.canceled',
      'user_availability_schedule.created',
      'user_availability_schedule.updated',
      'user_availability_schedule.deleted',
      'availability_rule.created',
      'availability_rule.updated',
      'availability_rule.deleted'
    ];
    
    // Get organization URI from the user URI
    const organizationUri = jobseeker.calendlyUri.replace('users', 'organizations');
    
    try {
      // First check if we already have webhooks
      const existingWebhooks = await CalendlyService.getWebhookSubscriptions(
        jobseeker.calendlyAccessToken,
        organizationUri
      );
      
      // Filter to find webhooks pointing to our endpoint
      const matchingWebhooks = existingWebhooks.filter(webhook => 
        webhook.callback_url === webhookUrl
      );
      
      if (matchingWebhooks.length > 0) {
        // We already have a webhook for this URL, just return it
        jobseeker.calendlyWebhooks = matchingWebhooks.map(webhook => ({
          uri: webhook.uri,
          events: webhook.events
        }));
        await jobseeker.save();
        
        return res.json({
          success: true,
          message: 'Webhook subscription already exists',
          webhook: matchingWebhooks[0]
        });
      }
      
      // Create new webhook subscription
      const webhook = await CalendlyService.createWebhookSubscription(
        jobseeker.calendlyAccessToken,
        jobseeker.calendlyUri,
        webhookUrl,
        events
      );
      
      // Save webhook info to jobseeker
      jobseeker.calendlyWebhooks = jobseeker.calendlyWebhooks || [];
      jobseeker.calendlyWebhooks.push({
        uri: webhook.uri,
        events: webhook.events
      });
      await jobseeker.save();
      
      res.json({
        success: true,
        message: 'Webhook subscription created successfully',
        webhook
      });
      
    } catch (error) {
      console.error('Error creating webhook subscription:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to set up calendar webhooks',
        error: error.message
      });
    }
  } catch (error) {
    console.error('Error setting up webhook subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Delete a Calendly webhook subscription
 * @route   DELETE /api/availability/webhook/:uri
 * @access  Private/Jobseeker
 */
exports.deleteWebhookSubscription = async (req, res) => {
  try {
    const { uri } = req.params;
    
    if (!uri) {
      return res.status(400).json({
        success: false,
        message: 'Webhook URI is required'
      });
    }
    
    // Get jobseeker profile
    const jobseeker = await Jobseeker.findOne({ user: req.user._id });
    
    if (!jobseeker) {
      return res.status(404).json({
        success: false,
        message: 'Jobseeker profile not found'
      });
    }
    
    // Check if Calendly is connected
    if (!jobseeker.calendlyAccessToken) {
      return res.status(400).json({
        success: false,
        message: 'Calendly account not connected'
      });
    }
    
    // Refresh token if needed
    if (jobseeker.calendlyTokenExpiry && new Date(jobseeker.calendlyTokenExpiry) <= new Date()) {
      try {
        const tokenData = await CalendlyService.refreshToken(jobseeker.calendlyRefreshToken);
        jobseeker.calendlyAccessToken = tokenData.access_token;
        jobseeker.calendlyRefreshToken = tokenData.refresh_token || jobseeker.calendlyRefreshToken;
        jobseeker.calendlyTokenExpiry = new Date(Date.now() + tokenData.expires_in * 1000);
        await jobseeker.save();
      } catch (refreshError) {
        console.error('Error refreshing token:', refreshError);
        return res.status(401).json({
          success: false,
          message: 'Failed to refresh Calendly token'
        });
      }
    }
    
    // Delete webhook subscription
    try {
      await CalendlyService.deleteWebhookSubscription(
        jobseeker.calendlyAccessToken,
        uri
      );
      
      // Remove webhook from jobseeker record
      jobseeker.calendlyWebhooks = jobseeker.calendlyWebhooks.filter(
        webhook => webhook.uri !== uri
      );
      await jobseeker.save();
      
      res.json({
        success: true,
        message: 'Webhook subscription deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting webhook subscription:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete webhook subscription',
        error: error.message
      });
    }
  } catch (error) {
    console.error('Error deleting webhook subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Manually sync jobseeker availability with Calendly
 * @route   POST /api/availability/sync
 * @access  Private/Jobseeker
 */
exports.syncAvailability = async (req, res) => {
  try {
    // Get jobseeker profile
    const jobseeker = await Jobseeker.findOne({ user: req.user._id });
    
    if (!jobseeker) {
      return res.status(404).json({
        success: false,
        message: 'Jobseeker profile not found'
      });
    }
    
    // Check if Calendly is connected
    if (!jobseeker.calendlyAccessToken || !jobseeker.calendlyUri) {
      return res.status(400).json({
        success: false,
        message: 'Calendly account not connected'
      });
    }
    
    // Refresh token if needed
    if (jobseeker.calendlyTokenExpiry && new Date(jobseeker.calendlyTokenExpiry) <= new Date()) {
      try {
        const tokenData = await CalendlyService.refreshToken(jobseeker.calendlyRefreshToken);
        jobseeker.calendlyAccessToken = tokenData.access_token;
        jobseeker.calendlyRefreshToken = tokenData.refresh_token || jobseeker.calendlyRefreshToken;
        jobseeker.calendlyTokenExpiry = new Date(Date.now() + tokenData.expires_in * 1000);
        await jobseeker.save();
      } catch (refreshError) {
        console.error('Error refreshing token:', refreshError);
        return res.status(401).json({
          success: false,
          message: 'Failed to refresh Calendly token'
        });
      }
    }
    
    try {
      // Fetch weekly availability from Calendly
      const result = await CalendlyService.getWeeklyAvailability(
        jobseeker.calendlyAccessToken,
        jobseeker.calendlyUri
      );
      
      // Find or create availability record
      let availability = await CalendlyAvailability.findOne({ jobseeker: jobseeker._id });
      
      if (!availability) {
        availability = new CalendlyAvailability({
          jobseeker: jobseeker._id,
          scheduleUri: 'manual-sync',
          scheduleName: result.scheduleName,
          weeklyAvailability: result.availability,
          lastUpdated: new Date()
        });
      } else {
        // Update existing record
        availability.scheduleName = result.scheduleName;
        availability.weeklyAvailability = result.availability;
        availability.lastUpdated = new Date();
      }
      
      await availability.save();
      
      // Update jobseeker's hasWeeklyAvailability flag
      const hasAvailability = Object.values(result.availability).some(
        daySlots => daySlots && daySlots.length > 0
      );
      
      jobseeker.hasWeeklyAvailability = hasAvailability;
      await jobseeker.save();
      
      res.json({
        success: true,
        message: 'Availability synchronized successfully',
        availability: {
          scheduleName: availability.scheduleName,
          weeklyAvailability: availability.weeklyAvailability,
          lastUpdated: availability.lastUpdated
        }
      });
    } catch (error) {
      console.error('Error syncing availability with Calendly:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to sync availability with Calendly',
        error: error.message
      });
    }
  } catch (error) {
    console.error('Error syncing availability:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Get availability data for multiple dates
 * @route   GET /api/availability/dates
 * @access  Public
 */
exports.getAvailabilityForDates = async (req, res) => {
  try {
    const { jobseekerId, startDate, endDate } = req.query;
    
    if (!jobseekerId || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Job seeker ID, start date, and end date are required'
      });
    }
    
    // Validate jobseekerId format
    if (!mongoose.Types.ObjectId.isValid(jobseekerId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid jobseeker ID format'
      });
    }
    
    // Parse dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Please use YYYY-MM-DD'
      });
    }
    
    // Limit to 60 days maximum range
    const maxEndDate = new Date(start);
    maxEndDate.setDate(maxEndDate.getDate() + 60);
    
    const actualEndDate = end > maxEndDate ? maxEndDate : end;
    
    // Find the jobseeker
    const jobseeker = await Jobseeker.findById(jobseekerId);
    
    if (!jobseeker) {
      return res.status(404).json({
        success: false,
        message: 'Job seeker not found'
      });
    }
    
    // Check if jobseeker has availability data in the database
    const availabilityRecord = await CalendlyAvailability.findOne({ jobseeker: jobseekerId });
    
    // Generate an array of dates in the range
    const dateRange = [];
    const currentDate = new Date(start);
    
    while (currentDate <= actualEndDate) {
      dateRange.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // For each date, determine if there's availability
    const availabilityByDate = [];
    
    for (const date of dateRange) {
      const dayOfWeek = date.getDay();
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayName = days[dayOfWeek];
      
      // Check if this date is available based on weekly schedule
      let timeSlots = [];
      let isAvailable = false;
      
      if (availabilityRecord) {
        // Use stored weekly availability
        const dayAvailability = availabilityRecord.weeklyAvailability[dayName] || [];
        isAvailable = dayAvailability.length > 0;
        timeSlots = dayAvailability.map(slot => ({
          startTime: slot.startTime,
          endTime: slot.endTime
        }));
      } else if (jobseeker.calendlyAccessToken && jobseeker.calendlyUri) {
        // If no stored availability but has Calendly, assume standard hours for now
        // In a full implementation, we would check with Calendly API for more accurate data
        if (dayName !== 'saturday' && dayName !== 'sunday') {
          isAvailable = true;
          timeSlots = [{ startTime: '09:00', endTime: '17:00' }];
        }
      } else {
        // Default behavior for no Calendly integration
        if (dayName !== 'saturday' && dayName !== 'sunday') {
          isAvailable = true;
          timeSlots = [{ startTime: '09:00', endTime: '17:00' }];
        }
      }
      
      availabilityByDate.push({
        date: date.toISOString().split('T')[0],
        available: isAvailable,
        timeSlots
      });
    }
    
    res.json({
      success: true,
      jobseekerId,
      startDate: start.toISOString().split('T')[0],
      endDate: actualEndDate.toISOString().split('T')[0],
      availability: availabilityByDate
    });
  } catch (error) {
    console.error('Error getting availability for dates:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};