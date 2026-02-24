/**
 * GPS Monitoring Service
 * 
 * This service handles real-time GPS tracking for ambulances and detects
 * route deviations. It includes:
 * - Real-time location tracking
 * - Route deviation detection
 * - Automated alerts for unauthorized deviations
 * - Route comparison for audit trail
 */

const { trafficService } = require('./trafficService');

class GPSMonitoringService {
  constructor() {
    // Store active ambulance tracking sessions
    this.activeTrackedAmbulances = new Map();
    
    // Deviation thresholds
    this.deviationThresholds = {
      distanceMeters: 200, // 200 meters off route triggers alert
      timeDelayMinutes: 5, // 5 minutes behind schedule triggers alert
      angleDegrees: 45, // 45 degree deviation from route triggers alert
    };
    
    // Route update interval (30 seconds)
    this.updateInterval = 30000;
  }

  /**
   * Start tracking an ambulance
   */
  startTracking(requestId, ambulanceId, origin, destination, recommendedRoute) {
    const trackingSession = {
      requestId,
      ambulanceId,
      origin,
      destination,
      recommendedRoute,
      startTime: new Date(),
      lastUpdate: new Date(),
      locationHistory: [],
      deviationAlerts: [],
      status: 'tracking',
      expectedArrival: this.calculateExpectedArrival(origin, destination)
    };
    
    this.activeTrackedAmbulances.set(requestId, trackingSession);
    
    console.log(`📍 Started GPS tracking for ambulance ${ambulanceId} (Request: ${requestId})`);
    
    return trackingSession;
  }

  /**
   * Update ambulance location
   */
  updateLocation(requestId, location) {
    const session = this.activeTrackedAmbulances.get(requestId);
    
    if (!session) {
      console.warn(`No active tracking session for request ${requestId}`);
      return null;
    }
    
    const locationUpdate = {
      ...location,
      timestamp: new Date(),
      speed: location.speed || 0,
      heading: location.heading || 0
    };
    
    // Add to history
    session.locationHistory.push(locationUpdate);
    session.lastUpdate = new Date();
    
    // Keep only last 100 locations
    if (session.locationHistory.length > 100) {
      session.locationHistory = session.locationHistory.slice(-100);
    }
    
    // Check for deviations
    const deviationCheck = this.checkRouteDeviation(session, location);
    
    if (deviationCheck.isDeviating) {
      this.handleDeviation(session, deviationCheck);
    }
    
    // Update expected arrival time
    session.expectedArrival = this.calculateExpectedArrival(
      location,
      session.destination
    );
    
    return {
      status: 'tracking',
      deviationAlert: deviationCheck.isDeviating,
      deviationDetails: deviationCheck,
      expectedArrival: session.expectedArrival
    };
  }

  /**
   * Check if ambulance is deviating from recommended route
   */
  checkRouteDeviation(session, currentLocation) {
    const result = {
      isDeviating: false,
      distanceFromRoute: 0,
      deviationAngle: 0,
      delayMinutes: 0,
      reasons: []
    };
    
    // Check distance from recommended route
    if (session.recommendedRoute && session.recommendedRoute.coordinates) {
      const minDistance = this.calculateMinDistanceFromRoute(
        currentLocation,
        session.recommendedRoute.coordinates
      );
      
      result.distanceFromRoute = minDistance;
      
      if (minDistance > this.deviationThresholds.distanceMeters) {
        result.isDeviating = true;
        result.reasons.push(`Off route by ${Math.round(minDistance)}m`);
      }
    }
    
    // Check heading deviation
    if (session.recommendedRoute && session.recommendedRoute.heading) {
      const headingDiff = Math.abs(
        this.normalizeAngle(currentLocation.heading - session.recommendedRoute.heading)
      );
      
      result.deviationAngle = headingDiff;
      
      if (headingDiff > this.deviationThresholds.angleDegrees) {
        result.isDeviating = true;
        result.reasons.push(`Heading deviation: ${Math.round(headingDiff)}°`);
      }
    }
    
    // Check time delay
    const expectedArrival = session.expectedArrival;
    const now = new Date();
    const scheduledArrival = new Date(session.startTime.getTime() + 
      (session.recommendedRoute?.durationInTraffic || 30) * 60 * 1000);
    
    // Calculate how much behind schedule
    if (now > scheduledArrival) {
      result.delayMinutes = Math.round((now - scheduledArrival) / 60000);
      
      if (result.delayMinutes > this.deviationThresholds.timeDelayMinutes) {
        result.isDeviating = true;
        result.reasons.push(`${result.delayMinutes} minutes behind schedule`);
      }
    }
    
    return result;
  }

