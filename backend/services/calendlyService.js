// backend/services/calendlyService.js
const axios = require('axios');

/**
 * Service for interacting with Calendly API
 */
class CalendlyService {
    /**
     * Get user details from Calendly API
     * @param {string} accessToken - Calendly access token
     * @returns {Promise<Object>} User details
     */
    static async getUser(accessToken) {
        try {
            const response = await axios.get('https://api.calendly.com/users/me', {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            return response.data.resource;
        } catch (error) {
            console.error('Error fetching Calendly user:', error.response?.data || error.message);
            throw new Error('Failed to fetch Calendly user data');
        }
    }

    /**
     * Get user's availability schedules
     * @param {string} accessToken - Calendly access token
     * @param {string} userUri - User's Calendly URI
     * @returns {Promise<Array>} User's schedules
     */
    static async getAvailabilitySchedules(accessToken, userUri) {
        try {
            // First get user's event types
            const eventTypes = await this.getEventTypes(accessToken, userUri);

            if (!eventTypes || eventTypes.length === 0) {
                return [];
            }

            // For each event type, get scheduling link
            const schedulingLinks = [];
            for (const eventType of eventTypes) {
                if (eventType.active) {
                    try {
                        // Get scheduling link for this event type
                        const response = await axios.get(`https://api.calendly.com/scheduling_links`, {
                            params: {
                                owner: eventType.uri,
                                owner_type: 'EventType'
                            },
                            headers: {
                                'Authorization': `Bearer ${accessToken}`,
                                'Content-Type': 'application/json'
                            }
                        });

                        if (response.data.collection && response.data.collection.length > 0) {
                            schedulingLinks.push({
                                eventType,
                                schedulingLink: response.data.collection[0]
                            });
                        }
                    } catch (linkError) {
                        console.warn(`Could not get scheduling link for event type ${eventType.name}:`, linkError.message);
                    }
                }
            }

            return schedulingLinks;
        } catch (error) {
            console.error('Error fetching availability schedules:', error.response?.data || error.message);
            throw new Error('Failed to fetch Calendly availability schedules');
        }
    }

    /**
     * Get user's event types
     * @param {string} accessToken - Calendly access token
     * @param {string} userUri - User's Calendly URI
     * @returns {Promise<Array>} User's event types
     */
    static async getEventTypes(accessToken, userUri) {
        try {
            const response = await axios.get('https://api.calendly.com/event_types', {
                params: {
                    user: userUri
                },
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            return response.data.collection;
        } catch (error) {
            console.error('Error fetching event types:', error.response?.data || error.message);
            throw new Error('Failed to fetch Calendly event types');
        }
    }

    /**
     * Get available times for a specific date range
     * @param {string} accessToken - Calendly access token 
     * @param {string} eventTypeUri - Event Type URI
     * @param {string} startTime - ISO date string for start of range
     * @param {string} endTime - ISO date string for end of range
     * @returns {Promise<Array>} Available time slots
     */
    static async getAvailableTimes(accessToken, eventTypeUri, startTime, endTime) {
        try {
            const response = await axios.get(`https://api.calendly.com/event_type_available_times`, {
                params: {
                    event_type: eventTypeUri,
                    start_time: startTime,
                    end_time: endTime
                },
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            return response.data.collection;
        } catch (error) {
            console.error('Error fetching available times:', error.response?.data || error.message);
            throw new Error('Failed to fetch Calendly available times');
        }
    }

    /**
     * Check if a user is available at a specific time
     * @param {string} accessToken - Calendly access token
     * @param {string} userUri - User's Calendly URI
     * @param {string} startTime - ISO date string
     * @param {string} endTime - ISO date string
     * @returns {Promise<boolean>} Whether the user is available
     */
    static async isAvailable(accessToken, userUri, startTime, endTime) {
        try {
            // First, we need to get the user's event types
            const eventTypes = await this.getEventTypes(accessToken, userUri);

            if (!eventTypes || eventTypes.length === 0) {
                return false;
            }

            // Use the first active event type to check availability
            const activeEventType = eventTypes.find(et => et.active);

            if (!activeEventType) {
                return false;
            }

            // Convert the dates to ISO format if they aren't already
            const start = new Date(startTime).toISOString();
            const end = new Date(endTime).toISOString();

            // Check available times for this event type
            const availableTimes = await this.getAvailableTimes(
                accessToken,
                activeEventType.uri,
                start,
                end
            );

            // If there are any available times, the user is available
            return availableTimes && availableTimes.length > 0;
        } catch (error) {
            console.error('Error checking availability:', error);
            return false;
        }
    }

    /**
     * Refresh Calendly access token
     * @param {string} refreshToken - Calendly refresh token
     * @returns {Promise<Object>} New token data
     */
    static async refreshToken(refreshToken) {
        try {
            const response = await axios.post('https://auth.calendly.com/oauth/token', {
                client_id: process.env.CALENDLY_CLIENT_ID,
                client_secret: process.env.CALENDLY_CLIENT_SECRET,
                refresh_token: refreshToken,
                grant_type: 'refresh_token'
            }, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            return {
                access_token: response.data.access_token,
                refresh_token: response.data.refresh_token || refreshToken, // Use new refresh token if provided
                expires_in: response.data.expires_in
            };
        } catch (error) {
            console.error('Error refreshing Calendly token:', error.response?.data || error.message);
            throw new Error('Failed to refresh Calendly token');
        }
    }

    /**
     * Create a scheduling link for an event type
     * @param {string} accessToken - Calendly access token
     * @param {string} eventTypeUri - Event Type URI
     * @returns {Promise<Object>} Scheduling link data
     */
    static async createSchedulingLink(accessToken, eventTypeUri) {
        try {
            const response = await axios.post('https://api.calendly.com/scheduling_links', {
                max_event_count: 1,
                owner: eventTypeUri,
                owner_type: 'EventType'
            }, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            return response.data.resource;
        } catch (error) {
            console.error('Error creating scheduling link:', error.response?.data || error.message);
            throw new Error('Failed to create Calendly scheduling link');
        }
    }

    /**
     * Format Calendly available times into a more usable structure
     * @param {Array} availableTimes - Available times from Calendly API
     * @returns {Object} Formatted availability by date
     */
    static formatAvailability(availableTimes) {
        if (!availableTimes || availableTimes.length === 0) {
            return {};
        }

        const availability = {};

        availableTimes.forEach(slot => {
            const date = new Date(slot.start_time).toISOString().split('T')[0];
            const startTime = new Date(slot.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const endTime = new Date(slot.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            if (!availability[date]) {
                availability[date] = [];
            }

            availability[date].push({
                startTime,
                endTime,
                inviteeUriFragment: slot.invitee_uri_fragment
            });
        });

        return availability;
    }

    /**
     * Get weekly availability schedule from Calendly
     * @param {string} accessToken - Calendly access token
     * @param {string} userUri - User's Calendly URI
     * @returns {Promise<Object>} Weekly availability structure
     */
    // Updated method in CalendlyService.js
    static async getWeeklyAvailability(accessToken, userUri) {
        try {
            // Get the user's availability schedules using the correct endpoint
            const response = await axios.get('https://api.calendly.com/user_availability_schedules', {
                params: {
                    user: userUri
                },
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            // Extract availability schedules from the response
            const availabilitySchedules = response.data.collection || [];

            if (availabilitySchedules.length === 0) {
                return {
                    scheduleName: 'Default Schedule',
                    availability: this.getDefaultAvailability()
                };
            }

            // First look for a schedule named "jobseeker"
            let scheduleToUse = availabilitySchedules.find(s =>
                s.name && s.name.toLowerCase() === 'jobseeker'
            );

            // If no "jobseeker" schedule, fall back to the default one
            if (!scheduleToUse) {
                scheduleToUse = availabilitySchedules.find(s => s.default) || availabilitySchedules[0];
            }

            // Initialize weekly schedule
            const weeklySchedule = {
                monday: [],
                tuesday: [],
                wednesday: [],
                thursday: [],
                friday: [],
                saturday: [],
                sunday: []
            };

            // Process the rules from the availability schedule
            if (scheduleToUse.rules && Array.isArray(scheduleToUse.rules)) {
                scheduleToUse.rules.forEach(rule => {
                    // We only care about weekly day rules (wday type)
                    if (rule.type !== 'wday') return;

                    // Get the day of week
                    const day = rule.wday;
                    if (!day) return;

                    // Map Calendly's day name to our day format
                    const dayName = day.toLowerCase();
                    if (!weeklySchedule.hasOwnProperty(dayName)) return;

                    // Extract the intervals (time ranges) from the rule
                    const intervals = rule.intervals;
                    if (!intervals || !Array.isArray(intervals)) return;

                    // Add each interval to the corresponding day
                    intervals.forEach(interval => {
                        if (interval.from && interval.to) {
                            weeklySchedule[dayName].push({
                                startTime: interval.from,
                                endTime: interval.to
                            });
                        }
                    });

                    // Sort the intervals for this day
                    weeklySchedule[dayName].sort((a, b) =>
                        a.startTime.localeCompare(b.startTime)
                    );
                });
            }

            return {
                scheduleName: scheduleToUse.name || 'Availability Schedule',
                availability: weeklySchedule
            };
        } catch (error) {
            console.error('Error getting weekly availability:', error);
            throw new Error('Failed to get weekly availability');
        }
    }

    // Helper function to format Calendly time strings (convert from seconds to HH:MM)
    static formatTime(seconds) {
        if (typeof seconds !== 'number') return null;

        // Convert seconds to hours and minutes
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);

        // Format as HH:MM
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }

    // Default availability as fallback
    static getDefaultAvailability() {
        return {
            monday: [{ startTime: '09:00', endTime: '17:00' }],
            tuesday: [{ startTime: '09:00', endTime: '17:00' }],
            wednesday: [{ startTime: '09:00', endTime: '17:00' }],
            thursday: [{ startTime: '09:00', endTime: '17:00' }],
            friday: [{ startTime: '09:00', endTime: '17:00' }],
            saturday: [],
            sunday: []
        };
    }
    static async getSimpleWeeklyAvailability(accessToken, userUri) {
        try {
            // Initialize a basic weekly schedule
            const weeklySchedule = {
                monday: [],
                tuesday: [],
                wednesday: [],
                thursday: [],
                friday: [],
                saturday: [],
                sunday: []
            };

            // For a simple approach, create proper time ranges
            const businessDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
            const weekendDays = ['saturday'];

            // For weekdays (Mon-Fri), set 9 AM to 5 PM
            businessDays.forEach(day => {
                weeklySchedule[day] = [
                    { startTime: '09:00', endTime: '17:00' }
                ];
            });

            // For Saturday, set 9 AM to 5 PM
            weekendDays.forEach(day => {
                weeklySchedule[day] = [
                    { startTime: '09:00', endTime: '17:00' }
                ];
            });

            // Sunday is typically off, leaving it empty

            return weeklySchedule;
        } catch (error) {
            console.error('Error getting simple weekly availability:', error);
            throw new Error('Failed to get simple weekly availability');
        }
    }
    /**
     * Group time slots into ranges
     * @param {Array} timeSlots - Individual time slots
     * @returns {Array} Combined time ranges
     */
    static groupTimeSlots(timeSlots) {
        if (!timeSlots || timeSlots.length === 0) {
            return [];
        }

        // Sort time slots by start time
        timeSlots.sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

        const ranges = [];
        let currentRange = {
            startTime: new Date(timeSlots[0].start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            endTime: new Date(timeSlots[0].end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        for (let i = 1; i < timeSlots.length; i++) {
            const currentSlot = timeSlots[i];
            const currentEndTime = new Date(timeSlots[i - 1].end_time);
            const nextStartTime = new Date(currentSlot.start_time);

            // If slots are adjacent (within 1 minute)
            if (nextStartTime - currentEndTime <= 60000) {
                // Update end time of current range
                currentRange.endTime = new Date(currentSlot.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            } else {
                // Add current range to results and start a new one
                ranges.push(currentRange);
                currentRange = {
                    startTime: new Date(currentSlot.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    endTime: new Date(currentSlot.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                };
            }
        }

        // Add the last range
        ranges.push(currentRange);

        return ranges;
    }
}

module.exports = CalendlyService;