/**
 * Traffic Integration Service
 * 
 * This service provides real-time traffic data integration for calculating
 * accurate ETAs for ambulance routing. It supports multiple traffic data providers
 * and falls back to calculated estimates when APIs are unavailable.
 * 
 * In production, this would integrate with services like:
 * - Google Maps Distance Matrix API
 * - HERE Traffic API
 * - TomTom Routing API
 * - OpenStreetMap with OSRM
 */

class TrafficService {
  constructor() {
    // Configuration for traffic API
    this.config = {
      // Mock API key for demo (in production, use process.env)
      useMockData: true, // Set to false when real API is configured
      trafficUpdateInterval: 60000, // 1 minute
      rushHourMultiplier: 1.5,
      defaultSpeedKmh: 40 // Average city speed
    };
    
    // Cache for traffic data
    this.trafficCache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Calculate travel time between two points
   * In production, this would call a real traffic API
   */
  async getTravelTime(origin, destination, vehicleType = 'ambulance') {
    const cacheKey = `${origin.latitude},${origin.longitude}-${destination.latitude},${destination.longitude}`;
    
    // Check cache first
    const cached = this.trafficCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }

    try {
      // In production, call real traffic API here
      // For demo, calculate based on distance and traffic conditions
      const distance = this.calculateDistance(
        origin.latitude, origin.longitude,
        destination.latitude, destination.longitude
      );

      const trafficCondition = await this.getTrafficCondition(origin, destination);
      const travelTime = this.calculateTravelTimeWithTraffic(
        distance,
        trafficCondition,
        vehicleType
      );

      const result = {
        distance: Math.round(distance * 10) / 10,
        duration: travelTime.duration,
        durationInTraffic: travelTime.durationInTraffic,
        trafficCondition,
        speedAverage: travelTime.speedAverage,
        route: this.generateSimpleRoute(origin, destination),
        updatedAt: new Date()
      };

      // Cache the result
      this.trafficCache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });

