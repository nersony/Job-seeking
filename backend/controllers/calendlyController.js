// backend/controllers/calendlyController.js
const axios = require('axios');
const Jobseeker = require('../models/jobseekerModel');
const CalendlyService = require('../services/calendlyService');
// Add this function to your calendlyController.js to consolidate time slots
function consolidateTimeSlots(timeSlots) {
  if (!timeSlots || timeSlots.length === 0) return [];

  // First, ensure proper format for all time slots
  const formattedSlots = timeSlots.map(slot => ({
    startTime: slot.startTime ? slot.startTime.replace('.', ':') : '00:00',
    // If endTime is invalid, use the next time slot's start time or add 30 minutes
    endTime: (slot.endTime && slot.endTime !== 'Invalid Date')
      ? slot.endTime.replace('.', ':')
      : '00:00'
  }));

  // Sort slots by start time
  formattedSlots.sort((a, b) => a.startTime.localeCompare(b.startTime));

  // Identify consecutive slots and merge them
  const consolidatedRanges = [];
  let currentRange = null;

  formattedSlots.forEach((slot, index) => {
    // For first slot or when there's a gap
    if (!currentRange) {
      currentRange = {
        startTime: slot.startTime,
        // If it's the last slot or endTime is valid, use it; otherwise use next slot's start or add 30min
        endTime: index === formattedSlots.length - 1
          ? addMinutes(slot.startTime, 30)
          : formattedSlots[index + 1].startTime
      };
    } else {
      // Check if this slot continues the current range
      if (slot.startTime === currentRange.endTime) {
        // Extend the current range
        currentRange.endTime = index === formattedSlots.length - 1
          ? addMinutes(slot.startTime, 30)
          : formattedSlots[index + 1].startTime;
      } else {
        // This slot doesn't continue the current range
        consolidatedRanges.push(currentRange);
        currentRange = {
          startTime: slot.startTime,
          endTime: index === formattedSlots.length - 1
            ? addMinutes(slot.startTime, 30)
            : formattedSlots[index + 1].startTime
        };
      }
    }
  });

  // Add the last range if it exists
  if (currentRange) {
    consolidatedRanges.push(currentRange);
  }

  // Special case for the last time slot of the day (no next slot to use for endTime)
  if (consolidatedRanges.length > 0) {
    const lastRange = consolidatedRanges[consolidatedRanges.length - 1];
    if (lastRange.startTime === '23:00' || lastRange.startTime === '23:30') {
      lastRange.endTime = '23:59';
    }
  }

  return consolidatedRanges;
}

// Helper function to add minutes to a time string
function addMinutes(timeStr, minutes) {
  if (!timeStr) return '00:00';

  // Convert from 'HH:MM' format to Date
  const [hours, mins] = timeStr.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, mins + minutes, 0, 0);

  // Format back to 'HH:MM'
  return date.toTimeString().slice(0, 5);
}
/**
 * @desc    Fetch jobseeker's Calendly weekly availability
 * @route   GET /api/calendly/weekly-availability
 * @access  Private/Jobseeker
 */
exports.getWeeklyAvailability = async (req, res) => {
  try {
    // Get jobseeker profile
    const jobseeker = await Jobseeker.findOne({ user: req.user._id });

    if (!jobseeker) {
      return res.status(404).json({
        success: false,
        message: 'Jobseeker profile not found'
      });
    }

    // Check if jobseeker has connected Calendly
    if (!jobseeker.calendlyAccessToken || !jobseeker.calendlyUri) {
      return res.status(400).json({
        success: false,
        message: 'Calendly account not connected'
      });
    }

    // Check if token is expired
    const now = new Date();
    if (jobseeker.calendlyTokenExpiry && new Date(jobseeker.calendlyTokenExpiry) <= now) {
      try {
        // Try to refresh the token
        const tokenData = await CalendlyService.refreshToken(jobseeker.calendlyRefreshToken);

        // Update jobseeker record with new tokens
        jobseeker.calendlyAccessToken = tokenData.access_token;
        jobseeker.calendlyRefreshToken = tokenData.refresh_token;
        jobseeker.calendlyTokenExpiry = new Date(now.getTime() + tokenData.expires_in * 1000);
        await jobseeker.save();
      } catch (refreshError) {
        return res.status(401).json({
          success: false,
          message: 'Calendly authentication expired. Please reconnect your account.',
          error: refreshError.message
        });
      }
    }

    // Get weekly availability using the updated service method
    const result = await CalendlyService.getWeeklyAvailability(
      jobseeker.calendlyAccessToken,
      jobseeker.calendlyUri
    );

    return res.json({
      success: true,
      scheduleName: result.scheduleName,
      availability: result.availability,
      jobseekerName: jobseeker.user ? jobseeker.user.name : 'Job Seeker'
    });

  } catch (error) {
    console.error('Error fetching Calendly weekly availability:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch availability',
      error: error.message
    });
  }
};

