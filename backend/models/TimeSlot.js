const mongoose = require('mongoose');

const timeSlotSchema = new mongoose.Schema({
  // Service Reference
  service: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: [true, 'Service is required']
  },
  
  // Provider Reference (for quick queries)
  provider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Provider is required']
  },
  
  // Date for the slot
  date: {
    type: Date,
    required: [true, 'Date is required']
  },
  
  // Time slot details
  startTime: {
    type: String,
    required: [true, 'Start time is required'],
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Start time must be in HH:MM format']
  },
  
  endTime: {
    type: String,
    required: [true, 'End time is required'],
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'End time must be in HH:MM format']
  },
  
  // Slot availability
  isAvailable: {
    type: Boolean,
    default: true
  },
  
  // Current booking (if any)
  currentBooking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    default: null
  },
  
  // Slot metadata
  maxBookings: {
    type: Number,
    default: 1,
    min: [1, 'Max bookings must be at least 1']
  },
  
  currentBookings: {
    type: Number,
    default: 0,
    min: [0, 'Current bookings cannot be negative']
  },
  
  // Pricing (can override service default price for specific slots)
  customPrice: {
    type: Number,
    min: [0, 'Price cannot be negative']
  },
  
  // Notes for this specific slot
  notes: {
    type: String,
    maxlength: [200, 'Notes cannot exceed 200 characters']
  },
  
  // Status
  status: {
    type: String,
    enum: ['active', 'inactive', 'blocked'],
    default: 'active'
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
timeSlotSchema.index({ provider: 1, service: 1, date: 1 });
timeSlotSchema.index({ service: 1, date: 1, isAvailable: 1 });
timeSlotSchema.index({ date: 1, startTime: 1 });

// Virtual for formatted time range
timeSlotSchema.virtual('timeRange').get(function() {
  return `${this.startTime} - ${this.endTime}`;
});

// Virtual to check if slot is bookable
timeSlotSchema.virtual('isBookable').get(function() {
  return this.isAvailable && 
         this.status === 'active' && 
         this.currentBookings < this.maxBookings &&
         new Date(this.date) >= new Date().setHours(0, 0, 0, 0);
});

// Method to book the slot
timeSlotSchema.methods.bookSlot = async function(appointmentId) {
  if (!this.isBookable) {
    throw new Error('Slot is not available for booking');
  }
  
  this.currentBookings += 1;
  this.currentBooking = appointmentId;
  
  if (this.currentBookings >= this.maxBookings) {
    this.isAvailable = false;
  }
  
  return await this.save();
};

// Method to release the slot
timeSlotSchema.methods.releaseSlot = async function(appointmentId) {
  if (this.currentBooking && this.currentBooking.toString() === appointmentId.toString()) {
    this.currentBookings = Math.max(0, this.currentBookings - 1);
    this.currentBooking = null;
    this.isAvailable = true;
    return await this.save();
  }
  throw new Error('Appointment not associated with this slot');
};

// Static method to find available slots
timeSlotSchema.statics.findAvailableSlots = function(serviceId, date, providerId = null) {
  const query = {
    service: serviceId,
    date: date,
    isAvailable: true,
    status: 'active',
    $expr: { $lt: ['$currentBookings', '$maxBookings'] }
  };
  
  if (providerId) {
    query.provider = providerId;
  }
  
  return this.find(query)
    .populate('service', 'name duration price')
    .sort({ startTime: 1 });
};

// Static method to find slots by provider and date range
timeSlotSchema.statics.findByProviderAndDateRange = function(providerId, startDate, endDate) {
  return this.find({
    provider: providerId,
    date: { $gte: startDate, $lte: endDate }
  })
  .populate('service', 'name duration price')
  .populate('currentBooking', 'user status notes')
  .sort({ date: 1, startTime: 1 });
};

// Pre-save middleware to validate time slots
timeSlotSchema.pre('save', function(next) {
  // Ensure end time is after start time
  const startHour = parseInt(this.startTime.split(':')[0]);
  const startMinute = parseInt(this.startTime.split(':')[1]);
  const endHour = parseInt(this.endTime.split(':')[0]);
  const endMinute = parseInt(this.endTime.split(':')[1]);
  
  const startTotalMinutes = startHour * 60 + startMinute;
  const endTotalMinutes = endHour * 60 + endMinute;
  
  if (endTotalMinutes <= startTotalMinutes) {
    return next(new Error('End time must be after start time'));
  }
  
  // Ensure date is not in the past (only for new documents)
  if (this.isNew) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (new Date(this.date) < today) {
      return next(new Error('Cannot create slots for past dates'));
    }
  }
  
  next();
});

// Pre-remove middleware to ensure no active bookings
timeSlotSchema.pre('remove', function(next) {
  if (this.currentBookings > 0) {
    return next(new Error('Cannot delete slot with active bookings'));
  }
  next();
});

module.exports = mongoose.model('TimeSlot', timeSlotSchema);