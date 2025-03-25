// backend/models/jobseekerModel.js (Updated)
const mongoose = require('mongoose');

// Schema for Calendly scheduling links
const schedulingLinkSchema = new mongoose.Schema({
  uri: {
    type: String,
    required: true
  },
  booking_url: {
    type: String,
    required: true
  }
}, { _id: false });

// Schema for Calendly webhook subscriptions
const webhookSubscriptionSchema = new mongoose.Schema({
  uri: {
    type: String,
    required: true
  },
  events: [String]
}, { _id: false });

const jobseekerSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  serviceCategory: {
    type: String,
    enum: ['caregiving', 'counselling', 'infant_care'],
    required: true
  },
  bio: {
    type: String,
    trim: true
  },
  skills: [String],
  certifications: [{
    name: String,
    issuer: String,
    dateObtained: Date,
    expiryDate: Date,
    documentUrl: String, // URL to uploaded certification document
    isVerified: {
      type: Boolean,
      default: false
    }
  }],
  experience: {
    type: Number, // Years of experience
    default: 0
  },
  // Calendly integration fields
  calendlyLink: {
    type: String,
    trim: true
  },
  calendlyUri: {
    type: String,
    trim: true
  },
  calendlyAccessToken: {
    type: String
  },
  calendlyRefreshToken: {
    type: String
  },
  calendlyTokenExpiry: {
    type: Date
  },
  calendlyEmailAddress: {
    type: String,
    trim: true
  },
  calendlyTokenNeedsManualRefresh: {
    type: Boolean,
    default: false
  },
  calendlyWebhooks: [webhookSubscriptionSchema],
  schedulingLinks: [schedulingLinkSchema],
  // Selected event types to display on profile
  selectedEventTypes: [String],
  // Availability status (managed by availability sync)
  hasWeeklyAvailability: {
    type: Boolean,
    default: false
  },
  hourlyRate: {
    type: Number,
    required: true
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalRatings: {
    type: Number,
    default: 0
  },
  isAvailable: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Create a unique index on calendlyUri, but only if it exists
jobseekerSchema.index(
  { calendlyUri: 1 },
  {
    unique: true,
    partialFilterExpression: { calendlyUri: { $exists: true } }
  }
);

// Method to check availability at a specific time
jobseekerSchema.methods.isAvailableAt = async function (startDateTime, endDateTime) {
  // If the jobseeker doesn't have Calendly integration, assume they're available
  if (!this.calendlyUri) {
    return true;
  }
  if (!this.isAvailable) {
    return false;
  }
  if (this.calendlyTokenNeedsManualRefresh) {
    return false;
  }
  try {
    // Try to find availability record in our database
    const CalendlyAvailability = mongoose.model('CalendlyAvailability');
    const availability = await CalendlyAvailability.findOne({ jobseeker: this._id });

    if (availability) {
      // Use the local availability record to check
      return availability.isAvailableAt(startDateTime, endDateTime);
    } else {
      // If no local record, assume available (could be enhanced later)
      return true;
    }
  } catch (error) {
    console.error(`Error checking availability for jobseeker ${this._id}:`, error);
    return false;
  }
};

const Jobseeker = mongoose.model('Jobseeker', jobseekerSchema);
module.exports = Jobseeker;