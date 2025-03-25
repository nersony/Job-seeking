// test-calendly-webhook.js
const crypto = require('crypto');
const axios = require('axios');

// Configuration
const config = {
  // Your webhook endpoint URL - change this to your actual URL
  webhookUrl: 'https://70f1-103-190-46-147.ngrok-free.app/api/calendly/webhook',
  
  // The webhook signing key from your environment variables
  signingKey: process.env.CALENDLY_WEBHOOK_SIGNING_KEY || '5mEzn9C-I28UtwOjZJtFoob0sAAFZ95GbZkqj4y3i0I',
  
  // Set to true to test with an invalid signature
  testInvalidSignature: false
};

// Create a sample webhook payload matching Calendly's format
const webhookPayload = {
  event: 'user_availability_schedule.updated',
  created_at: new Date().toISOString(),
  payload: {
    resource: {
      uri: 'https://api.calendly.com/user_availability_schedules/ABCDEF123',
      user: 'https://api.calendly.com/users/BBBBBBBBBBBBBBBB',
      name: 'Test Availability Schedule'
    }
  }
};

// Convert payload to JSON string
const payloadString = JSON.stringify(webhookPayload);

// Generate timestamp (current time in seconds)
const timestamp = Math.floor(Date.now() / 1000).toString();

// Create valid signature
const hmac = crypto.createHmac('sha256', config.signingKey);
// Important: Use timestamp + '.' + payload as the signature data
const signatureData = `${timestamp}.${payloadString}`;
let signature = hmac.update(signatureData).digest('hex');

// If testing invalid signature, modify it
if (config.testInvalidSignature) {
  signature = signature.replace(/[0-9a-f]/i, 'x');
}

// Format the Calendly signature header
const signatureHeader = `t=${timestamp},v1=${signature}`;

// Display test configuration
console.log('=== Calendly Webhook Test ===');
console.log('Target URL:', config.webhookUrl);
console.log('Testing with:', config.testInvalidSignature ? 'INVALID signature' : 'valid signature');
console.log('Timestamp:', timestamp);
console.log('Payload (first 100 chars):', payloadString.substring(0, 100) + '...');
console.log('Signature Data (first 50 chars):', signatureData.substring(0, 50) + '...');
console.log('Generated Signature:', signature);
console.log('Signature Header:', signatureHeader);

// Send the request to your webhook endpoint
async function testWebhook() {
  console.log('\nSending webhook request...');
  
  try {
    const startTime = Date.now();
    const response = await axios.post(config.webhookUrl, webhookPayload, {
      headers: {
        'Content-Type': 'application/json',
        'Calendly-Webhook-Signature': signatureHeader
      }
    });
    const elapsedTime = Date.now() - startTime;
    
    console.log('\n✅ Request succeeded!');
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    console.log(`Request took ${elapsedTime}ms`);
    
    // Validate the response
    if (response.data.success === false && !config.testInvalidSignature) {
      console.log('\n⚠️ Warning: Returned success:false with a valid signature');
    } else if (response.data.success === true && config.testInvalidSignature) {
      console.log('\n⚠️ Warning: Returned success:true with an invalid signature');
    }
    
  } catch (error) {
    console.error('\n❌ Request failed:', error.message);
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run the test
testWebhook();