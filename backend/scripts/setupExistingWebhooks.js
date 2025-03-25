// scripts/setupExistingWebhooks.js
const mongoose = require('mongoose');
const axios = require('axios');
const Jobseeker = require('../models/jobseekerModel');
require('dotenv').config();

async function setupWebhooks() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const jobseekers = await Jobseeker.find({
      calendlyAccessToken: { $exists: true },
      calendlyUri: { $exists: true }
    });
    
    console.log(`Found ${jobseekers.length} jobseekers with Calendly connected`);
    
    const webhookUrl = `${process.env.API_BASE_URL}/api/calendly/webhook`;
    const events = [
      'user_availability_schedule.created',
      'user_availability_schedule.updated',
      'user_availability_schedule.deleted',
      'availability_rule.created',
      'availability_rule.updated',
      'availability_rule.deleted'
    ];
    
    for (const jobseeker of jobseekers) {
      try {
        console.log(`Setting up webhook for jobseeker ${jobseeker._id}`);
        
        // Extract organization URI
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
        
        // Update jobseeker record
        jobseeker.calendlyWebhooks = jobseeker.calendlyWebhooks || [];
        jobseeker.calendlyWebhooks.push({
          uri: response.data.resource.uri,
          events: events
        });
        
        await jobseeker.save();
        
        console.log(`Webhook created for jobseeker ${jobseeker._id}`);
      } catch (error) {
        console.error(`Error setting up webhook for jobseeker ${jobseeker._id}:`, error);
      }
    }
    
    console.log('Webhook setup completed');
  } catch (error) {
    console.error('Error in webhook setup script:', error);
  } finally {
    mongoose.disconnect();
  }
}

setupWebhooks();