// backend/server.js (Updated)
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const userRoutes = require('./routes/userRoutes');
const jobRoutes = require('./routes/jobRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const calendlyRoutes = require('./routes/calendlyRoutes');
const calendlyWebhookRoutes = require('./routes/calendlyWebhookRoutes');
const availabilityRoutes = require('./routes/availabilityRoutes');
const disputeRoutes = require('./routes/disputeRoutes');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Special handling for webhooks that may send raw body
app.use('/api/calendly/webhook', express.raw({ type: 'application/json' }));
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));

// Process raw body for webhook routes
app.use((req, res, next) => {
  if (req.originalUrl === '/api/calendly/webhook' || req.originalUrl === '/api/stripe/webhook') {
    if (req.body && req.body.length) {
      req.body = JSON.parse(req.body.toString());
    }
  }
  next();
});

// Standard middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/users', userRoutes);
app.use('/api/jobseekers', jobRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/calendly', calendlyRoutes);
app.use('/api/calendly', calendlyWebhookRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/disputes', disputeRoutes);

// Add Stripe routes
const stripeRoutes = require('./routes/stripeRoutes');
app.use('/api/stripe', stripeRoutes);

// Root route
app.get('/', (req, res) => {
  res.send('Caregiving Job Matching API is running');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'An error occurred on the server',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});