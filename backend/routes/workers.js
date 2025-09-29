const express = require('express');
const { protect } = require('../middleware/auth');
const Worker = require('../models/Worker');

const router = express.Router();

// Middleware to ensure only service providers can access these routes
const requireProvider = (req, res, next) => {
  if (req.user.role !== 'provider') {
    return res.status(403).json({ 
      message: 'Access denied. Only service providers can manage workers.' 
    });
  }
  next();
};

// @desc    Create a new worker
// @route   POST /api/workers
// @access  Private (Service Providers only)
router.post('/', protect, requireProvider, async (req, res) => {
  try {
    console.log('🔄 Creating new worker...');
    console.log('📊 Request data:', req.body);
    console.log('👤 Provider ID:', req.user._id);

    // Add provider ID to the worker data
    const workerData = {
      ...req.body,
      provider: req.user._id
    };

    const worker = await Worker.create(workerData);
    
    console.log('✅ Worker created successfully:', worker._id);
    res.status(201).json({
      success: true,
      message: 'Worker created successfully',
      worker: worker
    });
  } catch (error) {
    console.error('❌ Error creating worker:', error);
    
    // Handle duplicate email error
    if (error.code === 11000 && error.keyPattern && error.keyPattern.email) {
      return res.status(400).json({
        success: false,
        message: 'A worker with this email already exists'
      });
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error while creating worker'
    });
  }
});

// @desc    Get all workers for the current service provider
// @route   GET /api/workers
// @access  Private (Service Providers only)
router.get('/', protect, requireProvider, async (req, res) => {
  try {
    console.log('🔄 Fetching workers for provider:', req.user._id);
    
    const { status } = req.query;
    let workers;
    
    if (status && status !== 'all') {
      workers = await Worker.findByProvider(req.user._id, status);
    } else {
      workers = await Worker.findByProvider(req.user._id);
    }
    
    console.log(`✅ Found ${workers.length} workers`);
    
    res.json({
      success: true,
      count: workers.length,
      workers: workers
    });
  } catch (error) {
    console.error('❌ Error fetching workers:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching workers'
    });
  }
});

// @desc    Get single worker by ID
// @route   GET /api/workers/:id
// @access  Private (Service Providers only)
router.get('/:id', protect, requireProvider, async (req, res) => {
  try {
    console.log('🔄 Fetching worker:', req.params.id);
    
    const worker = await Worker.findOne({
      _id: req.params.id,
      provider: req.user._id
    });
    
    if (!worker) {
      return res.status(404).json({
        success: false,
        message: 'Worker not found'
      });
    }
    
    console.log('✅ Worker found:', worker.name);
    
    res.json({
      success: true,
      worker: worker
    });
  } catch (error) {
    console.error('❌ Error fetching worker:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching worker'
    });
  }
});

// @desc    Update worker
// @route   PUT /api/workers/:id
// @access  Private (Service Providers only)
router.put('/:id', protect, requireProvider, async (req, res) => {
  try {
    console.log('🔄 Updating worker:', req.params.id);
    console.log('📊 Update data:', req.body);
    
    const worker = await Worker.findOne({
      _id: req.params.id,
      provider: req.user._id
    });
    
    if (!worker) {
      return res.status(404).json({
        success: false,
        message: 'Worker not found'
      });
    }
    
    // Prevent changing the provider
    delete req.body.provider;
    
    const updatedWorker = await Worker.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );
    
    console.log('✅ Worker updated successfully');
    
    res.json({
      success: true,
      message: 'Worker updated successfully',
      worker: updatedWorker
    });
  } catch (error) {
    console.error('❌ Error updating worker:', error);
    
    // Handle duplicate email error
    if (error.code === 11000 && error.keyPattern && error.keyPattern.email) {
      return res.status(400).json({
        success: false,
        message: 'A worker with this email already exists'
      });
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error while updating worker'
    });
  }
});

// @desc    Delete worker
// @route   DELETE /api/workers/:id
// @access  Private (Service Providers only)
router.delete('/:id', protect, requireProvider, async (req, res) => {
  try {
    console.log('🔄 Deleting worker:', req.params.id);
    
    const worker = await Worker.findOne({
      _id: req.params.id,
      provider: req.user._id
    });
    
    if (!worker) {
      return res.status(404).json({
        success: false,
        message: 'Worker not found'
      });
    }
    
    await Worker.findByIdAndDelete(req.params.id);
    
    console.log('✅ Worker deleted successfully');
    
    res.json({
      success: true,
      message: 'Worker deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting worker:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting worker'
    });
  }
});

// @desc    Get worker statistics
// @route   GET /api/workers/stats/summary
// @access  Private (Service Providers only)
router.get('/stats/summary', protect, requireProvider, async (req, res) => {
  try {
    console.log('🔄 Generating worker statistics for provider:', req.user._id);
    
    const totalWorkers = await Worker.countDocuments({ provider: req.user._id });
    const activeWorkers = await Worker.countDocuments({ provider: req.user._id, status: 'Active' });
    const inactiveWorkers = await Worker.countDocuments({ provider: req.user._id, status: 'Inactive' });
    const onLeaveWorkers = await Worker.countDocuments({ provider: req.user._id, status: 'On Leave' });
    
    // Get average experience
    const experienceStats = await Worker.aggregate([
      { $match: { provider: req.user._id } },
      { $group: {
          _id: null,
          avgExperience: { $avg: '$experience' },
          totalExperience: { $sum: '$experience' },
          minExperience: { $min: '$experience' },
          maxExperience: { $max: '$experience' }
        }
      }
    ]);
    
    const stats = {
      totalWorkers,
      activeWorkers,
      inactiveWorkers,
      onLeaveWorkers,
      experience: experienceStats[0] || {
        avgExperience: 0,
        totalExperience: 0,
        minExperience: 0,
        maxExperience: 0
      }
    };
    
    console.log('✅ Statistics generated successfully');
    
    res.json({
      success: true,
      stats: stats
    });
  } catch (error) {
    console.error('❌ Error generating statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while generating statistics'
    });
  }
});

module.exports = router;