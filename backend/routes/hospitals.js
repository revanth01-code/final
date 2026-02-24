const express = require('express');
const router = express.Router();
const Hospital = require('../models/Hospital');
const protect = require('../middleware/auth');

// @route   GET /api/hospitals
// @desc    Get all hospitals
// @access  Public
router.get('/', async (req, res) => {
  try {
    const hospitals = await Hospital.find({ status: 'active' }).sort({ name: 1 });
    
    res.json({
      success: true,
      count: hospitals.length,
      data: hospitals
    });
  } catch (error) {
    console.error('Get hospitals error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/hospitals/:id
// @desc    Get single hospital
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const hospital = await Hospital.findById(req.params.id);
    
    if (!hospital) {
      return res.status(404).json({ error: 'Hospital not found' });
    }
    
    res.json({
      success: true,
      data: hospital
    });
  } catch (error) {
    console.error('Get hospital error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/hospitals
// @desc    Create new hospital
// @access  Private (Admin only)
router.post('/', protect, async (req, res) => {
  try {
    const hospital = await Hospital.create(req.body);
    
    res.status(201).json({
      success: true,
      data: hospital
    });
  } catch (error) {
    console.error('Create hospital error:', error);
    res.status(400).json({ error: error.message });
  }
});

// @route   PUT /api/hospitals/:id
// @desc    Update hospital
// @access  Private (Hospital staff only)
router.put('/:id', protect, async (req, res) => {
  try {
    const hospital = await Hospital.findByIdAndUpdate(
      req.params.id,
      { 
        ...req.body,
        lastUpdated: Date.now()
      },
      { 
        new: true,
        runValidators: true 
      }
    );
    
    if (!hospital) {
      return res.status(404).json({ error: 'Hospital not found' });
    }
    
    res.json({
      success: true,
      data: hospital
    });
  } catch (error) {
    console.error('Update hospital error:', error);
    res.status(400).json({ error: error.message });
  }
});

// @route   DELETE /api/hospitals/:id
// @desc    Delete hospital
// @access  Private (Admin only)
router.delete('/:id', protect, async (req, res) => {
  try {
    const hospital = await Hospital.findByIdAndDelete(req.params.id);
    
    if (!hospital) {
      return res.status(404).json({ error: 'Hospital not found' });
    }
    
    res.json({
      success: true,
      data: {}
    });
  } catch (error) {
    console.error('Delete hospital error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;