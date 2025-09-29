const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const Service = require('../models/Service');
const Appointment = require('../models/Appointment');
const User = require('../models/User');

const router = express.Router();

router.use(protect);
router.use(authorize('admin'));

router.get('/services', async (req, res) => {
  try {
    const services = await Service.find().populate('provider', 'name email');
    res.json(services);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/appointments', async (req, res) => {
  try {
    const appointments = await Appointment.find()
      .populate('service')
      .populate('user', 'name email');
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/users', async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;