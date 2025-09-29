const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  service: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: true
  },
  // New slot-based system
  timeSlot: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TimeSlot'
  },
  // Legacy fields for backward compatibility
  date: {
    type: Date
  },
  time: {
    type: String
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'completed'],
    default: 'pending'
  },
  notes: {
    type: String
  }
}, {
  timestamps: true
});

// Virtual for appointment datetime when using timeSlot
appointmentSchema.virtual('appointmentDateTime').get(function() {
  if (this.timeSlot && this.timeSlot.date && this.timeSlot.startTime) {
    return new Date(`${this.timeSlot.date}T${this.timeSlot.startTime}`);
  } else if (this.date && this.time) {
    return new Date(`${this.date.toISOString().split('T')[0]}T${this.time}`);
  }
  return null;
});

// Ensure virtuals are included when converting to JSON
appointmentSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Appointment', appointmentSchema);