      return result;

    } catch (error) {
      console.error('Traffic service error:', error);
      // Fallback to simple calculation
      return this.fallbackCalculation(origin, destination);
    }
  }

  /**
   * Calculate distance using Haversine formula
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
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
   * Get current traffic condition (mock for demo)
   */
  async getTrafficCondition(origin, destination) {
    if (this.config.useMockData) {
      const hour = new Date().getHours();
      
      // Rush hours: 7-9 AM and 5-7 PM
      if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) {
        return 'heavy';
      }
      // Moderate hours: 9 AM - 5 PM
      if (hour >= 9 && hour <= 17) {
        return 'moderate';
      }
      // Night: low traffic
      return 'light';
    }

    // In production, call real traffic API here
    return 'moderate';
  }

  /**
   * Calculate travel time with traffic consideration
   */
  calculateTravelTimeWithTraffic(distance, trafficCondition, vehicleType) {
    let speedMultiplier;
    let baseSpeed;

    switch (trafficCondition) {
      case 'light':
        speedMultiplier = 1.2;
        baseSpeed = this.config.defaultSpeedKmh * 1.2;
        break;
      case 'moderate':
        speedMultiplier = 1.0;
        baseSpeed = this.config.defaultSpeedKmh;
        break;
      case 'heavy':
        speedMultiplier = 0.6;
        baseSpeed = this.config.defaultSpeedKmh * 0.6;
        break;
      default:
        speedMultiplier = 1.0;
        baseSpeed = this.config.defaultSpeedKmh;
    }

    // Ambulances get priority - slightly faster
    if (vehicleType === 'ambulance') {
      speedMultiplier *= 1.15;
    }

    // Calculate duration in minutes
    const duration = Math.round((distance / baseSpeed) * 60);
    const durationInTraffic = Math.round((distance / (baseSpeed * speedMultiplier)) * 60);

    return {
      duration, // Base duration without traffic
      durationInTraffic, // Actual duration with traffic
      speedAverage: Math.round(baseSpeed * speedMultiplier)
    };
  }

  /**
   * Generate simple route information
   */
  generateSimpleRoute(origin, destination) {
    // In production, this would return actual route geometry
    return {
      type: 'fastest',
      instructions: [
        {
          distance: this.calculateDistance(origin.latitude, origin.longitude, destination.latitude, destination.longitude),
          heading: this.calculateHeading(origin, destination),
          maneuver: 'depart'
        }
      ],
      // Simple straight-line path for demo
      coordinates: [
        [origin.latitude, origin.longitude],
        [destination.latitude, destination.longitude]
      ]
    };
  }

  /**
   * Calculate heading between two points
   */
  calculateHeading(origin, destination) {
    const dLon = this.toRad(destination.longitude - origin.longitude);
    const lat1 = this.toRad(origin.latitude);
    const lat2 = this.toRad(destination.latitude);

    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) -
              Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

    let heading = Math.atan2(y, x) * (180 / Math.PI);
    heading = (heading + 360) % 360;
    
    return Math.round(heading);
  }

  /**
   * Fallback calculation when traffic API fails
   */
  fallbackCalculation(origin, destination) {
    const distance = this.calculateDistance(
      origin.latitude, origin.longitude,
      destination.latitude, destination.longitude
    );
    
    const duration = Math.round((distance / this.config.defaultSpeedKmh) * 60);
    
    return {
      distance: Math.round(distance * 10) / 10,
      duration,
      durationInTraffic: Math.round(duration * 1.2), // Assume 20% more traffic
      trafficCondition: 'unknown',
      speedAverage: this.config.defaultSpeedKmh,
      route: this.generateSimpleRoute(origin, destination),
      updatedAt: new Date()
    };
  }

  /**
   * Batch calculate travel times for multiple destinations
   */
  async getMultipleTravelTimes(origin, destinations, vehicleType = 'ambulance') {
    const results = await Promise.all(
      destinations.map(dest => 
        this.getTravelTime(origin, dest, vehicleType)
      )
    );
    
    return destinations.map((dest, index) => ({
      destinationId: dest._id || dest.hospitalId,
      ...results[index]
    }));
  }

  /**
   * Get traffic predictions for a time in the future
   */
  async getPredictedTraffic(origin, destination, futureTimestamp) {
    const now = Date.now();
    const hoursAhead = (futureTimestamp - now) / (1000 * 60 * 60);
    
    if (hoursAhead <= 0) {
      return this.getTravelTime(origin, destination);
    }

    // Predict traffic based on historical patterns
    const predictedDate = new Date(futureTimestamp);
    const hour = predictedDate.getHours();
    const dayOfWeek = predictedDate.getDay();
    
    let predictedCondition;
    
    // Weekend vs weekday patterns
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      // Weekend - generally lighter
      if (hour >= 10 && hour <= 16) {
        predictedCondition = 'light';
      } else {
        predictedCondition = 'moderate';
      }
    } else {
      // Weekday patterns
      if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) {
        predictedCondition = 'heavy';
      } else if (hour >= 9 && hour <= 17) {
        predictedCondition = 'moderate';
      } else {
        predictedCondition = 'light';
      }
    }

    const distance = this.calculateDistance(
      origin.latitude, origin.longitude,
      destination.latitude, destination.longitude
    );

    const travelTime = this.calculateTravelTimeWithTraffic(
      distance,
      predictedCondition,
      'ambulance'
    );

    return {
      distance: Math.round(distance * 10) / 10,
      duration: travelTime.duration,
      durationInTraffic: travelTime.durationInTraffic,
      trafficCondition: predictedCondition,
      predictedFor: futureTimestamp,
      confidence: Math.max(0.5, 1 - (hoursAhead * 0.1)), // Lower confidence for longer predictions
      speedAverage: travelTime.speedAverage
    };
  }

  /**
   * Clear expired cache entries
   */
  clearCache() {
    const now = Date.now();
    for (const [key, value] of this.trafficCache.entries()) {
      if (now - value.timestamp > this.cacheExpiry) {
        this.trafficCache.delete(key);
      }
    }
  }
}

// Export singleton instance
const trafficService = new TrafficService();

module.exports = {
  trafficService,
  TrafficService
};
