const express = require('express');
const { protect } = require('../middleware/auth');
const Appointment = require('../models/Appointment');
const TimeSlot = require('../models/TimeSlot');

const router = express.Router();

router.post('/', protect, async (req, res) => {
  try {
    console.log('Creating appointment with data:', req.body);
    console.log('User:', req.user._id);
    
    const { service, timeSlot, notes } = req.body;
    
    // Check if we're using the new slot-based system
    if (timeSlot) {
      // New slot-based booking
      const slot = await TimeSlot.findById(timeSlot);
      if (!slot) {
        return res.status(404).json({ 
          success: false, 
          message: 'Time slot not found' 
        });
      }

      if (!slot.isAvailable) {
        return res.status(400).json({ 
          success: false, 
          message: 'This time slot is no longer available' 
        });
      }

      // Create appointment
      const appointment = await Appointment.create({
        user: req.user._id,
        service: service,
        timeSlot: timeSlot,
        notes: notes || ''
      });

      // Book the slot
      await slot.bookSlot(appointment._id);

      await appointment.populate('service user timeSlot');
      
      res.status(201).json({
        success: true,
        message: 'Appointment booked successfully',
        appointment
      });
    } else {
      // Legacy booking system (for backward compatibility)
      const appointment = await Appointment.create({
        user: req.user._id,
        service: req.body.service,
        date: req.body.date,
        time: req.body.time,
        notes: req.body.notes
      });
      
      await appointment.populate('service user');
      res.status(201).json({
        success: true,
        appointment
      });
    }
  } catch (error) {
    console.error('Appointment creation error:', error);
    res.status(400).json({ 
      success: false,
      message: error.message || 'Invalid appointment data' 
    });
  }
});

