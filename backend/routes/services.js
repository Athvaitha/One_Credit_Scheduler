const express = require('express');
const { protect } = require('../middleware/auth');
const Service = require('../models/Service');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const services = await Service.find({ isActive: true })
      .populate('provider', 'name email');
    res.json(services);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', protect, async (req, res) => {
  try {
    const service = await Service.create({
      ...req.body,
      provider: req.user._id
    });
    
    await service.populate('provider', 'name email');
    res.status(201).json(service);
  } catch (error) {
    res.status(400).json({ message: 'Invalid service data' });
  }
});

router.get('/my-services', protect, async (req, res) => {
  try {
    const services = await Service.find({ provider: req.user._id });
    res.json(services);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;