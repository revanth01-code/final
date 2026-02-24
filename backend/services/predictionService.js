/**
 * LSTM-based Predictive Analytics Engine for Hospital Readiness
 * 
 * This service uses time-series forecasting to predict hospital readiness
 * including ICU availability, bed capacity, and specialist presence.
 * 
 * Note: In production, this would use TensorFlow.js or a Python backend
 * with proper LSTM models. Here we implement a simplified prediction algorithm
 * that simulates LSTM behavior with historical data patterns.
 */

class PredictiveEngine {
  constructor() {
    this.lookbackWindow = 24; // 24 hours of historical data
    this.predictionHorizon = 4; // Predict 4 hours ahead
    this.confidenceThreshold = 0.7;
  }

  /**
   * Generate time-series data points from hospital capacity history
   * In production, this would fetch from a time-series database
   */
  async generateTimeSeriesData(hospitalId, hours = 24) {
    const dataPoints = [];
    const now = new Date();
    
    // Simulate historical data based on current state
    // In production, this would query actual historical records
    for (let i = hours; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
      const hourOfDay = timestamp.getHours();
      
      // Simulate realistic patterns (more admissions during day)
      const timeMultiplier = hourOfDay >= 8 && hourOfDay <= 20 ? 1.2 : 0.8;
      
      dataPoints.push({
        timestamp,
        hourOfDay,
        availableBeds: Math.floor(Math.random() * 20 + 10) * timeMultiplier,
        availableICU: Math.floor(Math.random() * 5 + 2),
        availableVentilators: Math.floor(Math.random() * 3 + 1),
        admissions: Math.floor(Math.random() * 5 * timeMultiplier),
        discharges: Math.floor(Math.random() * 4 * timeMultiplier)
      });
    }
    
    return dataPoints;
  }

  /**
   * Simple LSTM-like prediction using exponential smoothing
   * In production, this would use actual LSTM/GRU neural networks
   */
  predictWithLSTM(dataPoints, horizon = 4) {
    if (dataPoints.length < 6) {
      return this.simplePrediction(dataPoints, horizon);
    }

    // Extract time series values
    const bedSeries = dataPoints.map(d => d.availableBeds);
    const icuSeries = dataPoints.map(d => d.availableICU);
    
    // LSTM-style prediction using weighted moving average with trend
    const predictions = [];
    
    for (let h = 1; h <= horizon; h++) {
      // Calculate trend component
      const recentBeds = bedSeries.slice(-6);
      const trend = this.calculateTrend(recentBeds);
      
      // Apply exponential smoothing (simulating LSTM memory)
      const alpha = 0.3; // Smoothing factor
      const smoothedValue = this.exponentialSmoothing(bedSeries, alpha);
      
      // Predict with trend adjustment
      let predictedBeds = smoothedValue + (trend * h * 0.5);
      
      // Add seasonal adjustment
      const hourOfDay = (new Date().getHours() + h) % 24;
      const seasonalFactor = hourOfDay >= 8 && hourOfDay <= 20 ? 1.1 : 0.9;
      predictedBeds *= seasonalFactor;
      
      // Ensure non-negative and within reasonable bounds
      predictedBeds = Math.max(0, Math.min(100, Math.round(predictedBeds)));
      
      // Similar prediction for ICU
      const recentICU = icuSeries.slice(-6);
      const icuTrend = this.calculateTrend(recentICU);
      const smoothedICU = this.exponentialSmoothing(icuSeries, alpha);
      let predictedICU = smoothedICU + (icuTrend * h * 0.3);
      predictedICU = Math.max(0, Math.min(20, Math.round(predictedICU)));
      
      predictions.push({
        horizon: h,
        timestamp: new Date(Date.now() + h * 60 * 60 * 1000),
        predictedBeds,
        predictedICU,
        predictedVentilators: Math.max(0, Math.round(predictedICU * 0.7)),
        confidence: this.calculateConfidence(dataPoints, h)
      });
    }
    
    return predictions;
  }

