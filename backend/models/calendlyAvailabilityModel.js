// backend/models/calendlyAvailabilityModel.js
const mongoose = require('mongoose');

// Schema for time slots (start and end times)
const timeSlotSchema = new mongoose.Schema({
  startTime: {
    type: String,
    required: true
  },
  endTime: {
    type: String,
    required: true
  }
}, { _id: false });

// Schema for Calendly availability
const calendlyAvailabilitySchema = new mongoose.Schema({
  jobseeker: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Jobseeker',
    required: true,
    unique: true
  },
  scheduleUri: {
    type: String,
    required: true
  },
  scheduleName: {
    type: String,
    default: 'Default Schedule'
  },
  weeklyAvailability: {
    monday: [timeSlotSchema],
    tuesday: [timeSlotSchema],
    wednesday: [timeSlotSchema],
    thursday: [timeSlotSchema],
    friday: [timeSlotSchema],
    saturday: [timeSlotSchema],
    sunday: [timeSlotSchema]
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Add method to check availability for a specific time slot
calendlyAvailabilitySchema.methods.isAvailableAt = function(startDateTime, endDateTime) {
  try {
    // Convert input dates to Date objects if they are strings
    const startDate = new Date(startDateTime);
    const endDate = new Date(endDateTime);
    
    // Make sure both dates are valid
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return false;
    }
    
    // Get day of week (0 = Sunday, 1 = Monday, etc.)
    const dayIndex = startDate.getDay();
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = days[dayIndex];
    
    // Get time in HH:MM format
    const startTime = startDate.toTimeString().slice(0, 5); // HH:MM format
    const endTime = endDate.toTimeString().slice(0, 5); // HH:MM format
    
    // Get the day's available time slots
    const daySlots = this.weeklyAvailability[dayName] || [];
    
    // Check if the requested time slot falls within any available slot
    return daySlots.some(slot => {
      // Format times for consistent comparison
      const slotStart = formatTime(slot.startTime);
      const slotEnd = formatTime(slot.endTime);
      
      // The requested time slot must be within an available slot
      return startTime >= slotStart && endTime <= slotEnd;
    });
  } catch (error) {
    console.error('Error checking availability:', error);
    return false;
  }
};

// Helper function to normalize time format to HH:MM
function formatTime(timeStr) {
  if (!timeStr) return '00:00';
  
  // Replace dots with colons for consistency
  timeStr = timeStr.replace('.', ':');
  
  // Ensure HH:MM format with leading zeros
  if (!timeStr.includes(':')) {
    // Convert decimal hours to HH:MM
    const hours = Math.floor(parseFloat(timeStr));
    const minutes = Math.round((parseFloat(timeStr) - hours) * 60);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }
  
  // Make sure it has leading zeros
  const [hours, minutes] = timeStr.split(':');
  return `${String(parseInt(hours)).padStart(2, '0')}:${String(parseInt(minutes)).padStart(2, '0')}`;
}

const CalendlyAvailability = mongoose.model('CalendlyAvailability', calendlyAvailabilitySchema);
module.exports = CalendlyAvailability;