// backend/controllers/calendlyWebhookController.js
const crypto = require('crypto');
const Jobseeker = require('../models/jobseekerModel');
const User = require('../models/userModel');
const CalendlyAvailability = require('../models/calendlyAvailabilityModel');
const CalendlyService = require('../services/calendlyService');

/**
 * Verify Calendly webhook signature based on Calendly's documentation
 * @param {Object} req - Express request object
 * @returns {boolean} Whether the signature is valid
 */
const verifySignature = (req) => {
  try {
    // Skip verification if no signing key is configured
    if (!process.env.CALENDLY_WEBHOOK_SIGNING_KEY) {
      console.warn('CALENDLY_WEBHOOK_SIGNING_KEY not defined, skipping signature verification');
      return true;
    }

    // Get the signature from headers
    const signature = req.headers['calendly-webhook-signature'];
    if (!signature) {
      console.error('No Calendly webhook signature found in headers');
      return false;
    }

    // Parse signature components (format: t=timestamp,v1=signature)
    const signatureParts = {};
    signature.split(',').forEach(part => {
      const [key, value] = part.split('=');
      signatureParts[key] = value;
    });

    // Ensure we have timestamp and signature values
    if (!signatureParts.t || !signatureParts.v1) {
      console.error('Invalid signature format, missing required components');
      return false;
    }

    // Extract timestamp and signature from the header
    const timestamp = signatureParts.t;
    const providedSignature = signatureParts.v1;

    // Optional: Check if webhook is recent (within 5 minutes)
    const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 5 * 60;
    if (parseInt(timestamp, 10) < fiveMinutesAgo) {
      console.error('Webhook timestamp is too old');
      return false;
    }

    // Get the raw body as a string
    // This should be the exact payload as sent by Calendly
    const rawBody = req.rawBody || JSON.stringify(req.body);
    
    // Create the signature string exactly as Calendly does:
    // timestamp + '.' + rawBody
    const signatureBaseString = timestamp + '.' + rawBody;
    
    // Compute expected signature using HMAC-SHA-256
    const hmac = crypto.createHmac('sha256', process.env.CALENDLY_WEBHOOK_SIGNING_KEY);
    hmac.update(signatureBaseString);
    const expectedSignature = hmac.digest('hex');
    
    // For debugging
    console.log('Timestamp:', timestamp);
    console.log('Raw Body:', rawBody.substring(0, 100) + '...');
    console.log('Signature Base String:', signatureBaseString.substring(0, 50) + '...');
    console.log('Expected Signature:', expectedSignature);
    console.log('Provided Signature:', providedSignature);

    // Compare signatures in constant time to prevent timing attacks
    try {
      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(providedSignature, 'hex')
      );
    } catch (comparisonError) {
      console.error('Error in signature comparison:', comparisonError);
      return false;
    }
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    return false;
  }
};

/**
 * Handle user availability schedule events
 * @param {Object} payload - Event payload
 */
const handleUserAvailabilityScheduleEvent = async (payload) => {
  try {
    // Get the user URI that this schedule belongs to
    const userUri = payload.resource.user;
    if (!userUri) return;

    // Find the jobseeker with this Calendly URI
    const jobseeker = await Jobseeker.findOne({ calendlyUri: userUri });
    if (!jobseeker) {
      console.log(`No jobseeker found with Calendly URI: ${userUri}`);
      return;
    }

    // Fetch the updated availability schedule
    try {
      // Refresh token if needed
      if (jobseeker.calendlyTokenExpiry && new Date(jobseeker.calendlyTokenExpiry) <= new Date()) {
        const tokenData = await CalendlyService.refreshToken(jobseeker.calendlyRefreshToken);
        jobseeker.calendlyAccessToken = tokenData.access_token;
        jobseeker.calendlyRefreshToken = tokenData.refresh_token || jobseeker.calendlyRefreshToken;
        jobseeker.calendlyTokenExpiry = new Date(Date.now() + tokenData.expires_in * 1000);
        await jobseeker.save();
      }
      
      // Get schedule details directly from the API
      const scheduleUri = payload.resource.uri;
      const scheduleDetails = await CalendlyService.getAvailabilityScheduleById(
        jobseeker.calendlyAccessToken,
        scheduleUri
      );
      
      // Update jobseeker's availability based on this schedule
      await updateJobseekerAvailability(jobseeker, scheduleDetails);
      
    } catch (error) {
      console.error(`Error fetching schedule details for jobseeker ${jobseeker._id}:`, error);
    }
  } catch (error) {
    console.error('Error handling user availability schedule event:', error);
  }
};

/**
 * Helper function to update a jobseeker's availability
 * @param {Object} jobseeker - Jobseeker document
 * @param {Object} schedule - Availability schedule from Calendly
 */
