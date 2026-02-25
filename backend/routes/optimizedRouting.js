/**
 * Optimized Routing API
 * 
 * This route implements the secure routing endpoint that:
 * - Uses multi-criteria optimization
 * - Integrates predictions and traffic
 * - Only returns destination info (privacy control)
 * - Logs all decisions to audit trail
 */

const express = require('express');
const router = express.Router();
const Hospital = require('../models/Hospital');
const Request = require('../models/Request');
const Ambulance = require('../models/Ambulance');
const User = require('../models/User');
const protect = require('../middleware/auth');
const { optimizationService } = require('../services/optimizationService');
const { gpsMonitoringService } = require('../services/gpsMonitoringService');
const { auditService } = require('../services/auditService');
const { getIO } = require('../socket/socketInstance');

// @route   POST /api/optimized-routing/calculate
// @desc    Calculate optimal hospital with privacy controls
// @access  Private (Paramedic only)
router.post('/calculate', protect, async (req, res) => {
  try {
    const { patientLocation, patientCondition } = req.body;

    // Validate input
    if (!patientLocation || !patientLocation.latitude || !patientLocation.longitude) {
      return res.status(400).json({ error: 'Patient location is required' });
    }

    if (!patientCondition || !patientCondition.condition || !patientCondition.severity) {
      return res.status(400).json({ error: 'Patient condition details are required' });
    }

    // Get all active hospitals with available capacity
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

    // Run optimized hospital selection
    const result = await optimizationService.optimizeHospitalSelection(
      hospitals,
      patientLocation,
      patientCondition
    );

    // Log the routing decision
    auditService.logRoutingDecision({
      id: `routing-${Date.now()}`,
      patientCondition,
      selectedHospital: result.destination,
      processingTime: result.metadata.processingTimeMs
    }, {
      id: req.user._id,
      role: req.user.role,
      name: req.user.name,
      ambulanceId: req.user.ambulanceId
    });

    // Return ONLY destination info (privacy control)
    res.json({
      success: true,
      destination: result.destination,
      navigation: result.navigation,
      patientInfo: result.patientInfo,
      metadata: result.metadata
    });

  } catch (error) {
    console.error('Optimized routing error:', error);
    res.status(500).json({ error: 'Server error while calculating optimal route' });
  }
});