router.get('/my-appointments', protect, async (req, res) => {
  try {
    console.log('Fetching appointments for user:', req.user._id, 'Role:', req.user.role);
    let appointments;
    
    if (req.user.role === 'provider') {
      // First get all services created by this provider
      const Service = require('../models/Service');
      const providerServices = await Service.find({ provider: req.user._id });
      const serviceIds = providerServices.map(service => service._id);
      
      console.log('Provider services:', serviceIds);
      
      // Then find appointments for those services
      appointments = await Appointment.find({ service: { $in: serviceIds } })
        .populate('service')
        .populate('user', 'name email')
        .populate('timeSlot');
    } else {
      appointments = await Appointment.find({ user: req.user._id })
        .populate('service')
        .populate('timeSlot');
    }
    
    console.log('Found appointments:', appointments.length);
    res.json({
      success: true,
      appointments
    });
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
});
router.put('/:id', protect, async (req, res) => {
  try {
    console.log('🔄 Updating appointment:', req.params.id);
    console.log('📊 Update data:', req.body);
    console.log('👤 User role:', req.user.role);
    
    const appointment = await Appointment.findById(req.params.id)
      .populate('service')
      .populate('user', 'name email');
    
    if (!appointment) {
      console.log('❌ Appointment not found');
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Authorization checks
    if (req.user.role === 'provider') {
      // Provider can update status only
      if (appointment.service.provider.toString() !== req.user._id.toString()) {
        console.log('🚫 Provider not authorized');
        return res.status(403).json({ message: 'Not authorized to update this appointment' });
      }
    } else if (req.user.role === 'user') {
      // User can reschedule/cancel their own appointments
      if (appointment.user._id.toString() !== req.user._id.toString()) {
        console.log('🚫 User not authorized');
        return res.status(403).json({ message: 'Not authorized to update this appointment' });
      }
      
      // Users can only reschedule pending appointments
      if (req.body.date || req.body.time) {
        if (appointment.status !== 'pending') {
          return res.status(400).json({ 
            message: 'Can only reschedule pending appointments. Contact provider for confirmed appointments.' 
          });
        }
      }
    }

    // Prepare update data
    let updateData = {};
    
    if (req.user.role === 'provider') {
      // Provider can only update status
      if (req.body.status) {
        updateData.status = req.body.status;
      }
    } else {
      // User can update date, time, notes, or cancel (set status to cancelled)
      if (req.body.date) updateData.date = req.body.date;
      if (req.body.time) updateData.time = req.body.time;
      if (req.body.notes !== undefined) updateData.notes = req.body.notes;
      if (req.body.status === 'cancelled') {
        updateData.status = 'cancelled';
      }
    }

    console.log('📝 Update data prepared:', updateData);

    const updatedAppointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('service').populate('user', 'name email');

    console.log('✅ Appointment updated successfully');
    res.json({
      success: true,
      message: 'Appointment updated successfully',
      appointment: updatedAppointment
    });
  } catch (error) {
    console.error('💥 Error updating appointment:', error);
    res.status(400).json({ 
      success: false,
      message: 'Error updating appointment: ' + error.message 
    });
  }
});

// @desc    Cancel appointment by user
// @route   PUT /api/appointments/:id/cancel
// @access  Private (Users only)
router.put('/:id/cancel', protect, async (req, res) => {
  try {
    console.log('🚫 Cancelling appointment:', req.params.id);
    console.log('👤 User:', req.user._id);
    
    const appointment = await Appointment.findById(req.params.id)
      .populate('service')
      .populate('user', 'name email')
      .populate('timeSlot');
    
    if (!appointment) {
      return res.status(404).json({ 
        success: false,
        message: 'Appointment not found' 
      });
    }

    // Only appointment owner can cancel
    if (appointment.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false,
        message: 'Not authorized to cancel this appointment' 
      });
    }

    // Cannot cancel already completed or cancelled appointments
    if (appointment.status === 'cancelled') {
      return res.status(400).json({ 
        success: false,
        message: 'Appointment is already cancelled' 
      });
    }

    if (appointment.status === 'completed') {
      return res.status(400).json({ 
        success: false,
        message: 'Cannot cancel completed appointment' 
      });
    }

    // Release the time slot if appointment has one
    if (appointment.timeSlot) {
      const slot = await TimeSlot.findById(appointment.timeSlot._id);
      if (slot) {
        await slot.releaseSlot(appointment._id);
        console.log('🔓 Time slot released');
      }
    }

    const updatedAppointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      { 
        status: 'cancelled',
        notes: req.body.reason ? `Cancelled by user. Reason: ${req.body.reason}` : 'Cancelled by user'
      },
      { new: true }
    ).populate('service').populate('user', 'name email').populate('timeSlot');

    console.log('✅ Appointment cancelled successfully');
    res.json({
      success: true,
      message: 'Appointment cancelled successfully',
      appointment: updatedAppointment
    });
  } catch (error) {
    console.error('💥 Error cancelling appointment:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while cancelling appointment' 
    });
  }
});

