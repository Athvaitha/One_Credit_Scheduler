const express = require('express');
const { protect } = require('../middleware/auth');
const TimeSlot = require('../models/TimeSlot');
const Service = require('../models/Service');

const router = express.Router();

// Middleware to ensure only service providers can manage slots
const requireProvider = (req, res, next) => {
  if (req.user.role !== 'provider') {
    return res.status(403).json({ 
      success: false,
      message: 'Access denied. Only service providers can manage slots.' 
    });
  }
  next();
};

// @desc    Create multiple time slots for a service and date
// @route   POST /api/slots/bulk
// @access  Private (Service Providers only)
router.post('/bulk', protect, requireProvider, async (req, res) => {
  try {
    console.log('🔄 Creating bulk time slots...');
    console.log('📊 Request data:', req.body);
    
    const { serviceId, date, timeSlots, maxBookings = 1, customPrice, notes } = req.body;
    
    if (!serviceId || !date || !timeSlots || !Array.isArray(timeSlots)) {
      return res.status(400).json({
        success: false,
        message: 'Service ID, date, and time slots array are required'
      });
    }

    // Verify service belongs to provider
    const service = await Service.findOne({ _id: serviceId, provider: req.user._id });
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found or not owned by provider'
      });
    }

    // Create slots
    const createdSlots = [];
    const errors = [];

    for (let slot of timeSlots) {
      try {
        const timeSlot = await TimeSlot.create({
          service: serviceId,
          provider: req.user._id,
          date,
          startTime: slot.startTime,
          endTime: slot.endTime,
          maxBookings: slot.maxBookings || maxBookings,
          customPrice: slot.customPrice || customPrice,
          notes: slot.notes || notes
        });
        
        createdSlots.push(timeSlot);
      } catch (error) {
        errors.push({
          slot: slot,
          error: error.message
        });
      }
    }

    console.log(`✅ Created ${createdSlots.length} slots, ${errors.length} errors`);
    
    res.status(201).json({
      success: true,
      message: `Created ${createdSlots.length} time slots`,
      slots: createdSlots,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('❌ Error creating bulk slots:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating slots'
    });
  }
});

// @desc    Get available slots for a service and date
// @route   GET /api/slots/available/:serviceId/:date
// @access  Public
router.get('/available/:serviceId/:date', async (req, res) => {
  try {
    console.log('🔄 Fetching available slots...');
    console.log('📊 Service:', req.params.serviceId, 'Date:', req.params.date);
    
    const { serviceId, date } = req.params;
    
    const slots = await TimeSlot.findAvailableSlots(serviceId, new Date(date));
    
    console.log(`✅ Found ${slots.length} available slots`);
    
    res.json({
      success: true,
      count: slots.length,
      slots: slots
    });
  } catch (error) {
    console.error('❌ Error fetching available slots:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching slots'
    });
  }
});

// @desc    Get all slots for a provider (with date range filter)
// @route   GET /api/slots/my-slots
// @access  Private (Service Providers only)
router.get('/my-slots', protect, requireProvider, async (req, res) => {
  try {
    console.log('🔄 Fetching provider slots...');
    console.log('👤 Provider:', req.user._id);
    
    const { startDate, endDate, serviceId } = req.query;
    
    let query = { provider: req.user._id };
    
    if (startDate && endDate) {
      query.date = { 
        $gte: new Date(startDate), 
        $lte: new Date(endDate) 
      };
    }
    
    if (serviceId) {
      query.service = serviceId;
    }
    
    const slots = await TimeSlot.find(query)
      .populate('service', 'name duration price')
      .populate('currentBooking', 'user status notes')
      .sort({ date: 1, startTime: 1 });
    
    console.log(`✅ Found ${slots.length} slots`);
    
    res.json({
      success: true,
      count: slots.length,
      slots: slots
    });
  } catch (error) {
    console.error('❌ Error fetching provider slots:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching slots'
    });
  }
});

