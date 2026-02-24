const express = require('express');
const router = express.Router();
const Request = require('../models/Request');
const Hospital = require('../models/Hospital');
const protect = require('../middleware/auth');
const { recommendHospitals } = require('../utils/routing');

// @route   POST /api/requests/recommend
// @desc    Get hospital recommendations
// @access  Private (Paramedic only)
router.post('/recommend', protect, async (req, res) => {
  try {
    const { patientLocation, patientCondition } = req.body;

    // Validate input
    if (!patientLocation || !patientLocation.latitude || !patientLocation.longitude) {
      return res.status(400).json({ error: 'Patient location is required' });
    }

    if (!patientCondition || !patientCondition.condition || !patientCondition.severity) {
      return res.status(400).json({ error: 'Patient condition details are required' });
    }

    // Get all active hospitals with available beds
    const hospitals = await Hospital.find({
      status: { $in: ['active', 'emergency-only'] },
      $or: [
        { 'capacity.availableBeds': { $gt: 0 } },
        { 'capacity.availableICU': { $gt: 0 } }
      ]
    });

    if (hospitals.length === 0) {
      return res.status(404).json({ 
        error: 'No hospitals with available capacity found',
        recommendations: []
      });
    }

    // Run routing algorithm
    const recommendations = await recommendHospitals(
      hospitals,
      patientLocation,
      patientCondition
    );

    res.json({
      success: true,
      count: recommendations.length,
      recommendations
    });

  } catch (error) {
    console.error('Recommendation error:', error);
    res.status(500).json({ error: 'Server error while generating recommendations' });
  }
});

// @route   POST /api/requests
// @desc    Create new request
// @access  Private (Paramedic only)
router.post('/', protect, async (req, res) => {
  try {
    const { patientCondition, selectedHospital, ambulanceLocation, recommendations } = req.body;

    // Create request
    const request = await Request.create({
      ambulanceId: req.user.ambulanceId,
      paramedic: {
        name: req.user.name,
        phone: req.user.phone
      },
      patient: patientCondition,
      location: ambulanceLocation,
      selectedHospital,
      recommendedHospitals: recommendations,
      status: 'enroute'
    });

    res.status(201).json({
      success: true,
      data: request
    });

  } catch (error) {
    console.error('Create request error:', error);
    res.status(400).json({ error: error.message });
  }
});

// @route   GET /api/requests/:id
// @desc    Get single request
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const request = await Request.findById(req.params.id)
      .populate('selectedHospital', 'name location contact');
    
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }
    
    res.json({
      success: true,
      data: request
    });
  } catch (error) {
    console.error('Get request error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   PUT /api/requests/:id
// @desc    Update request status
// @access  Private
router.put('/:id', protect, async (req, res) => {
  try {
    const updates = { ...req.body };
    
    // Add timestamps for specific status changes
    if (updates.status === 'arrived') {
      updates.arrivedAt = new Date();
    } else if (updates.status === 'completed') {
      updates.completedAt = new Date();
    }

    const request = await Request.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );
    
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }
    
    res.json({
      success: true,
      data: request
    });
  } catch (error) {
    console.error('Update request error:', error);
    res.status(400).json({ error: error.message });
  }
});

// @route   GET /api/requests
// @desc    Get all requests (with filters)
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { status, hospitalId, ambulanceId } = req.query;
    
    let query = {};
    
    if (status) query.status = status;
    if (hospitalId) query.selectedHospital = hospitalId;
    if (ambulanceId) query.ambulanceId = ambulanceId;
    
    const requests = await Request.find(query)
      .populate('selectedHospital', 'name location')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: requests.length,
      data: requests
    });
  } catch (error) {
    console.error('Get requests error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;