// @route   POST /api/optimized-routing/confirm
// @desc    Confirm hospital selection and start GPS tracking
// @access  Private (Paramedic only)
router.post('/confirm', protect, async (req, res) => {
  try {
    console.log('Confirm route called by user:', req.user && {
      id: req.user._id,
      role: req.user.role,
      ambulanceId: req.user.ambulanceId,
      hospitalId: req.user.hospitalId
    });

    const { hospitalId, patientLocation, patientCondition, navigation } = req.body;

    // Validate input
    if (!hospitalId) {
      return res.status(400).json({ error: 'Hospital selection is required' });
    }

    // Verify hospital exists
    const hospital = await Hospital.findById(hospitalId);
    if (!hospital) {
      return res.status(404).json({ error: 'Hospital not found' });
    }

    // make sure only a paramedic can call this endpoint
    if (req.user.role !== 'paramedic') {
      return res.status(403).json({ error: 'Only paramedics can confirm a hospital' });
    }

    // ensure paramedic has an ambulance assigned; if not, attempt to auto-assign
    let ambulanceIdToUse = req.user.ambulanceId;
    if (!ambulanceIdToUse) {
      console.warn(`User ${req.user.email} has no ambulanceId, attempting auto-assignment.`);
      const availableAmb = await Ambulance.findOne({ status: 'available' });
      if (availableAmb) {
        ambulanceIdToUse = availableAmb._id;
        // persist on user record for future calls
        await User.findByIdAndUpdate(req.user._id, { ambulanceId: ambulanceIdToUse });
        req.user.ambulanceId = ambulanceIdToUse;
        console.log(`Auto-assigned ambulance ${availableAmb.licensePlate} to user ${req.user.email}`);
      } else {
        return res.status(400).json({ error: 'No ambulance assigned or available for this paramedic' });
      }
    }

    // Create request record
    const request = await Request.create({
      ambulance: req.user.ambulanceId,
      paramedic: {
        name: req.user.name,
        phone: req.user.phone
      },
      patient: patientCondition,
      location: patientLocation,
      selectedHospital: hospitalId,
      recommendedHospitals: [], // Not storing comparative data
      status: 'enroute',
      // Additional tracking fields
      navigation: {
        distance: navigation?.distance,
        estimatedTime: navigation?.estimatedTime,
        routeCoordinates: navigation?.routeCoordinates
      },
      tracking: {
        startedAt: new Date(),
        currentLocation: patientLocation,
        deviationAlerts: []
      }
    });

    // Start GPS tracking
    const trackingSession = gpsMonitoringService.startTracking(
      request._id,
      req.user.ambulanceId,
      patientLocation,
      hospital.location,
      {
        coordinates: navigation?.routeCoordinates || [],
        durationInTraffic: navigation?.estimatedTime
      }
    );

    // Log crew acknowledgment
    await auditService.logCrewAcknowledgment({
      requestId: request._id,
      hospitalName: hospital.name
    }, {
      id: req.user._id,
      role: req.user.role,
      name: req.user.name,
      ambulanceId: req.user.ambulanceId
    });

    // notify the paramedic's ambulance socket so UI can show notification
    try {
      const io = getIO();
      io.to(`ambulance-${req.user.ambulanceId}`).emit('hospital-confirmed', {
        requestId: request._id,
        hospitalId,
        hospitalName: hospital.name,
        eta: navigation?.estimatedTime
      });

      // also inform hospital directly from server in case paramedic disconnects early
      io.to(`hospital-${hospitalId}`).emit('incoming-patient', {
        requestId: request._id,
        patientAge: patientCondition.age,
        patientGender: patientCondition.gender,
        condition: patientCondition.condition,
        severity: patientCondition.severity,
        requiredSpecialty: patientCondition.requiredSpecialty,
        vitals: patientCondition.vitals,
        eta: navigation?.estimatedTime,
        ambulanceId: req.user.ambulanceId,
        paramedicName: req.user.name,
        paramedicPhone: req.user.phone,
        ambulanceLocation: patientLocation,
        timestamp: new Date()
      });
    } catch (emitErr) {
      console.warn('Unable to emit socket events on confirm:', emitErr.message);
    }

    // Return confirmation with tracking info
    res.json({
      success: true,
      requestId: request._id,
      destination: {
        hospitalId,
        // hospitalName and address are intentionally omitted for privacy
      },
      tracking: {
        trackingId: trackingSession.requestId,
        expectedArrival: trackingSession.expectedArrival
      },
      message: 'Hospital confirmed. GPS tracking started.'
    });

  } catch (error) {
    console.error('Confirm routing error:', error);
    res.status(500).json({ error: 'Server error while confirming hospital selection' });
  }
});

// @route   PUT /api/optimized-routing/track-location
// @desc    Update ambulance location for GPS tracking
// @access  Private (Paramedic only)
router.put('/track-location', protect, async (req, res) => {
  try {
    const { requestId, location } = req.body;

    if (!requestId || !location || !location.latitude || !location.longitude) {
      return res.status(400).json({ error: 'Request ID and location are required' });
    }

    // Update location in GPS service
    const trackingResult = gpsMonitoringService.updateLocation(requestId, location);

    // Log GPS update
    auditService.logGPSUpdate({
      requestId,
      ambulanceId: req.user.ambulanceId,
      location,
      timestamp: new Date()
    });

    if (!trackingResult) {
      return res.status(404).json({ error: 'Active tracking session not found' });
    }

    res.json({
      success: true,
      tracking: trackingResult
    });

  } catch (error) {
    console.error('GPS tracking error:', error);
    res.status(500).json({ error: 'Server error while updating location' });
  }
});

