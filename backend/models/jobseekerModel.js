const mongoose = require('mongoose');

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
  calendlyLink: {
    type: String,
    trim: true
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

const Jobseeker = mongoose.model('Jobseeker', jobseekerSchema);
module.exports = Jobseeker;