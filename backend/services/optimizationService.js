/**
 * Secure Routing & Optimization Service
 * 
 * This service implements multi-criteria optimization for hospital selection
 * based on:
 * - Predicted ICU/bed availability
 * - Specialist presence
 * - Travel time under current traffic
 * - Equipment availability
 * 
 * IMPORTANT: This implements the privacy controls required by the system:
 * - Only the FINAL destination hospital name is sent to the ambulance
 * - All comparative data and readiness scores are kept confidential
 */

const { predictiveEngine } = require('./predictionService');
const { trafficService } = require('./trafficService');

class OptimizationService {
  constructor() {
    // Weights for multi-criteria optimization
    this.weights = {
      predictedAvailability: 0.30,  // Weight for predicted capacity
      specialistPresence: 0.20,    // Weight for specialist availability
      travelTime: 0.25,             // Weight for travel time
      equipmentMatch: 0.15,         // Weight for required equipment
      currentLoad: 0.10            // Weight for current hospital load
    };
    
    // Confidence thresholds
    this.minConfidenceThreshold = 0.6;
    this.minPredictionConfidence = 0.5;
  }

  /**
   * Main optimization function - calculates composite readiness scores
   * and returns the optimal hospital selection
   * 
   * @param {Array} hospitals - List of available hospitals
   * @param {Object} patientLocation - Patient's current location
   * @param {Object} patientCondition - Patient's medical condition
   * @returns {Object} - Optimal hospital with ONLY the destination name exposed
   */
  async optimizeHospitalSelection(hospitals, patientLocation, patientCondition) {
    const startTime = Date.now();
    
    // Step 1: Get predictions for all hospitals
    const hospitalPredictions = await Promise.all(
      hospitals.map(hospital => this.getHospitalPrediction(hospital))
    );
    
    // Step 2: Get traffic data for all hospitals
    const trafficData = await Promise.all(
      hospitals.map(hospital => 
        trafficService.getTravelTime(
          patientLocation,
          hospital.location,
          'ambulance'
        )
      )
    );
    
    // Step 3: Calculate composite readiness scores
    const scoredHospitals = hospitals.map((hospital, index) => {
      const prediction = hospitalPredictions[index];
      const traffic = trafficData[index];
      
      const scores = this.calculateCompositeScore(
        hospital,
        prediction,
        traffic,
        patientCondition
      );
      
      return {
        hospitalId: hospital._id,
        hospitalName: hospital.name, // Only exposed for optimal hospital
        scores,
        traffic,
        prediction
      };
    });
    
    // Step 4: Sort by composite score (descending)
    scoredHospitals.sort((a, b) => b.scores.compositeScore - a.scores.compositeScore);
    
    // Step 5: Select optimal hospital
    const optimalHospital = scoredHospitals[0];
    
    // Step 6: Filter out comparative data (privacy control)
    // Only return the optimal hospital's destination info
    const secureResponse = this.createSecureResponse(
      optimalHospital,
      patientCondition,
      Date.now() - startTime
    );
    
    return secureResponse;
  }

  /**
   * Get hospital prediction data
   */
  async getHospitalPrediction(hospital) {
    try {
      return await predictiveEngine.predictHospitalReadiness(hospital);
    } catch (error) {
      console.error(`Prediction error for hospital ${hospital.name}:`, error);
      // Return default prediction on error
      return {
        hospitalId: hospital._id,
        predictions: [{
          predictedBeds: hospital.capacity.availableBeds,
          predictedICU: hospital.capacity.availableICU,
          confidence: 0.5
        }]
      };
    }
  }

  /**
   * Calculate composite readiness score using multi-criteria optimization
   */
  calculateCompositeScore(hospital, prediction, traffic, patientCondition) {
    // 1. Predicted Availability Score (0-100)
    const availabilityScore = this.calculateAvailabilityScore(prediction, patientCondition);
    
    // 2. Specialist Presence Score (0-100)
    const specialistScore = this.calculateSpecialistScore(hospital, patientCondition);
    
    // 3. Travel Time Score (inverse - shorter is better)
    const travelScore = this.calculateTravelScore(traffic);
    
    // 4. Equipment Match Score (0-100)
    const equipmentScore = this.calculateEquipmentScore(hospital, patientCondition);
    
    // 5. Current Load Score (inverse - lower load is better)
    const loadScore = this.calculateLoadScore(hospital);
    
    // Calculate weighted composite score
    const compositeScore = Math.round(
      (availabilityScore * this.weights.predictedAvailability) +
      (specialistScore * this.weights.specialistPresence) +
      (travelScore * this.weights.travelTime) +
      (equipmentScore * this.weights.equipmentMatch) +
      (loadScore * this.weights.currentLoad)
    );
    
    return {
      compositeScore,
      availabilityScore,
      specialistScore,
      travelScore,
      equipmentScore,
      loadScore,
      predictionConfidence: prediction.predictions?.[0]?.confidence || 0.5
    };
  }

  /**
   * Calculate availability score based on predictions
   */
  calculateAvailabilityScore(prediction, patientCondition) {
    const isCritical = patientCondition.severity === 'critical' || 
                       patientCondition.severity === 'severe';
    
    // Get first prediction (nearest future)
    const pred = prediction.predictions?.[0];
    if (!pred) return 50;
    
    if (isCritical) {
      // For critical patients, ICU availability is paramount
      const icuReadiness = pred.predictedICU / Math.max(1, pred.predictedICU + 2);
      return Math.round(icuReadiness * 100);
    } else {
      // For non-critical, general bed availability
      const bedReadiness = pred.predictedBeds / Math.max(10, pred.predictedBeds + 5);
      return Math.round(Math.min(100, bedReadiness * 100));
    }
  }