  /**
   * Calculate minimum distance from a route (in meters)
   */
  calculateMinDistanceFromRoute(location, routeCoordinates) {
    let minDistance = Infinity;
    
    for (const coord of routeCoordinates) {
      const distance = this.calculateDistanceMeters(
        location.latitude,
        location.longitude,
        coord[0],
        coord[1]
      );
      
      if (distance < minDistance) {
        minDistance = distance;
      }
    }
    
    return minDistance;
  }

  /**
   * Calculate distance in meters between two points
   */
  calculateDistanceMeters(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  toRad(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Normalize angle to 0-360 range
   */
  normalizeAngle(angle) {
    angle = angle % 360;
    if (angle < 0) angle += 360;
    return angle;
  }

  /**
   * Handle deviation - create alert
   */
  handleDeviation(session, deviationDetails) {
    const alert = {
      id: `alert-${Date.now()}`,
      requestId: session.requestId,
      ambulanceId: session.ambulanceId,
      timestamp: new Date(),
      type: 'ROUTE_DEVIATION',
      severity: this.calculateAlertSeverity(deviationDetails),
      details: deviationDetails,
      currentLocation: session.locationHistory[session.locationHistory.length - 1],
      acknowledged: false,
      resolved: false
    };
    
    session.deviationAlerts.push(alert);
    
    console.log(`⚠️ ROUTE DEVIATION ALERT for ambulance ${session.ambulanceId}:`, 
      deviationDetails.reasons);
    
    return alert;
  }

  /**
   * Calculate alert severity based on deviation
   */
  calculateAlertSeverity(deviationDetails) {
    // High severity if more than 500m off route or more than 10 min delay
    if (deviationDetails.distanceFromRoute > 500 || 
        deviationDetails.delayMinutes > 10) {
      return 'high';
    }
    
    // Medium severity for moderate deviations
    if (deviationDetails.distanceFromRoute > 300 || 
        deviationDetails.delayMinutes > 5) {
      return 'medium';
    }
    
    return 'low';
  }

  /**
   * Calculate expected arrival time based on current location
   */
  calculateExpectedArrival(currentLocation, destination) {
    const distance = this.calculateDistanceMeters(
      currentLocation.latitude,
      currentLocation.longitude,
      destination.latitude,
      destination.longitude
    );
    
    // Assume average ambulance speed of 40 km/h in city
    const speedKmh = 40;
    const timeHours = distance / 1000 / speedKmh;
    const timeMinutes = Math.round(timeHours * 60);
    
    return {
      estimatedDistanceMeters: distance,
      estimatedTimeMinutes: timeMinutes,
      estimatedArrival: new Date(Date.now() + timeMinutes * 60000)
    };
  }

  /**
   * Stop tracking an ambulance
   */
  stopTracking(requestId, finalLocation = null) {
    const session = this.activeTrackedAmbulances.get(requestId);
    
    if (!session) {
      return null;
    }
    
    // Add final location if provided
    if (finalLocation) {
      session.locationHistory.push({
        ...finalLocation,
        timestamp: new Date()
      });
    }
    
    session.status = 'completed';
    session.endTime = new Date();
    
    // Calculate final statistics
    const finalStats = this.calculateFinalStats(session);
    
    console.log(`✅ Stopped GPS tracking for ambulance ${session.ambulanceId}`);
    console.log(`📊 Trip statistics:`, finalStats);
    
    // Remove from active tracking but keep data for audit
    this.activeTrackedAmbulances.delete(requestId);
    
    return {
      session,
      finalStats
    };
  }

  /**
   * Calculate final trip statistics
   */
  calculateFinalStats(session) {
    if (session.locationHistory.length < 2) {
      return {
        totalDistance: 0,
        totalTime: 0,
        averageSpeed: 0,
        deviationCount: session.deviationAlerts.length,
        totalDeviationTime: 0
      };
    }
    
    // Calculate total distance traveled
    let totalDistance = 0;
    for (let i = 1; i < session.locationHistory.length; i++) {
      totalDistance += this.calculateDistanceMeters(
        session.locationHistory[i-1].latitude,
        session.locationHistory[i-1].longitude,
        session.locationHistory[i].latitude,
        session.locationHistory[i].longitude
      );
    }
    
    // Calculate total time
    const startTime = session.locationHistory[0].timestamp;
    const endTime = session.locationHistory[session.locationHistory.length - 1].timestamp;
    const totalTimeMinutes = Math.round((endTime - startTime) / 60000);
    
    // Calculate average speed
    const totalTimeHours = totalTimeMinutes / 60;
    const totalDistanceKm = totalDistance / 1000;
    const averageSpeed = totalTimeHours > 0 ? 
      Math.round(totalDistanceKm / totalTimeHours) : 0;
    
    // Calculate total deviation time
    const totalDeviationTime = session.deviationAlerts.reduce((sum, alert) => {
      return sum + (alert.resolved ? (alert.resolvedAt - alert.timestamp) / 60000 : 0);
    }, 0);
    
    return {
      totalDistance: Math.round(totalDistance),
      totalDistanceKm: Math.round(totalDistanceKm * 10) / 10,
      totalTime: totalTimeMinutes,
      averageSpeed,
      deviationCount: session.deviationAlerts.length,
      totalDeviationTime: Math.round(totalDeviationTime)
    };
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(requestId, alertId, acknowledgedBy) {
    const session = this.activeTrackedAmbulances.get(requestId);
    
    if (!session) {
      return { success: false, error: 'Session not found' };
    }
    
    const alert = session.deviationAlerts.find(a => a.id === alertId);
    
    if (!alert) {
      return { success: false, error: 'Alert not found' };
    }
    
    alert.acknowledged = true;
    alert.acknowledgedBy = acknowledgedBy;
    alert.acknowledgedAt = new Date();
    
    return { success: true, alert };
  }

  /**
   * Resolve a deviation alert
   */
  resolveAlert(requestId, alertId, resolution) {
    const session = this.activeTrackedAmbulances.get(requestId);
    
    if (!session) {
      return { success: false, error: 'Session not found' };
    }
    
    const alert = session.deviationAlerts.find(a => a.id === alertId);
    
    if (!alert) {
      return { success: false, error: 'Alert not found' };
    }
    
    alert.resolved = true;
    alert.resolvedAt = new Date();
    alert.resolution = resolution;
    
    return { success: true, alert };
  }

  /**
   * Get current tracking status for an ambulance
   */
  getTrackingStatus(requestId) {
    const session = this.activeTrackedAmbulances.get(requestId);
    
    if (!session) {
      return null;
    }
    
    const currentLocation = session.locationHistory[session.locationHistory.length - 1];
    
    return {
      requestId: session.requestId,
      ambulanceId: session.ambulanceId,
      status: session.status,
      currentLocation,
      destination: session.destination,
      expectedArrival: session.expectedArrival,
      activeAlerts: session.deviationAlerts.filter(a => !a.resolved),
      deviationCount: session.deviationAlerts.length,
      lastUpdate: session.lastUpdate
    };
  }

  /**
   * Get all active tracked ambulances
   */
  getAllActiveTracked() {
    const active = [];
    
    for (const [requestId, session] of this.activeTrackedAmbulances.entries()) {
      const currentLocation = session.locationHistory[session.locationHistory.length - 1];
      
      active.push({
        requestId,
        ambulanceId: session.ambulanceId,
        status: session.status,
        currentLocation,
        destination: session.destination,
        expectedArrival: session.expectedArrival,
        activeAlerts: session.deviationAlerts.filter(a => !a.resolved).length
      });
    }
    
    return active;
  }
}

// Export singleton instance
const gpsMonitoringService = new GPSMonitoringService();

module.exports = {
  gpsMonitoringService,
  GPSMonitoringService
};
