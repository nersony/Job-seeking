// backend/controllers/calendlySetupController.js
exports.setupWebhooks = async (req, res) => {
    try {
      const jobseeker = await Jobseeker.findOne({ user: req.user._id });
      
      if (!jobseeker || !jobseeker.calendlyAccessToken || !jobseeker.calendlyUri) {
        return res.status(400).json({
          success: false,
          message: 'Calendly not connected'
        });
      }
      
      // Define your webhook URL - must be publicly accessible
      const webhookUrl = `${process.env.API_BASE_URL}/api/calendly/webhook`;
      
      // Events to subscribe to for availability changes
      const events = [
        'user_availability_schedule.created',
        'user_availability_schedule.updated',
        'user_availability_schedule.deleted',
        'availability_rule.created',
        'availability_rule.updated',
        'availability_rule.deleted'
      ];
      
      // Extract organization URI from user URI
      const orgUri = jobseeker.calendlyUri.replace('users', 'organizations');
      
      // Create webhook subscription
      const response = await axios.post('https://api.calendly.com/webhook_subscriptions', {
        url: webhookUrl,
        events,
        organization: orgUri,
        scope: 'organization'
      }, {
        headers: {
          'Authorization': `Bearer ${jobseeker.calendlyAccessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Save webhook information to jobseeker record
      jobseeker.calendlyWebhooks = jobseeker.calendlyWebhooks || [];
      jobseeker.calendlyWebhooks.push({
        uri: response.data.resource.uri,
        events: events
      });
      
      await jobseeker.save();
      
      res.json({
        success: true,
        message: 'Webhook subscription created successfully',
        webhook: response.data.resource
      });
    } catch (error) {
      console.error('Error setting up webhook:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to set up webhook',
        error: error.message
      });
    }
  };