// @desc    Update time slot
// @route   PUT /api/slots/:id
// @access  Private (Service Providers only)
router.put('/:id', protect, requireProvider, async (req, res) => {
  try {
    console.log('🔄 Updating time slot:', req.params.id);
    console.log('📊 Update data:', req.body);
    
    const slot = await TimeSlot.findOne({
      _id: req.params.id,
      provider: req.user._id
    });
    
    if (!slot) {
      return res.status(404).json({
        success: false,
        message: 'Time slot not found'
      });
    }

    // Prevent updating if slot has bookings (unless just updating notes/status)
    if (slot.currentBookings > 0) {
      const allowedFields = ['notes', 'status', 'customPrice'];
      const updateFields = Object.keys(req.body);
      const hasRestrictedFields = updateFields.some(field => !allowedFields.includes(field));
      
      if (hasRestrictedFields) {
        return res.status(400).json({
          success: false,
          message: 'Cannot modify time or date for slots with active bookings'
        });
      }
    }

    const updatedSlot = await TimeSlot.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('service', 'name duration price');
    
    console.log('✅ Slot updated successfully');
    
    res.json({
      success: true,
      message: 'Time slot updated successfully',
      slot: updatedSlot
    });
  } catch (error) {
    console.error('❌ Error updating slot:', error);
    res.status(400).json({
      success: false,
      message: 'Error updating slot: ' + error.message
    });
  }
});

// @desc    Delete time slot
// @route   DELETE /api/slots/:id
// @access  Private (Service Providers only)
router.delete('/:id', protect, requireProvider, async (req, res) => {
  try {
    console.log('🔄 Deleting time slot:', req.params.id);
    
    const slot = await TimeSlot.findOne({
      _id: req.params.id,
      provider: req.user._id
    });
    
    if (!slot) {
      return res.status(404).json({
        success: false,
        message: 'Time slot not found'
      });
    }

    // Cannot delete slot with active bookings
    if (slot.currentBookings > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete slot with active bookings'
      });
    }

    await TimeSlot.findByIdAndDelete(req.params.id);
    
    console.log('✅ Slot deleted successfully');
    
    res.json({
      success: true,
      message: 'Time slot deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting slot:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting slot'
    });
  }
});

// @desc    Generate time slots automatically
// @route   POST /api/slots/generate
// @access  Private (Service Providers only)
router.post('/generate', protect, requireProvider, async (req, res) => {
  try {
    console.log('🔄 Auto-generating time slots...');
    console.log('📊 Request data:', req.body);
    
    const { 
      serviceId, 
      date, 
      startTime, 
      endTime, 
      duration, // in minutes
      breakBetweenSlots = 0, // in minutes
      maxBookings = 1
    } = req.body;
    
    if (!serviceId || !date || !startTime || !endTime || !duration) {
      return res.status(400).json({
        success: false,
        message: 'Service ID, date, start time, end time, and duration are required'
      });
    }

    // Verify service belongs to provider
    const service = await Service.findOne({ _id: serviceId, provider: req.user._id });
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found or not owned by provider'
      });
    }

    // Generate time slots
    const slots = [];
    let currentTime = startTime;
    
    const timeToMinutes = (time) => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    };
    
    const minutesToTime = (minutes) => {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    };
    
    const endTimeMinutes = timeToMinutes(endTime);
    let currentTimeMinutes = timeToMinutes(currentTime);
    
    while (currentTimeMinutes + duration <= endTimeMinutes) {
      const slotStartTime = minutesToTime(currentTimeMinutes);
      const slotEndTime = minutesToTime(currentTimeMinutes + duration);
      
      slots.push({
        startTime: slotStartTime,
        endTime: slotEndTime
      });
      
      currentTimeMinutes += duration + breakBetweenSlots;
    }

    // Create slots in database
    const createdSlots = [];
    for (let slot of slots) {
      try {
        const timeSlot = await TimeSlot.create({
          service: serviceId,
          provider: req.user._id,
          date,
          startTime: slot.startTime,
          endTime: slot.endTime,
          maxBookings
        });
        
        createdSlots.push(timeSlot);
      } catch (error) {
        console.error('Error creating slot:', error);
      }
    }

    console.log(`✅ Generated ${createdSlots.length} time slots`);
    
    res.status(201).json({
      success: true,
      message: `Generated ${createdSlots.length} time slots`,
      slots: createdSlots
    });
  } catch (error) {
    console.error('❌ Error generating slots:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while generating slots'
    });
  }
});

module.exports = router;