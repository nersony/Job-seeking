// backend/controllers/calendlyApiController.js
const axios = require('axios');
const Jobseeker = require('../models/jobseekerModel');

/**
 * Get jobseeker's Calendly event types
 * @route   GET /api/calendly/event-types
 * @access  Private/Jobseeker
 */
exports.getEventTypes = async (req, res) => {
  try {
    const jobseeker = await Jobseeker.findOne({ user: req.user._id });
    
    if (!jobseeker || !jobseeker.calendlyAccessToken) {
      return res.status(400).json({
        success: false,
        message: 'Not connected to Calendly'
      });
    }
    
    // Check if token is expired and needs refresh
    if (jobseeker.calendlyTokenExpiry && new Date(jobseeker.calendlyTokenExpiry) <= new Date()) {
      return res.status(401).json({
        success: false,
        message: 'Calendly token expired',
        needsRefresh: true
      });
    }
    
    // Get user's URI from stored value or fetch it
    const userUri = jobseeker.calendlyUri;
    if (!userUri) {
      return res.status(400).json({
        success: false,
        message: 'Calendly user URI not found'
      });
    }
    
    // Fetch event types
    const response = await axios.get(`https://api.calendly.com/event_types`, {
      params: {
        user: userUri
      },
      headers: {
        'Authorization': `Bearer ${jobseeker.calendlyAccessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    res.json({
      success: true,
      eventTypes: response.data.collection
    });
    
  } catch (error) {
    console.error('Error fetching Calendly event types:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch event types'
    });
  }
};

/**
 * Update jobseeker's selected event types
 * @route   PUT /api/calendly/selected-events
 * @access  Private/Jobseeker
 */
exports.updateSelectedEvents = async (req, res) => {
  try {
    const { selectedEventTypeUris } = req.body;
    
    if (!selectedEventTypeUris || !Array.isArray(selectedEventTypeUris)) {
      return res.status(400).json({
        success: false,
        message: 'Selected event types are required'
      });
    }
    
    const jobseeker = await Jobseeker.findOne({ user: req.user._id });
    
    if (!jobseeker) {
      return res.status(404).json({
        success: false,
        message: 'Jobseeker profile not found'
      });
    }
    
    // Update selected event types
    jobseeker.selectedEventTypes = selectedEventTypeUris;
    await jobseeker.save();
    
    res.json({
      success: true,
      message: 'Selected event types updated successfully'
    });
    
  } catch (error) {
    console.error('Error updating selected event types:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update selected event types'
    });
  }
};

/**
 * Get availability for a specific date range
 * @route   GET /api/calendly/availability
 * @access  Public
 */
exports.getAvailability = async (req, res) => {
  try {
    const { jobseekerId, startDate, endDate } = req.query;
    
    if (!jobseekerId || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Job seeker ID, start date, and end date are required'
      });
    }
    
    const jobseeker = await Jobseeker.findById(jobseekerId);
    
    if (!jobseeker || !jobseeker.calendlyAccessToken) {
      return res.status(404).json({
        success: false,
        message: 'Job seeker not found or not connected to Calendly'
      });
    }
    
    // Get user's selected event types
    const eventTypes = jobseeker.selectedEventTypes || [];
    
    if (eventTypes.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No event types selected by the job seeker'
      });
    }
    
    // Format dates for API
    const start = new Date(startDate);
    const end = new Date(endDate);
    const formattedStartDate = start.toISOString().split('T')[0];
    const formattedEndDate = end.toISOString().split('T')[0];
    
    // Get availability for each event type
    const availabilityPromises = eventTypes.map(async (eventTypeUri) => {
      const response = await axios.get(`https://api.calendly.com/scheduling_links`, {
        params: {
          owner: jobseeker.calendlyUri,
          owner_type: 'User',
          event_type: eventTypeUri
        },
        headers: {
          'Authorization': `Bearer ${jobseeker.calendlyAccessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Get first scheduling link for the event type
      if (response.data.collection.length > 0) {
        const schedulingLink = response.data.collection[0];
        
        // Use the public scraper endpoint for availability
        const availabilityResponse = await axios.get(`/api/calendly/scrape/${encodeURIComponent(schedulingLink.booking_url)}`, {
          params: {
            month: formattedStartDate.substring(0, 7) // YYYY-MM format
          }
        });
        
        return {
          eventTypeUri,
          eventName: availabilityResponse.data.data.eventName,
          duration: availabilityResponse.data.data.duration,
          dates: availabilityResponse.data.data.dates
        };
      }
      
      return {
        eventTypeUri,
        dates: []
      };
    });
    
    const availabilityResults = await Promise.all(availabilityPromises);
    
    // Process results and combine availability
    const combinedAvailability = {};
    
    availabilityResults.forEach(result => {
      result.dates.forEach(date => {
        if (date.available) {
          if (!combinedAvailability[date.date]) {
            combinedAvailability[date.date] = {
              date: date.date,
              timeSlots: [],
              eventTypes: []
            };
          }
          
          // Add time slots to combined results
          date.timeSlots.forEach(timeSlot => {
            if (!combinedAvailability[date.date].timeSlots.includes(timeSlot)) {
              combinedAvailability[date.date].timeSlots.push(timeSlot);
            }
          });
          
          // Add event type info
          combinedAvailability[date.date].eventTypes.push({
            uri: result.eventTypeUri,
            name: result.eventName,
            duration: result.duration
          });
        }
      });
    });
    
    // Convert to array and sort by date
    const availability = Object.values(combinedAvailability).sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    );
    
    res.json({
      success: true,
      jobseekerId,
      availability
    });
    
  } catch (error) {
    console.error('Error fetching availability:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch availability'
    });
  }
};

/**
 * Check if jobseekers are available in a specific time range
 * @route   GET /api/calendly/check-availability
 * @access  Public
 */
exports.checkAvailability = async (req, res) => {
  try {
    const { startDateTime, endDateTime, serviceCategory } = req.query;
    
    if (!startDateTime || !endDateTime) {
      return res.status(400).json({
        success: false,
        message: 'Start and end date/time are required'
      });
    }
    
    // Find all jobseekers with the requested service category
    const query = { isAvailable: true };
    if (serviceCategory) {
      query.serviceCategory = serviceCategory;
    }
    
    const jobseekers = await Jobseeker.find(query).populate({
      path: 'user',
      select: 'name email phone'
    });
    
    if (jobseekers.length === 0) {
      return res.json({
        success: true,
        availableJobseekers: []
      });
    }
    
    // Check availability for each jobseeker
    const startDate = new Date(startDateTime).toISOString().split('T')[0];
    const endDate = new Date(endDateTime).toISOString().split('T')[0];
    const requestedStartTime = new Date(startDateTime).toTimeString().slice(0, 5); // HH:MM format
    const requestedEndTime = new Date(endDateTime).toTimeString().slice(0, 5); // HH:MM format
    const requestedDate = startDate; // We only check availability for the start date
    
    const availabilityChecks = jobseekers.map(async (jobseeker) => {
      // Skip jobseekers without Calendly integration
      if (!jobseeker.calendlyLink || !jobseeker.calendlyAccessToken) {
        return {
          jobseeker,
          available: false,
          reason: 'No calendar integration'
        };
      }
      
      try {
        // Use scrape endpoint to get availability for the requested date
        const encodedLink = encodeURIComponent(jobseeker.calendlyLink);
        const response = await axios.get(`/api/calendly/scrape/${encodedLink}`, {
          params: {
            month: requestedDate.substring(0, 7) // YYYY-MM format
          }
        });
        
        const availabilityData = response.data.data;
        
        // Find the requested date in availability
        const dateAvailability = availabilityData.dates.find(d => d.date === requestedDate);
        
        // If no availability for the date, return not available
        if (!dateAvailability || !dateAvailability.available || !dateAvailability.timeSlots || dateAvailability.timeSlots.length === 0) {
          return {
            jobseeker,
            available: false,
            reason: 'Date not available'
          };
        }
        
        // Check if there are time slots that cover the requested time range
        // This is a simplified check - in a real implementation, you would need to 
        // check if there's an event type with a duration that can accommodate the requested duration
        
        // Get start time slots that are before or at the requested start time
        const availableTimeSlots = dateAvailability.timeSlots;
        let foundTimeSlot = false;
        
        // Simple check: if the exact requested start time is in the available slots
        if (availableTimeSlots.includes(requestedStartTime)) {
          foundTimeSlot = true;
        }
        
        return {
          jobseeker,
          available: foundTimeSlot,
          reason: foundTimeSlot ? null : 'No matching time slot'
        };
      } catch (error) {
        console.error(`Error checking availability for jobseeker ${jobseeker._id}:`, error);
        return {
          jobseeker,
          available: false,
          reason: 'Error checking availability'
        };
      }
    });
    
    const availabilityResults = await Promise.all(availabilityChecks);
    
    // Filter to only available jobseekers
    const availableJobseekers = availabilityResults
      .filter(result => result.available)
      .map(result => result.jobseeker);
    
    res.json({
      success: true,
      availableJobseekers
    });
    
  } catch (error) {
    console.error('Error checking jobseekers availability:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check availability'
    });
  }
};