/**
 * @desc    Fetch available time slots for a date range
 * @route   GET /api/calendly/available-times
 * @access  Private
 */
exports.getAvailableTimes = async (req, res) => {
  try {
    const { jobseekerId, startTime, endTime } = req.query;

    if (!jobseekerId || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'Job seeker ID, start time, and end time are required'
      });
    }

    // Get jobseeker
    const jobseeker = await Jobseeker.findById(jobseekerId);

    if (!jobseeker) {
      return res.status(404).json({
        success: false,
        message: 'Job seeker not found'
      });
    }

    // Check if jobseeker has connected Calendly
    if (!jobseeker.calendlyAccessToken || !jobseeker.calendlyUri) {
      return res.status(400).json({
        success: false,
        message: 'This job seeker has not connected their Calendly account'
      });
    }

    // Check if token is expired
    const now = new Date();
    if (jobseeker.calendlyTokenExpiry && new Date(jobseeker.calendlyTokenExpiry) <= now) {
      try {
        // Try to refresh the token
        const tokenData = await CalendlyService.refreshToken(jobseeker.calendlyRefreshToken);

        // Update jobseeker record with new tokens
        jobseeker.calendlyAccessToken = tokenData.access_token;
        jobseeker.calendlyRefreshToken = tokenData.refresh_token;
        jobseeker.calendlyTokenExpiry = new Date(now.getTime() + tokenData.expires_in * 1000);
        await jobseeker.save();
      } catch (refreshError) {
        return res.status(401).json({
          success: false,
          message: 'Calendly authentication expired.',
          error: refreshError.message
        });
      }
    }

    // Get event types
    const eventTypes = await CalendlyService.getEventTypes(
      jobseeker.calendlyAccessToken,
      jobseeker.calendlyUri
    );

    if (!eventTypes || eventTypes.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No event types found for this job seeker'
      });
    }

    // For each event type, get available times
    const availabilityByEventType = {};

    for (const eventType of eventTypes) {
      if (eventType.active) {
        const availableTimes = await CalendlyService.getAvailableTimes(
          jobseeker.calendlyAccessToken,
          eventType.uri,
          startTime,
          endTime
        );

        availabilityByEventType[eventType.uri] = {
          eventType: {
            uri: eventType.uri,
            name: eventType.name,
            duration: eventType.duration,
            description: eventType.description
          },
          availableTimes: CalendlyService.formatAvailability(availableTimes)
        };
      }
    }

    res.json({
      success: true,
      jobseekerId,
      availability: availabilityByEventType
    });

  } catch (error) {
    console.error('Error fetching available times:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch available times',
      error: error.message
    });
  }
};