// @desc    Reschedule appointment by user using slot swap
// @route   PUT /api/appointments/:id/reschedule-slot
// @access  Private (Users only)
router.put('/:id/reschedule-slot', protect, async (req, res) => {
  try {
    console.log('🔄 Rescheduling appointment with slot swap:', req.params.id);
    console.log('📊 New slot ID:', req.body.newTimeSlot);
    console.log('👤 User:', req.user._id);
    
    const { newTimeSlot, notes } = req.body;
    
    if (!newTimeSlot) {
      return res.status(400).json({ 
        success: false,
        message: 'New time slot is required for rescheduling' 
      });
    }

    // Find the appointment
    const appointment = await Appointment.findById(req.params.id)
      .populate('service')
      .populate('user', 'name email')
      .populate('timeSlot');
    
    if (!appointment) {
      return res.status(404).json({ 
        success: false,
        message: 'Appointment not found' 
      });
    }

    // Only appointment owner can reschedule
    if (appointment.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false,
        message: 'Not authorized to reschedule this appointment' 
      });
    }

    // Can only reschedule pending appointments
    if (appointment.status !== 'pending') {
      return res.status(400).json({ 
        success: false,
        message: 'Can only reschedule pending appointments. Contact provider for confirmed appointments.' 
      });
    }

    // Find the new time slot
    const newSlot = await TimeSlot.findById(newTimeSlot);
    if (!newSlot) {
      return res.status(404).json({ 
        success: false,
        message: 'New time slot not found' 
      });
    }

    // Check if new slot is available
    if (!newSlot.isAvailable) {
      return res.status(400).json({ 
        success: false,
        message: 'Selected time slot is no longer available' 
      });
    }

    // Check if new slot is for the same service
    if (newSlot.service.toString() !== appointment.service._id.toString()) {
      return res.status(400).json({ 
        success: false,
        message: 'New time slot must be for the same service' 
      });
    }

    // Release the current slot if appointment has one
    if (appointment.timeSlot) {
      const currentSlot = await TimeSlot.findById(appointment.timeSlot._id);
      if (currentSlot) {
        await currentSlot.releaseSlot(appointment._id);
      }
    }

    // Book the new slot
    await newSlot.bookSlot(appointment._id);

    // Update the appointment
    const updatedAppointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      { 
        timeSlot: newTimeSlot,
        notes: notes || appointment.notes,
        // Remove legacy date/time fields if they exist
        $unset: { date: 1, time: 1 }
      },
      { new: true, runValidators: true }
    ).populate('service')
     .populate('user', 'name email')
     .populate('timeSlot');

    console.log('✅ Appointment rescheduled successfully with slot swap');
    res.json({
      success: true,
      message: 'Appointment rescheduled successfully',
      appointment: updatedAppointment
    });
  } catch (error) {
    console.error('💥 Error rescheduling appointment with slot:', error);
    res.status(400).json({ 
      success: false,
      message: 'Error rescheduling appointment: ' + error.message 
    });
  }
});

// @desc    Reschedule appointment by user
// @route   PUT /api/appointments/:id/reschedule
// @access  Private (Users only)
router.put('/:id/reschedule', protect, async (req, res) => {
  try {
    console.log('📅 Rescheduling appointment:', req.params.id);
    console.log('📊 New schedule:', req.body);
    console.log('👤 User:', req.user._id);
    
    const { date, time, notes } = req.body;
    
    if (!date || !time) {
      return res.status(400).json({ 
        success: false,
        message: 'Both date and time are required for rescheduling' 
      });
    }

    const appointment = await Appointment.findById(req.params.id)
      .populate('service')
      .populate('user', 'name email');
    
    if (!appointment) {
      return res.status(404).json({ 
        success: false,
        message: 'Appointment not found' 
      });
    }

    // Only appointment owner can reschedule
    if (appointment.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false,
        message: 'Not authorized to reschedule this appointment' 
      });
    }

    // Can only reschedule pending appointments
    if (appointment.status !== 'pending') {
      return res.status(400).json({ 
        success: false,
        message: 'Can only reschedule pending appointments. Contact provider for confirmed appointments.' 
      });
    }

    // Validate date is not in the past
    const appointmentDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (appointmentDate < today) {
      return res.status(400).json({ 
        success: false,
        message: 'Cannot schedule appointment in the past' 
      });
    }

    const updatedAppointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      { 
        date,
        time,
        notes: notes || appointment.notes,
        // Reset status to pending when rescheduled
        status: 'pending'
      },
      { new: true, runValidators: true }
    ).populate('service').populate('user', 'name email');

    console.log('✅ Appointment rescheduled successfully');
    res.json({
      success: true,
      message: 'Appointment rescheduled successfully',
      appointment: updatedAppointment
    });
  } catch (error) {
    console.error('💥 Error rescheduling appointment:', error);
    res.status(400).json({ 
      success: false,
      message: 'Error rescheduling appointment: ' + error.message 
    });
  }
});

module.exports = router;