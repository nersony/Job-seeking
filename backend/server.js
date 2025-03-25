// backend/server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const userRoutes = require('./routes/userRoutes');
const jobRoutes = require('./routes/jobRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const calendlyRoutes = require('./routes/calendlyRoutes');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
// Handle raw body for Stripe webhooks
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));
// Middleware
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