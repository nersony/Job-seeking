const axios = require('axios');
const crypto = require('crypto');
const dotenv = require('dotenv');
const readline = require('readline');

// Enhanced configuration management
class CalendlyWebhookSetup {
  constructor() {
    // Load environment variables
    dotenv.config();

    // Configuration object with improved validation
    this.config = {
      accessToken: null,
      refreshToken: null,
      calendlyUri: null,
      calendlyLink: null,
      webhookUrl: 'http://localhost:5000/api/calendly/webhook',
      ngrokUrl: null,
      signingKey: null,
      organizationUri: null
    };

    // Create readline interface
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  // Promisified prompt method
  prompt(question) {
    return new Promise((resolve) => {
      this.rl.question(question, (answer) => {
        resolve(answer.trim());
      });
    });
  }

  // Validate configuration before making API calls
  validateConfig() {
    const requiredFields = ['accessToken', 'calendlyUri'];
    for (let field of requiredFields) {
      if (!this.config[field]) {
        throw new Error(`Missing required configuration: ${field}`);
      }
    }
  }

  // Generate a cryptographically secure signing key
  generateSigningKey() {
    return crypto.randomBytes(32).toString('hex');
  }

  // Create axios instance with error handling
  createAxiosInstance() {
    return axios.create({
      baseURL: 'https://api.calendly.com',
      headers: {
        'Authorization': `Bearer ${this.config.accessToken}`,
        'Content-Type': 'application/json'
      },
      // Add timeout and error handling
      timeout: 10000,
      validateStatus: (status) => status >= 200 && status < 300
    });
  }

  // Fetch user and organization details
  async fetchUserDetails() {
    try {
      this.validateConfig();
      const api = this.createAxiosInstance();
      
      // Fetch user details
      const userResponse = await api.get('/users/me');
      this.config.organizationUri = userResponse.data.resource.current_organization;
      
      console.log("User Details:");
      console.log("- Calendly URI:", userResponse.data.resource.uri);
      console.log("- Organization URI:", this.config.organizationUri);
      
      return userResponse.data.resource;
    } catch (error) {
      console.error("Error fetching user details:");
      this.handleAxiosError(error);
      throw error;
    }
  }

  // Create webhook subscription
  async createWebhookSubscription() {
    try {
      // Ensure signing key exists
      this.config.signingKey = this.config.signingKey || this.generateSigningKey();
      
      const webhookData = {
        url: this.config.webhookUrl,
        events: [
          "invitee.created",
          "invitee.canceled"
        ],
        organization: this.config.organizationUri,
        scope: "organization",
        signing_key: this.config.signingKey
      };

      const api = this.createAxiosInstance();
      const webhookResponse = await api.post('/webhook_subscriptions', webhookData);
      
      console.log("\n✅ Webhook created successfully!");
      console.log("Webhook URI:", webhookResponse.data.resource.uri);
      console.log("Webhook ID:", webhookResponse.data.resource.uri.split('/').pop());
      
      return webhookResponse.data.resource;
    } catch (error) {
      console.error("Error creating webhook:");
      this.handleAxiosError(error);
      throw error;
    }
  }

  // Comprehensive error handling for axios errors
  handleAxiosError(error) {
    if (error.response) {
      // The request was made and the server responded with a status code
      console.error("Error Status:", error.response.status);
      console.error("Error Data:", JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      // The request was made but no response was received
      console.error("No response received:", error.request);
    } else {
      // Something happened in setting up the request
      console.error("Error setting up request:", error.message);
    }
  }

  // Test webhook signature verification
  async testSignatureVerification() {
    console.log("\n=== Testing Webhook Signature Verification ===");
    
    // Sample webhook payload
    const webhookPayload = {
      event: 'user_availability_schedule.updated',
      created_at: new Date().toISOString(),
      payload: {
        resource: {
          uri: 'https://api.calendly.com/user_availability_schedules/test',
          user: this.config.calendlyUri,
          name: 'Test Availability Schedule'
        }
      }
    };

    // Convert payload to JSON string
    const payloadString = JSON.stringify(webhookPayload);

    // Generate timestamp (current time in seconds)
    const timestamp = Math.floor(Date.now() / 1000).toString();

    // Create signature
    const hmac = crypto.createHmac('sha256', this.config.signingKey);
    const signatureData = `${timestamp}.${payloadString}`;
    const signature = hmac.update(signatureData).digest('hex');

    // Format the Calendly signature header
    const signatureHeader = `t=${timestamp},v1=${signature}`;

    console.log("Sending test webhook...");
    console.log("- URL:", this.config.webhookUrl);
    console.log("- Timestamp:", timestamp);
    console.log("- Signature Header:", signatureHeader);
    
    try {
      const response = await axios.post(this.config.webhookUrl, webhookPayload, {
        headers: {
          'Content-Type': 'application/json',
          'Calendly-Webhook-Signature': signatureHeader
        }
      });
      
      console.log("\n✅ Test request successful!");
      console.log("Status:", response.status);
      console.log("Response:", JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.error("\n❌ Test request failed:", error.message);
      this.handleAxiosError(error);
    }
  }

  // Main setup method
  async setup() {
    try {
      console.log("=== Calendly Webhook Setup ===");
      
      // Prompt for Calendly credentials
      this.config.accessToken = await this.prompt("Enter your Calendly Access Token: ");
      this.config.calendlyUri = await this.prompt("Enter your Calendly User URI: ");
      
      // Determine webhook URL
      const useNgrok = await this.prompt("Are you using ngrok? (y/n): ");
      
      if (useNgrok.toLowerCase() === 'y') {
        this.config.ngrokUrl = await this.prompt("Enter your ngrok URL (e.g., https://a1b2c3d4.ngrok.io): ");
        this.config.webhookUrl = `${this.config.ngrokUrl}/api/calendly/webhook`;
      } else {
        const customUrl = await this.prompt(`Enter your webhook URL or press enter for default (${this.config.webhookUrl}): `);
        if (customUrl) {
          this.config.webhookUrl = customUrl;
        }
      }
      
      // Get or generate signing key
      const customKey = await this.prompt("Enter a signing key or press enter to use a random one: ");
      this.config.signingKey = customKey || this.generateSigningKey();
      
      // Display settings
      console.log("\nSettings:");
      console.log("- Webhook URL:", this.config.webhookUrl);
      console.log("- Signing Key:", this.config.signingKey);
      
      // Fetch user details
      await this.fetchUserDetails();
      
      // Create webhook
      const createWebhook = await this.prompt("\nCreate a webhook subscription? (y/n): ");
      if (createWebhook.toLowerCase() === 'y') {
        await this.createWebhookSubscription();
        
        console.log("\nIMPORTANT: Add this to your .env file:");
        console.log(`CALENDLY_WEBHOOK_SIGNING_KEY=${this.config.signingKey}`);
      }
      
      // Test webhook (optional)
      const testWebhook = await this.prompt("\nTest the webhook signature verification? (y/n): ");
      if (testWebhook.toLowerCase() === 'y') {
        await this.testSignatureVerification();
      }
      
      this.rl.close();
    } catch (error) {
      console.error("Setup failed:", error.message);
      this.rl.close();
    }
  }
}

// Run the setup
const webhookSetup = new CalendlyWebhookSetup();
webhookSetup.setup().catch(console.error);