const updateJobseekerAvailability = async (jobseeker, schedule) => {
  try {
    // Create or update availability record
    let availability = await CalendlyAvailability.findOne({ jobseeker: jobseeker._id });
    
    if (!availability) {
      availability = new CalendlyAvailability({
        jobseeker: jobseeker._id,
        scheduleUri: schedule.uri,
        scheduleName: schedule.name,
        weeklyAvailability: {},
        lastUpdated: new Date()
      });
    }
    
    // Update schedule details
    availability.scheduleUri = schedule.uri;
    availability.scheduleName = schedule.name;
    availability.lastUpdated = new Date();
    
    // Process the rules to build weekly availability
    const weeklyAvailability = {
      monday: [],
      tuesday: [],
      wednesday: [],
      thursday: [],
      friday: [],
      saturday: [],
      sunday: []
    };
    
    // Process rules from the schedule
    if (schedule.rules && Array.isArray(schedule.rules)) {
      for (const rule of schedule.rules) {
        // We only care about weekly day rules (wday type)
        if (rule.type !== 'wday') continue;
        
        // Get the day of week
        const day = rule.wday?.toLowerCase();
        if (!day || !weeklyAvailability.hasOwnProperty(day)) continue;
        
        // Extract the intervals (time ranges) from the rule
        const intervals = rule.intervals;
        if (!intervals || !Array.isArray(intervals)) continue;
        
        // Add each interval to the corresponding day
        for (const interval of intervals) {
          if (interval.from && interval.to) {
            weeklyAvailability[day].push({
              startTime: interval.from,
              endTime: interval.to
            });
          }
        }
        
        // Sort the intervals for this day
        weeklyAvailability[day].sort((a, b) => 
          a.startTime.localeCompare(b.startTime)
        );
      }
    }
    
    // Update the availability record
    availability.weeklyAvailability = weeklyAvailability;
    await availability.save();
    
    console.log(`Updated availability for jobseeker ${jobseeker._id}`);
    
    // Also update the jobseeker's isAvailable flag based on whether there are any time slots
    const hasTimeSlots = Object.values(weeklyAvailability).some(day => day.length > 0);
    
    if (jobseeker.isAvailable !== hasTimeSlots) {
      jobseeker.isAvailable = hasTimeSlots;
      await jobseeker.save();
      console.log(`Updated jobseeker ${jobseeker._id} availability status to ${hasTimeSlots}`);
    }
  } catch (error) {
    console.error(`Error updating availability for jobseeker ${jobseeker._id}:`, error);
  }
};

/**
 * Handle Calendly webhook events
 * @route   POST /api/calendly/webhook
 * @access  Public
 */
exports.handleWebhook = async (req, res) => {
  try {
    console.log('⭐ WEBHOOK RECEIVED ⭐');
    console.log('Headers:', JSON.stringify(req.headers));
    console.log('Signature Header:', req.headers['calendly-webhook-signature']);
    
    // Log the raw body (but truncate it if very large)
    const rawBodyPreview = req.rawBody?.substring(0, 200) + 
      (req.rawBody?.length > 200 ? '...' : '');
    console.log('Raw Body (preview):', rawBodyPreview);
    
    // Verify the signature
    const isValid = verifySignature(req);
    console.log('🔑 Signature verification result:', isValid ? '✅ VALID' : '❌ INVALID');
    
    // Always respond with 200 OK for webhook ping/test calls from Calendly
    // These typically don't have a proper event structure
    if (!req.body || !req.body.event) {
      console.log('No event in body, likely a ping/test call');
      return res.status(200).json({ received: true, message: 'Webhook received' });
    }
    
    // Skip processing if signature is invalid
    if (!isValid && process.env.CALENDLY_WEBHOOK_SIGNING_KEY) {
      console.error('❌ Webhook signature verification failed');
      return res.status(200).json({
        success: false,
        message: 'Invalid signature'
      });
    }

    const event = req.body;
    console.log('Processing Calendly webhook event:', event.event);
    console.log('Event payload:', JSON.stringify(event.payload).substring(0, 200) + '...');

    // Handle different event types
    switch (event.event) {
      case 'user.created':
      case 'user.updated':
        await handleUserEvent(event.payload);
        break;

      case 'invitee.created':
      case 'invitee.canceled':
        await handleInviteeEvent(event.payload);
        break;

      case 'scheduling_link.created':
      case 'scheduling_link.deleted':
        await handleSchedulingLinkEvent(event.payload);
        break;
        
      case 'availability_rule.created':
      case 'availability_rule.updated':
      case 'availability_rule.deleted':
        await handleAvailabilityRuleEvent(event.payload);
        break;
        
      case 'user_availability_schedule.created':
      case 'user_availability_schedule.updated':
      case 'user_availability_schedule.deleted':
        await handleUserAvailabilityScheduleEvent(event.payload);
        break;

      default:
        console.log(`Unhandled event type: ${event.event}`);
    }

    // Always respond with 200 OK to acknowledge receipt
    res.status(200).json({ received: true, success: true });
  } catch (error) {
    console.error('Error handling Calendly webhook:', error);
    // Still respond with 200 OK to acknowledge receipt
    res.status(200).json({ received: true, success: false, error: error.message });
  }
};

