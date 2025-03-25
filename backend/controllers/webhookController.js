// backend/controllers/webhookController.js
exports.handleWebhook = async (req, res) => {
    try {
        // Verify webhook signature if you have signing key configured
        // This ensures the request is actually from Calendly
        if (process.env.CALENDLY_WEBHOOK_SIGNING_KEY) {
            const signature = req.headers['calendly-webhook-signature'];
            // Verify signature logic here
        }

        // Get the event information
        const event = req.body;
        console.log('Received webhook event:', event.event);

        // Handle availability-related events
        if (event.event.startsWith('user_availability_schedule') ||
            event.event.startsWith('availability_rule')) {

            // Extract user URI
            let userUri;

            if (event.event.startsWith('user_availability_schedule')) {
                userUri = event.payload.resource.user;
            } else {
                // For availability_rule events, we need to get the schedule first
                const scheduleUri = event.payload.schedule;
                // You need to fetch the schedule to get the user
                // This requires an API call to Calendly

                // For immediate response, use a queue or background job
                // to process this asynchronously

                // For this example, we'll add it to a processing queue
                await processAvailabilityRuleEvent(event);

                // Send response immediately
                return res.status(200).json({ received: true });
            }

            if (userUri) {
                // Find the jobseeker with this Calendly URI
                const jobseeker = await Jobseeker.findOne({ calendlyUri: userUri });

                if (jobseeker) {
                    // Update availability asynchronously
                    updateJobseekerAvailability(jobseeker).catch(err => {
                        console.error('Error updating availability:', err);
                    });
                }
            }
        }

        // Always respond with 200 OK to acknowledge receipt
        res.status(200).json({ received: true });
    } catch (error) {
        console.error('Error handling webhook:', error);
        // Still respond with 200 OK to acknowledge receipt
        res.status(200).json({ received: true, error: error.message });
    }
};

// Function to update jobseeker availability
async function updateJobseekerAvailability(jobseeker) {
    try {
        // Refresh token if needed
        if (jobseeker.calendlyTokenExpiry && new Date(jobseeker.calendlyTokenExpiry) <= new Date()) {
            const response = await axios.post('https://auth.calendly.com/oauth/token', {
                client_id: process.env.CALENDLY_CLIENT_ID,
                client_secret: process.env.CALENDLY_CLIENT_SECRET,
                refresh_token: jobseeker.calendlyRefreshToken,
                grant_type: 'refresh_token'
            }, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            jobseeker.calendlyAccessToken = response.data.access_token;
            jobseeker.calendlyRefreshToken = response.data.refresh_token || jobseeker.calendlyRefreshToken;
            jobseeker.calendlyTokenExpiry = new Date(Date.now() + response.data.expires_in * 1000);
            await jobseeker.save();
        }

        // Fetch availability schedules
        const availabilityResult = await axios.get('https://api.calendly.com/user_availability_schedules', {
            params: {
                user: jobseeker.calendlyUri
            },
            headers: {
                'Authorization': `Bearer ${jobseeker.calendlyAccessToken}`,
                'Content-Type': 'application/json'
            }
        });

        // Rest of the implementation to process and save availability
        // Similar to the manual sync endpoint

        console.log(`Updated availability for jobseeker ${jobseeker._id}`);
    } catch (error) {
        console.error(`Error updating availability for jobseeker ${jobseeker._id}:`, error);
        throw error;
    }
}

// Function to process availability rule events
async function processAvailabilityRuleEvent(event) {
    // Process in background or queue
    // Implementation depends on your architecture
}