// @route   POST /api/optimized-routing/deviation-acknowledge
// @desc    Acknowledge a route deviation alert
// @access  Private (Paramedic/Dispatcher)
router.post('/deviation-acknowledge', protect, async (req, res) => {
  try {
    const { requestId, alertId } = req.body;

    if (!requestId || !alertId) {
      return res.status(400).json({ error: 'Request ID and alert ID are required' });
    }

    const result = gpsMonitoringService.acknowledgeAlert(
      requestId,
      alertId,
      {
        id: req.user._id,
        name: req.user.name,
        role: req.user.role
      }
    );

    if (!result.success) {
      return res.status(404).json({ error: result.error });
    }

    res.json({
      success: true,
      alert: result.alert
    });

  } catch (error) {
    console.error('Deviation acknowledgment error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/optimized-routing/deviation-resolve
// @desc    Resolve a route deviation alert
// @access  Private (Dispatcher)
router.post('/deviation-resolve', protect, async (req, res) => {
  try {
    const { requestId, alertId, resolution } = req.body;

    if (!requestId || !alertId || !resolution) {
      return res.status(400).json({ error: 'Request ID, alert ID, and resolution are required' });
    }

    const result = gpsMonitoringService.resolveAlert(
      requestId,
      alertId,
      {
        ...resolution,
        resolvedBy: {
          id: req.user._id,
          name: req.user.name,
          role: req.user.role
        }
      }
    );

    if (!result.success) {
      return res.status(404).json({ error: result.error });
    }

    // Log deviation resolution
    auditService.logDeviation({
      requestId,
      alertId,
      resolved: true,
      resolution
    });

    res.json({
      success: true,
      alert: result.alert
    });

  } catch (error) {
    console.error('Deviation resolution error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   PUT /api/optimized-routing/complete
// @desc    Complete the trip and stop GPS tracking
// @access  Private (Paramedic only)
router.put('/complete', protect, async (req, res) => {
  try {
    const { requestId, finalLocation } = req.body;

    if (!requestId) {
      return res.status(400).json({ error: 'Request ID is required' });
    }

    // Stop GPS tracking
    const result = gpsMonitoringService.stopTracking(requestId, finalLocation);

    if (!result) {
      return res.status(404).json({ error: 'Active tracking session not found' });
    }

    // Update request status
    await Request.findByIdAndUpdate(requestId, {
      status: 'arrived',
      arrivedAt: new Date(),
      'tracking.completedAt': new Date(),
      'tracking.finalStats': result.finalStats
    });

    // Log route completion
    auditService.logRouteCompletion({
      requestId,
      ambulanceId: req.user.ambulanceId,
      hospitalId: result.session.destination?._id,
      hospitalName: result.session.destination?.name,
      totalDistance: result.finalStats.totalDistance,
      totalTime: result.finalStats.totalTime,
      averageSpeed: result.finalStats.averageSpeed,
      deviationCount: result.finalStats.deviationCount
    });

    res.json({
      success: true,
      tripCompleted: true,
      finalStats: result.finalStats
    });

  } catch (error) {
    console.error('Complete trip error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/optimized-routing/status/:requestId
// @desc    Get current tracking status
// @access  Private
router.get('/status/:requestId', protect, async (req, res) => {
  try {
    const { requestId } = req.params;

    const status = gpsMonitoringService.getTrackingStatus(requestId);

    if (!status) {
      return res.status(404).json({ error: 'Tracking session not found' });
    }

    res.json({
      success: true,
      tracking: status
    });

  } catch (error) {
    console.error('Get tracking status error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/optimized-routing/active-tracked
// @desc    Get all active tracked ambulances (for control room)
// @access  Private (Admin/Dispatcher)
router.get('/active-tracked', protect, async (req, res) => {
  try {
    // Check authorization
    if (!['admin', 'dispatcher'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const active = gpsMonitoringService.getAllActiveTracked();

    res.json({
      success: true,
      count: active.length,
      trackedAmbulances: active
    });

  } catch (error) {
    console.error('Get active tracked error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/optimized-routing/audit/:requestId
// @desc    Get audit trail for a request
// @access  Private (Admin/Supervisor)
router.get('/audit/:requestId', protect, async (req, res) => {
  try {
    const { requestId } = req.params;

    const auditTrail = auditService.getRequestAuditTrail(requestId);

    res.json({
      success: true,
      auditTrail: auditTrail.data,
      pagination: auditTrail.pagination
    });

  } catch (error) {
    console.error('Get audit trail error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