  /**
   * Calculate trend using linear regression
   */
  calculateTrend(series) {
    if (series.length < 2) return 0;
    
    const n = series.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += series[i];
      sumXY += i * series[i];
      sumX2 += i * i;
    }
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope;
  }

  /**
   * Exponential smoothing for LSTM-like memory effect
   */
  exponentialSmoothing(series, alpha) {
    let result = series[0];
    for (let i = 1; i < series.length; i++) {
      result = alpha * series[i] + (1 - alpha) * result;
    }
    return result;
  }

  /**
   * Simple prediction for limited data
   */
  simplePrediction(dataPoints, horizon) {
    const avgBeds = dataPoints.reduce((sum, d) => sum + d.availableBeds, 0) / dataPoints.length;
    const avgICU = dataPoints.reduce((sum, d) => sum + d.availableICU, 0) / dataPoints.length;
    
    return Array.from({ length: horizon }, (_, i) => ({
      horizon: i + 1,
      timestamp: new Date(Date.now() + (i + 1) * 60 * 60 * 1000),
      predictedBeds: Math.round(avgBeds),
      predictedICU: Math.round(avgICU),
      predictedVentilators: Math.round(avgICU * 0.7),
      confidence: 0.5 // Lower confidence for simple prediction
    }));
  }

  /**
   * Calculate prediction confidence based on data quality
   */
  calculateConfidence(dataPoints, horizon) {
    // More data = higher confidence
    const dataConfidence = Math.min(1, dataPoints.length / 24);
    
    // Shorter horizon = higher confidence
    const horizonConfidence = Math.max(0.3, 1 - (horizon * 0.15));
    
    // Calculate volatility (lower = more consistent = higher confidence)
    const recentBeds = dataPoints.slice(-6).map(d => d.availableBeds);
    const volatility = this.calculateVolatility(recentBeds);
    const volatilityConfidence = Math.max(0.3, 1 - (volatility / 20));
    
    // Combined confidence score
    const confidence = (dataConfidence * 0.4 + horizonConfidence * 0.4 + volatilityConfidence * 0.2);
    
    return Math.round(confidence * 100) / 100;
  }

  /**
   * Calculate volatility (standard deviation)
   */
  calculateVolatility(series) {
    if (series.length < 2) return 0;
    const mean = series.reduce((a, b) => a + b, 0) / series.length;
    const squaredDiffs = series.map(x => Math.pow(x - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / series.length;
    return Math.sqrt(variance);
  }

  /**
   * Main prediction function - generates readiness scores
   */
  async predictHospitalReadiness(hospital) {
    // Get historical data
    const timeSeriesData = await this.generateTimeSeriesData(hospital._id, this.lookbackWindow);
    
    // Generate predictions
    const predictions = this.predictWithLSTM(timeSeriesData, this.predictionHorizon);
    
    // Calculate readiness scores for each prediction
    const readinessScores = predictions.map(pred => {
      const bedReadiness = this.calculateResourceReadiness(
        pred.predictedBeds,
        hospital.capacity.totalBeds
      );
      const icuReadiness = this.calculateResourceReadiness(
        pred.predictedICU,
        hospital.capacity.totalICU
      );
      
      // Weighted composite score
      const compositeScore = (bedReadiness * 0.4) + (icuReadiness * 0.6);
      
      return {
        ...pred,
        bedReadiness: Math.round(bedReadiness),
        icuReadiness: Math.round(icuReadiness),
        compositeScore: Math.round(compositeScore),
        confidenceLevel: this.getConfidenceLevel(pred.confidence)
      };
    });
    
    return {
      hospitalId: hospital._id,
      hospitalName: hospital.name,
      currentStatus: {
        availableBeds: hospital.capacity.availableBeds,
        availableICU: hospital.capacity.availableICU,
        currentLoad: hospital.currentLoad
      },
      predictions: readinessScores,
      generatedAt: new Date()
    };
  }

  /**
   * Calculate resource readiness percentage
   */
  calculateResourceReadiness(available, total) {
    if (total === 0) return 0;
    const ratio = available / total;
    return Math.min(100, Math.round(ratio * 100));
  }

  /**
   * Get confidence level label
   */
  getConfidenceLevel(confidence) {
    if (confidence >= 0.8) return 'high';
    if (confidence >= 0.6) return 'medium';
    return 'low';
  }
}

// Export singleton instance
const predictiveEngine = new PredictiveEngine();

module.exports = {
  predictiveEngine,
  PredictiveEngine
};
