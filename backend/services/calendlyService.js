// backend/services/calendlyService.js (Updated)
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
    static async getUserAvailabilitySchedules(accessToken, userUri) {
        try {
            const response = await axios.get('https://api.calendly.com/user_availability_schedules', {
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
            console.error('Error fetching availability schedules:', error.response?.data || error.message);
            throw new Error('Failed to fetch Calendly availability schedules');
        }
    }

    /**
     * Get a specific availability schedule by ID
     * @param {string} accessToken - Calendly access token
     * @param {string} scheduleUri - Availability schedule URI
     * @returns {Promise<Object>} Schedule details
     */
    static async getAvailabilityScheduleById(accessToken, scheduleUri) {
        try {
            const response = await axios.get(scheduleUri, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            return response.data.resource;
        } catch (error) {
            console.error('Error fetching availability schedule:', error.response?.data || error.message);
            throw new Error('Failed to fetch Calendly schedule');
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
            if (!process.env.CALENDLY_CLIENT_ID || !process.env.CALENDLY_CLIENT_SECRET) {
                throw new Error('Calendly client credentials not configured');
            }

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
    static async getWeeklyAvailability(accessToken, userUri) {
        try {
            // Check if we have this data stored in the local database first
            // This implementation would be added when we integrate with the database

            // Fall back to API call if not available in local database
            const availabilitySchedules = await this.getUserAvailabilitySchedules(accessToken, userUri);

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

            // Get the full schedule details
            const scheduleDetails = await this.getAvailabilityScheduleById(accessToken, scheduleToUse.uri);

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

            // Process the rules from the schedule
            if (scheduleDetails.rules && Array.isArray(scheduleDetails.rules)) {
                scheduleDetails.rules.forEach(rule => {
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

    /**
     * Register a webhook subscription with Calendly
     * @param {string} accessToken - Calendly access token
     * @param {string} userUri - User's Calendly URI
     * @param {string} webhookUrl - URL to receive webhook events
     * @param {Array} events - List of event types to subscribe to
     * @returns {Promise<Object>} Webhook subscription details
     */
    static async createWebhookSubscription(accessToken, userUri, webhookUrl, events) {
        try {
            const response = await axios.post('https://api.calendly.com/webhook_subscriptions', {
                url: webhookUrl,
                events: events,
                organization: userUri.replace('users', 'organizations'),
                scope: 'organization'
            }, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            return response.data.resource;
        } catch (error) {
            console.error('Error creating webhook subscription:', error.response?.data || error.message);
            throw new Error('Failed to create Calendly webhook subscription');
        }
    }

    /**
     * Get list of webhook subscriptions
     * @param {string} accessToken - Calendly access token
     * @param {string} organizationUri - Organization URI
     * @returns {Promise<Array>} List of webhook subscriptions
     */
    static async getWebhookSubscriptions(accessToken, organizationUri) {
        try {
            const response = await axios.get('https://api.calendly.com/webhook_subscriptions', {
                params: {
                    organization: organizationUri,
                    scope: 'organization'
                },
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            return response.data.collection;
        } catch (error) {
            console.error('Error fetching webhook subscriptions:', error.response?.data || error.message);
            throw new Error('Failed to fetch Calendly webhook subscriptions');
        }
    }

    /**
     * Delete a webhook subscription
     * @param {string} accessToken - Calendly access token
     * @param {string} webhookUri - Webhook subscription URI
     * @returns {Promise<boolean>} Success status
     */
    static async deleteWebhookSubscription(accessToken, webhookUri) {
        try {
            await axios.delete(webhookUri, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            return true;
        } catch (error) {
            console.error('Error deleting webhook subscription:', error.response?.data || error.message);
            throw new Error('Failed to delete Calendly webhook subscription');
        }
    }
}

module.exports = CalendlyService;