/**
 * @desc    Find available jobseekers for a specific time slot
 * @route   GET /api/calendly/available-jobseekers
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

    console.log(`Checking availability for: ${startDate.toISOString()} to ${endDate.toISOString()}`);

    // Find jobseekers with Calendly connected
    const query = {
      isAvailable: true,
      calendlyAccessToken: { $exists: true },
      calendlyUri: { $exists: true }
    };

    // Add service category filter if provided
    if (serviceCategory) {
      query.serviceCategory = serviceCategory;
    }

    const jobseekers = await Jobseeker.find(query).populate({
      path: 'user',
      select: 'name email phone'
    });

    console.log(`Found ${jobseekers.length} potential jobseekers`);

    // Check availability for each jobseeker
    const availableJobseekers = [];

    for (const jobseeker of jobseekers) {
      try {
        // Get the day of week from start date (0 = Sunday, 1 = Monday, etc.)
        const dayIndex = startDate.getDay();
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const dayName = days[dayIndex];

        // Get the start and end time in HH:MM format
        const requestedStartTime = startDate.toTimeString().slice(0, 5); // HH:MM format
        const requestedEndTime = endDate.toTimeString().slice(0, 5); // HH:MM format

        console.log(`Checking ${jobseeker.user.name} availability for ${dayName} ${requestedStartTime}-${requestedEndTime}`);

        // Get jobseeker's availability for that day
        const response = await axios.get(`/api/calendly/weekly-availability?jobseekerId=${jobseeker._id}`);
        const availability = response.data.availability;

        // Check if jobseeker is available at the requested time
        const isAvailable = checkTimeSlotAvailability(
          availability[dayName],
          requestedStartTime,
          requestedEndTime
        );

        if (isAvailable) {
          console.log(`${jobseeker.user.name} is available`);
          availableJobseekers.push(jobseeker);
        } else {
          console.log(`${jobseeker.user.name} is NOT available`);
        }
      } catch (checkError) {
        console.error(`Error checking availability for jobseeker ${jobseeker._id}:`, checkError);
        // Skip this jobseeker if there's an error checking availability
      }
    }

    res.json({
      success: true,
      count: availableJobseekers.length,
      jobseekers: availableJobseekers
    });

  } catch (error) {
    console.error('Error finding available jobseekers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to find available jobseekers',
      error: error.message
    });
  }
};

// Helper function to check if a time slot is available
function checkTimeSlotAvailability(daySlots, requestedStartTime, requestedEndTime) {
  if (!daySlots || !Array.isArray(daySlots) || daySlots.length === 0) {
    return false;
  }

  // Check if the requested time falls within any of the available slots
  return daySlots.some(slot => {
    // Format times to ensure consistent comparison
    const slotStart = formatTime(slot.startTime);
    const slotEnd = formatTime(slot.endTime);
    const reqStart = formatTime(requestedStartTime);
    const reqEnd = formatTime(requestedEndTime);

    console.log(`Comparing slot ${slotStart}-${slotEnd} with request ${reqStart}-${reqEnd}`);

    // The requested time slot must be within the available slot
    return reqStart >= slotStart && reqEnd <= slotEnd;
  });
}

// Helper to standardize time format as HH:MM
function formatTime(timeStr) {
  if (!timeStr) return '00:00';

  // If timeStr has a dot instead of colon (like "09.00"), replace it
  timeStr = timeStr.replace('.', ':');

  // Ensure HH:MM format
  if (!timeStr.includes(':')) {
    // If it's a number, convert decimal hours to HH:MM
    const hours = Math.floor(parseFloat(timeStr));
    const minutes = Math.round((parseFloat(timeStr) - hours) * 60);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  // Make sure it has leading zeros
  const [hours, minutes] = timeStr.split(':');
  return `${String(parseInt(hours)).padStart(2, '0')}:${String(parseInt(minutes)).padStart(2, '0')}`;
}

/**
 * @desc    Create a Calendly scheduling link for a specific event type
 * @route   POST /api/calendly/create-scheduling-link
 * @access  Private/Jobseeker
 */
