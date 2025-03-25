// backend/models/jobseekerModel.js
const mongoose = require('mongoose');

// Schema for availability time slots
const timeSlotSchema = new mongoose.Schema({
  day: {
    type: String,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    required: true
  },
  startTime: {
    type: String, // format: HH:MM (24-hour)
    required: true,
    validate: {
      validator: function(v) {
        return /^([01]\d|2[0-3]):([0-5]\d)$/.test(v);
      },
      message: props => `${props.value} is not a valid time format! Use HH:MM`
    }
  },
  endTime: {
    type: String, // format: HH:MM (24-hour)
    required: true,
    validate: {
      validator: function(v) {
        return /^([01]\d|2[0-3]):([0-5]\d)$/.test(v);
      },
      message: props => `${props.value} is not a valid time format! Use HH:MM`
    }
  }
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
    documentUrl: String,
    isVerified: {
      type: Boolean,
      default: false
    }
  }],
  experience: {
    type: Number,
    default: 0
  },
  availability: {
    type: [timeSlotSchema],
    default: []
  },
  workingHours: {
    monday: {
      isWorking: {
        type: Boolean,
        default: false
      },
      startTime: {
        type: String,
        default: '09:00'
      },
      endTime: {
        type: String,
        default: '17:00'
      }
    },
    tuesday: {
      isWorking: {
        type: Boolean,
        default: false
      },
      startTime: {
        type: String,
        default: '09:00'
      },
      endTime: {
        type: String,
        default: '17:00'
      }
    },
    wednesday: {
      isWorking: {
        type: Boolean,
        default: false
      },
      startTime: {
        type: String,
        default: '09:00'
      },
      endTime: {
        type: String,
        default: '17:00'
      }
    },
    thursday: {
      isWorking: {
        type: Boolean,
        default: false
      },
      startTime: {
        type: String,
        default: '09:00'
      },
      endTime: {
        type: String,
        default: '17:00'
      }
    },
    friday: {
      isWorking: {
        type: Boolean,
        default: false
      },
      startTime: {
        type: String,
        default: '09:00'
      },
      endTime: {
        type: String,
        default: '17:00'
      }
    },
    saturday: {
      isWorking: {
        type: Boolean,
        default: false
      },
      startTime: {
        type: String,
        default: '00:00'
      },
      endTime: {
        type: String,
        default: '00:00'
      }
    },
    sunday: {
      isWorking: {
        type: Boolean,
        default: false
      },
      startTime: {
        type: String,
        default: '00:00'
      },
      endTime: {
        type: String,
        default: '00:00'
      }
    }
  },
  blockedDates: [{
    startDate: Date,
    endDate: Date,
    reason: String
  }],
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

// Method to check if jobseeker is available at a specific time
jobseekerSchema.methods.isAvailableAt = function(startDateTime, endDateTime) {
  const start = new Date(startDateTime);
  const end = new Date(endDateTime);
  
  // Check if there are any blocked dates
  const isBlockedDate = this.blockedDates.some(blockedPeriod => 
    start >= blockedPeriod.startDate && end <= blockedPeriod.endDate
  );
  
  if (isBlockedDate) return false;

  // Get day of week and time
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayOfWeek = daysOfWeek[start.getDay()];
  const startTimeStr = start.toTimeString().slice(0, 5);
  const endTimeStr = end.toTimeString().slice(0, 5);

  // Check working hours for that day
  const dayWorkingHours = this.workingHours[dayOfWeek.toLowerCase()];
  
  // If not working that day
  if (!dayWorkingHours.isWorking) return false;

  // Check if time is within working hours
  const isWithinWorkingHours = 
    startTimeStr >= dayWorkingHours.startTime && 
    endTimeStr <= dayWorkingHours.endTime;

  return isWithinWorkingHours;
};

const Jobseeker = mongoose.model('Jobseeker', jobseekerSchema);
module.exports = Jobseeker;