  /**
   * Calculate specialist presence score
   */
  calculateSpecialistScore(hospital, patientCondition) {
    const requiredSpecialty = patientCondition.requiredSpecialty;
    
    if (!requiredSpecialty) return 70; // Default if no specialty required
    
    const specialist = hospital.specialists?.find(
      s => s.specialty === requiredSpecialty && s.available
    );
    
    if (specialist) return 100;
    if (!specialist) return 30; // Significant penalty for no specialist
    
    return 50;
  }

  /**
   * Calculate travel time score (shorter = higher score)
   */
  calculateTravelScore(traffic) {
    if (!traffic) return 50;
    
    const duration = traffic.durationInTraffic;
    
    // Score based on travel time thresholds
    if (duration <= 10) return 100;
    if (duration <= 15) return 90;
    if (duration <= 20) return 80;
    if (duration <= 30) return 70;
    if (duration <= 45) return 60;
    if (duration <= 60) return 50;
    
    return Math.max(20, 70 - (duration - 45));
  }

  /**
   * Calculate equipment match score
   */
  calculateEquipmentScore(hospital, patientCondition) {
    const requiredEquipment = this.getRequiredEquipment(patientCondition.condition);
    
    if (requiredEquipment.length === 0) return 80;
    
    const availableCount = requiredEquipment.filter(
      equip => hospital.equipment?.[equip]
    ).length;
    
    return Math.round((availableCount / requiredEquipment.length) * 100);
  }

  /**
   * Calculate current load score (inverse)
   */
  calculateLoadScore(hospital) {
    switch (hospital.currentLoad) {
      case 'low': return 100;
      case 'moderate': return 75;
      case 'high': return 50;
      case 'critical': return 25;
      default: return 60;
    }
  }

  /**
   * Get required equipment based on condition
   */
  getRequiredEquipment(condition) {
    const equipmentMap = {
      'cardiac-arrest': ['cathLab', 'bloodBank'],
      'stroke': ['ctScan', 'mri'],
      'trauma': ['xray', 'ctScan', 'bloodBank'],
      'accident': ['xray', 'ctScan', 'bloodBank'],
      'respiratory': ['ventilator', 'oxygenSupply'],
      'burns': ['bloodBank'],
      'poisoning': ['bloodBank'],
      'seizure': ['ctScan', 'mri']
    };
    
    return equipmentMap[condition] || [];
  }

  /**
   * Create secure response - ONLY returns destination info
   * This is the critical privacy control implementation
   */
  createSecureResponse(optimalHospital, patientCondition, processingTime) {
    return {
      // Only destination hospital name is exposed (no comparative data)
      destination: {
        hospitalId: optimalHospital.hospitalId
        // hospitalName and address are intentionally omitted for privacy
      },
      
      // Navigation info for the ambulance
      navigation: {
        distance: optimalHospital.traffic.distance,
        estimatedTime: optimalHospital.traffic.durationInTraffic,
        trafficCondition: optimalHospital.traffic.trafficCondition,
        // Route coordinates for display (but not comparative data)
        routeCoordinates: optimalHospital.traffic.route?.coordinates || []
      },
      
      // Patient info for hospital preparation
      patientInfo: {
        condition: patientCondition.condition,
        severity: patientCondition.severity,
        requiredSpecialty: patientCondition.requiredSpecialty,
        eta: optimalHospital.traffic.durationInTraffic
      },
      
      // Metadata (no scores exposed to field)
      metadata: {
        processedAt: new Date(),
        processingTimeMs: processingTime,
        systemVersion: '2.0.0',
        algorithm: 'multi-criteria-optimization'
      }
    };
  }

  /**
   * Alternative method for internal use (control room)
   * This returns full comparative data for supervisors
   */
  async getInternalRecommendations(hospitals, patientLocation, patientCondition) {
    const allHospitals = await this.optimizeHospitalSelection(
      hospitals, 
      patientLocation, 
      patientCondition
    );
    
    // Return full data for control room analysis
    // This should ONLY be accessible to authorized control room staff
    const scoredHospitals = await Promise.all(
      hospitals.map(async (hospital) => {
        const prediction = await this.getHospitalPrediction(hospital);
        const traffic = await trafficService.getTravelTime(
          patientLocation,
          hospital.location,
          'ambulance'
        );
        
        const scores = this.calculateCompositeScore(
          hospital,
          prediction,
          traffic,
          patientCondition
        );
        
        return {
          hospitalId: hospital._id,
          hospitalName: hospital.name,
          hospitalAddress: hospital.location.address,
          scores,
          traffic,
          prediction,
          selected: hospital._id === allHospitals.destination.hospitalId
        };
      })
    );
    
    // Sort by composite score
    scoredHospitals.sort((a, b) => b.scores.compositeScore - a.scores.compositeScore);
    
    return {
      recommendations: scoredHospitals,
      optimalHospital: scoredHospitals[0],
      generatedAt: new Date()
    };
  }
}

// Export singleton instance
const optimizationService = new OptimizationService();

module.exports = {
  optimizationService,
  OptimizationService
};
