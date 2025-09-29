const mongoose = require('mongoose');

const workerSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: [true, 'Worker name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number']
  },
  
  // Professional Information
  specialization: {
    type: String,
    required: [true, 'Specialization is required'],
    trim: true,
    maxlength: [200, 'Specialization cannot exceed 200 characters']
  },
  experience: {
    type: Number,
    required: [true, 'Experience is required'],
    min: [0, 'Experience cannot be negative'],
    max: [50, 'Experience cannot exceed 50 years']
  },
  
  // Additional Details
  dateOfBirth: {
    type: Date,
    required: false
  },
  address: {
    type: String,
    trim: true,
    maxlength: [300, 'Address cannot exceed 300 characters']
  },
  
  // Work Details
  hourlyRate: {
    type: Number,
    min: [0, 'Hourly rate cannot be negative'],
    required: false
  },
  availability: {
    type: String,
    enum: ['Full-time', 'Part-time', 'Contract', 'Freelance'],
    default: 'Full-time'
  },
  
  // Status and Management
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'On Leave'],
    default: 'Active'
  },
  joiningDate: {
    type: Date,
    default: Date.now
  },
  
  // Reference to Service Provider
  provider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Provider is required']
  },
  
  // Additional Notes
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  }
}, {
  timestamps: true // This adds createdAt and updatedAt automatically
});

// Index for efficient queries
workerSchema.index({ provider: 1, status: 1 });
workerSchema.index({ email: 1 });

// Virtual for age calculation
workerSchema.virtual('age').get(function() {
  if (!this.dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
});

// Instance method to get full worker info
workerSchema.methods.getWorkerSummary = function() {
  return {
    id: this._id,
    name: this.name,
    specialization: this.specialization,
    experience: this.experience,
    availability: this.availability,
    status: this.status,
    age: this.age
  };
};

// Static method to find workers by provider
workerSchema.statics.findByProvider = function(providerId, status = null) {
  const query = { provider: providerId };
  if (status) {
    query.status = status;
  }
  return this.find(query).sort({ name: 1 });
};

module.exports = mongoose.model('Worker', workerSchema);