/**
 * Handle user events (user.created, user.updated)
 * @param {Object} payload - Event payload
 */
const handleUserEvent = async (payload) => {
  try {
    // Get the Calendly URI of the user
    const calendlyUri = payload.uri;
    if (!calendlyUri) {
      console.error('No Calendly URI in payload');
      return;
    }

    // Find the jobseeker with this Calendly URI
    const jobseeker = await Jobseeker.findOne({ calendlyUri });
    if (!jobseeker) {
      console.log(`No jobseeker found with Calendly URI: ${calendlyUri}`);
      return;
    }

    // Update the jobseeker's Calendly information
    jobseeker.calendlyLink = payload.scheduling_url;
    await jobseeker.save();

    console.log(`Updated jobseeker ${jobseeker._id} with new Calendly info`);
  } catch (error) {
    console.error('Error handling user event:', error);
  }
};

/**
 * Handle invitee events (invitee.created, invitee.canceled)
 * @param {Object} payload - Event payload
 */
const handleInviteeEvent = async (payload) => {
  try {
    // Get the Calendly URIs
    const eventUri = payload.event;
    const inviteeUri = payload.uri;

    // Check if this relates to a booking in our system
    // This would typically involve checking if the event or booking has the 
    // necessary information to connect it to our booking system
    
    // For now, we'll just log the event
    console.log(`Received invitee event for event: ${eventUri}`);
  } catch (error) {
    console.error('Error handling invitee event:', error);
  }
};

/**
 * Handle scheduling link events
 * @param {Object} payload - Event payload
 */
const handleSchedulingLinkEvent = async (payload) => {
  try {
    // Get the owner URI (user or event type)
    const ownerUri = payload.owner;
    const ownerType = payload.owner_type;

    // If the owner is a user, update the jobseeker record
    if (ownerType === 'User') {
      const jobseeker = await Jobseeker.findOne({ calendlyUri: ownerUri });
      if (jobseeker) {
        // Store scheduling link information
        jobseeker.schedulingLinks = jobseeker.schedulingLinks || [];
        
        if (payload.event === 'scheduling_link.created') {
          // Add the link if it doesn't exist
          if (!jobseeker.schedulingLinks.some(link => link.uri === payload.uri)) {
            jobseeker.schedulingLinks.push({
              uri: payload.uri,
              booking_url: payload.booking_url
            });
          }
        } else if (payload.event === 'scheduling_link.deleted') {
          // Remove the link
          jobseeker.schedulingLinks = jobseeker.schedulingLinks.filter(
            link => link.uri !== payload.uri
          );
        }
        
        await jobseeker.save();
        console.log(`Updated scheduling links for jobseeker ${jobseeker._id}`);
      }
    }
  } catch (error) {
    console.error('Error handling scheduling link event:', error);
  }
};

/**
 * Handle availability rule events
 * @param {Object} payload - Event payload
 */
const handleAvailabilityRuleEvent = async (payload) => {
  try {
    // Get the schedule ID that this rule belongs to
    const scheduleUri = payload.schedule;
    if (!scheduleUri) return;

    // Find the jobseeker with this schedule
    // We need to query the Calendly API to get the user that owns this schedule
    // For now, let's assume we've stored the schedule ID with the jobseeker
    const jobseekers = await Jobseeker.find({ calendlyAccessToken: { $exists: true } });
    
    // For each jobseeker with Calendly connected, check if this is their schedule
    for (const jobseeker of jobseekers) {
      if (!jobseeker.calendlyAccessToken) continue;
      
      try {
        // Refresh token if needed
        if (jobseeker.calendlyTokenExpiry && new Date(jobseeker.calendlyTokenExpiry) <= new Date()) {
          const tokenData = await CalendlyService.refreshToken(jobseeker.calendlyRefreshToken);
          jobseeker.calendlyAccessToken = tokenData.access_token;
          jobseeker.calendlyRefreshToken = tokenData.refresh_token || jobseeker.calendlyRefreshToken;
          jobseeker.calendlyTokenExpiry = new Date(Date.now() + tokenData.expires_in * 1000);
          await jobseeker.save();
        }
        
        // Get all schedules for this user
        const schedules = await CalendlyService.getUserAvailabilitySchedules(
          jobseeker.calendlyAccessToken,
          jobseeker.calendlyUri
        );
        
        // Check if this schedule belongs to this user
        const matchingSchedule = schedules.find(schedule => schedule.uri === scheduleUri);
        
        if (matchingSchedule) {
          // This schedule belongs to this jobseeker - update availability
          await updateJobseekerAvailability(jobseeker, matchingSchedule);
          break; // Found the matching jobseeker, no need to continue
        }
      } catch (error) {
        console.error(`Error checking schedules for jobseeker ${jobseeker._id}:`, error);
      }
    }
  } catch (error) {
    console.error('Error handling availability rule event:', error);
  }
};