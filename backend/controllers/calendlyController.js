// backend/controllers/calendlyController.js
const axios = require('axios');

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