exports.createSchedulingLink = async (req, res) => {
  try {
    const { eventTypeUri } = req.body;

    if (!eventTypeUri) {
      return res.status(400).json({
        success: false,
        message: 'Event type URI is required'
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

    // Check if jobseeker has connected Calendly
    if (!jobseeker.calendlyAccessToken) {
      return res.status(400).json({
        success: false,
        message: 'Calendly account not connected'
      });
    }

    // Check if token is expired
    const now = new Date();
    if (jobseeker.calendlyTokenExpiry && new Date(jobseeker.calendlyTokenExpiry) <= now) {
      try {
        // Try to refresh the token
        const tokenData = await CalendlyService.refreshToken(jobseeker.calendlyRefreshToken);

        // Update jobseeker record with new tokens
        jobseeker.calendlyAccessToken = tokenData.access_token;
        jobseeker.calendlyRefreshToken = tokenData.refresh_token;
        jobseeker.calendlyTokenExpiry = new Date(now.getTime() + tokenData.expires_in * 1000);
        await jobseeker.save();
      } catch (refreshError) {
        return res.status(401).json({
          success: false,
          message: 'Calendly authentication expired. Please reconnect your account.',
          error: refreshError.message
        });
      }
    }

    // Create scheduling link
    const schedulingLink = await CalendlyService.createSchedulingLink(
      jobseeker.calendlyAccessToken,
      eventTypeUri
    );

    res.json({
      success: true,
      schedulingLink
    });

  } catch (error) {
    console.error('Error creating scheduling link:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create scheduling link',
      error: error.message
    });
  }
};

/**
 * Fetches Calendly availability data using their API endpoints
 * Route: GET /api/calendly/scrape/:calendlyLink
 */
exports.scrapeCalendlyData = async (req, res) => {
  try {
    // Get the encoded Calendly link from URL params
    const encodedCalendlyLink = req.params.calendlyLink;
    const month = req.query.month || new Date().toISOString().slice(0, 7); // Format: YYYY-MM

    // Decode the URL
    const calendlyUrl = decodeURIComponent(encodedCalendlyLink);

    console.log(`Fetching Calendly data for: ${calendlyUrl}`);

    // Extract username and event type from URL
    const urlParts = new URL(calendlyUrl);
    const pathParts = urlParts.pathname.split('/').filter(Boolean);

    let username = pathParts[0] || '';
    let eventType = pathParts[1] || '30min';

    // Handle direct scheduling link format (e.g., d/cm33-yxj-7jy/30-minute-meeting)
    let schedulingLinkUuid = null;
    if (pathParts[0] === 'd' && pathParts.length >= 2) {
      schedulingLinkUuid = pathParts[1];
      eventType = pathParts[2]?.replace(/-/g, ' ') || eventType;
    }

    // Step 1: First get the event type details
    let eventTypeUuid;
    let userTimezone = 'Asia/Jakarta'; // Default timezone

    if (schedulingLinkUuid) {
      // If we have a scheduling link UUID, we'll use it directly
      console.log(`Using scheduling link UUID: ${schedulingLinkUuid}`);
    } else {
      // Lookup the event type details
      console.log(`Looking up event type: ${username}/${eventType}`);

      try {
        const lookupResponse = await axios.get(
          `https://calendly.com/api/booking/event_types/lookup?event_type_slug=${encodeURIComponent(eventType)}&profile_slug=${encodeURIComponent(username)}`
        );

        if (lookupResponse.data && lookupResponse.data.uuid) {
          eventTypeUuid = lookupResponse.data.uuid;
          userTimezone = lookupResponse.data.profile?.timezone || lookupResponse.data.availability_timezone || userTimezone;
          schedulingLinkUuid = lookupResponse.data.scheduling_link?.uid || null;
        } else {
          throw new Error('Could not find event type UUID');
        }
      } catch (lookupError) {
        console.error('Error looking up event type:', lookupError);
        throw new Error('Failed to lookup event type details');
      }
    }

    if (!schedulingLinkUuid && !eventTypeUuid) {
      throw new Error('Could not determine event type or scheduling link');
    }

    // Step 2: Calculate the date range for the specified month
    const [year, monthNum] = month.split('-').map(Number);
    const lastDay = new Date(year, monthNum, 0).getDate(); // Last day of month

    const rangeStart = `${month}-01`;
    const rangeEnd = `${month}-${lastDay}`;

    // Get timezone from request or use default
    const clientTimezone = req.query.timezone ? decodeURIComponent(req.query.timezone) : userTimezone;

    console.log(`Using timezone: ${clientTimezone}`);

    // Step 3: Fetch availability for the date range
    let availabilityEndpoint;

    if (schedulingLinkUuid && eventTypeUuid) {
      // If we have both, use the event type UUID with scheduling link
      availabilityEndpoint = `https://calendly.com/api/booking/event_types/${eventTypeUuid}/calendar/range?timezone=${encodeURIComponent(clientTimezone)}&diagnostics=false&range_start=${rangeStart}&range_end=${rangeEnd}&scheduling_link_uuid=${schedulingLinkUuid}`;
    } else if (schedulingLinkUuid) {
      // If we only have scheduling link
      availabilityEndpoint = `https://calendly.com/api/booking/event_types/booking_calendar_range?timezone=${encodeURIComponent(clientTimezone)}&diagnostics=false&range_start=${rangeStart}&range_end=${rangeEnd}&scheduling_link_uuid=${schedulingLinkUuid}`;
    } else {
      // If we only have event type UUID
      availabilityEndpoint = `https://calendly.com/api/booking/event_types/${eventTypeUuid}/calendar/range?timezone=${encodeURIComponent(clientTimezone)}&diagnostics=false&range_start=${rangeStart}&range_end=${rangeEnd}`;
    }

    console.log(`Fetching availability from: ${availabilityEndpoint}`);

    const availabilityResponse = await axios.get(availabilityEndpoint);

    // Step 4: Process availability data
    const availabilityData = availabilityResponse.data;

    // Process days data directly from the API response
    const availableDates = [];

    if (availabilityData.days && Array.isArray(availabilityData.days)) {
      for (const day of availabilityData.days) {
        // Only include days with status "available" and spots
        if (day.status === 'available' && Array.isArray(day.spots) && day.spots.length > 0) {
          // Extract time slots from spots
          const timeSlots = day.spots
            .filter(spot => spot.status === 'available')
            .map(spot => {
              try {
                // The start_time string includes timezone info (e.g., "2025-03-21T10:00:00+07:00")
                // We need to handle it directly without relying on browser timezone conversion

                // First, extract just the time part using regex
                const timeMatch = spot.start_time.match(/T(\d{2}):(\d{2}):(\d{2})/);
                if (!timeMatch) return null;

                // Get hours and minutes from the match
                const hours = timeMatch[1];
                const minutes = timeMatch[2];

                // Return in HH:MM format
                return `${hours}:${minutes}`;
              } catch (e) {
                console.error("Error parsing time:", e, spot.start_time);
                return null;
              }
            })
            .filter(Boolean); // Remove any null values

          // Sort time slots chronologically
          timeSlots.sort();

          // Add to available dates
          if (timeSlots.length > 0) {
            availableDates.push({
              date: day.date,
              available: true,
              timeSlots
            });
          }
        }
      }
    }

    // Step 5: Fetch event name and duration
    // Default values
    let eventName = eventType.charAt(0).toUpperCase() + eventType.slice(1);
    if (eventType.includes('-')) {
      eventName = eventType.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    }
    let description = "";
    let duration = 30;

    // If we have event_type information in the availability response, use it
    if (availabilityData.event_type) {
      eventName = availabilityData.event_type.name || eventName;
      description = availabilityData.event_type.description || "";
      duration = availabilityData.event_type.duration || 30;
    }

    // Prepare the final data
    const calendarData = {
      eventName,
      description,
      duration,
      month,
      dates: availableDates
    };

    res.json({
      success: true,
      data: calendarData
    });

  } catch (error) {
    console.error('Error fetching Calendly data:', error);

    // Return an error response
    res.status(500).json({
      success: false,
      error: error.message || 'An error occurred while fetching availability data'
    });
  }
};
exports.checkJobseekerAvailability = async (req, res) => {
  try {
    const { jobseekerId, startTime, endTime } = req.query;

    if (!jobseekerId || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'Job seeker ID, start time, and end time are required'
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

    // Find the jobseeker
    const jobseeker = await Jobseeker.findById(jobseekerId);

    if (!jobseeker) {
      return res.status(404).json({
        success: false,
        message: 'Job seeker not found'
      });
    }

    // If jobseeker has no Calendly integration, return not available
    if (!jobseeker.calendlyAccessToken || !jobseeker.calendlyUri) {
      return res.json({
        success: true,
        available: false,
        reason: 'Job seeker does not have calendar integration'
      });
    }

    // Get the day of week from start date
    const dayIndex = startDate.getDay();
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = days[dayIndex];

    // Get the start and end time in HH:MM format
    const requestedStartTime = startDate.toTimeString().slice(0, 5); // HH:MM format
    const requestedEndTime = endDate.toTimeString().slice(0, 5); // HH:MM format

    // Get jobseeker's weekly availability
    try {
      // Check if token is expired and refresh if needed
      if (jobseeker.calendlyTokenExpiry && new Date(jobseeker.calendlyTokenExpiry) <= new Date()) {
        try {
          const tokenData = await CalendlyService.refreshToken(jobseeker.calendlyRefreshToken);

          // Update jobseeker record with new tokens
          jobseeker.calendlyAccessToken = tokenData.access_token;
          jobseeker.calendlyRefreshToken = tokenData.refresh_token;
          jobseeker.calendlyTokenExpiry = new Date(Date.now() + tokenData.expires_in * 1000);
          await jobseeker.save();
        } catch (refreshError) {
          return res.json({
            success: true,
            available: false,
            reason: 'Failed to refresh Calendly access token'
          });
        }
      }

      // Get weekly availability
      const result = await CalendlyService.getWeeklyAvailability(
        jobseeker.calendlyAccessToken,
        jobseeker.calendlyUri
      );

      const availability = result.availability || {};

      // Check availability for the requested day
      const dayAvailability = availability[dayName] || [];

      // Check if the time slot is available
      const isAvailable = checkTimeSlotAvailability(
        dayAvailability,
        requestedStartTime,
        requestedEndTime
      );

      return res.json({
        success: true,
        available: isAvailable,
        reason: isAvailable ? null : 'Time slot not available'
      });

    } catch (error) {
      console.error('Error checking jobseeker availability:', error);
      return res.json({
        success: true,
        available: false,
        reason: 'Error checking availability'
      });
    }

  } catch (error) {
    console.error('Error in check-jobseeker-availability:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};