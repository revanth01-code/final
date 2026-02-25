/**
 * Immutable Audit Trail Service
 *
 * This service creates an immutable audit trail for:
 * - All routing decisions
 * - Crew acknowledgments
 * - Actual traveled paths
 * - Deviation alerts and resolutions
 * - System actions
 *
 * It uses a database and hash-chaining to ensure a verifiable log.
 */

const crypto = require('crypto');
const Audit = require('../models/Audit');

class AuditService {
  constructor() {
    // The service is now stateful regarding the last hash,
    // which it fetches from the database.
    this.lastHash = null;
  }

  /**
   * Fetches the hash of the most recent audit entry.
   */
  async getPreviousHash() {
    if (this.lastHash) {
      return this.lastHash;
    }

    const lastEntry = await Audit.findOne().sort({ timestamp: -1 });
    if (lastEntry) {
      this.lastHash = lastEntry.hash;
      return this.lastHash;
    }

    return 'genesis'; // Default for the first entry
  }

  /**
   * Create an immutable audit log entry in the database.
   */
  async createLogEntry(actionType, actor, details, metadata = {}) {
    const timestamp = new Date();
    const previousHash = await this.getPreviousHash();

    // Create log entry data
    const logData = {
      event: actionType,
      user: actor.id,
      request: details.requestId,
      ambulance: details.ambulanceId || actor.ambulanceId,
      details: this.sanitizeDetails(details),
      // Chain hash (for immutability verification)
      previousHash: previousHash,
      hash: null // Will be calculated
    };

    // Calculate hash for this entry
    logData.hash = this.calculateHash(logData, timestamp);

    // Save the entry to the database
    const newEntry = await Audit.create(logData);

    // Update the last hash for the next entry
    this.lastHash = newEntry.hash;

    console.log(`📋 Audit log created: ${actionType} by ${actor.role} at ${timestamp.toISOString()}`);
    return newEntry;
  }

  /**
   * Calculate SHA-256 hash for an entry.
   */
  calculateHash(entryData, timestamp) {
    const hashInput = JSON.stringify({
      timestamp: timestamp.toISOString(),
      event: entryData.event,
      user: entryData.user,
      details: entryData.details,
      previousHash: entryData.previousHash
    });

    return crypto.createHash('sha256').update(hashInput).digest('hex');
  }
  
  /**
   * Sanitize details to remove sensitive information
   */
  sanitizeDetails(details) {
    // Deep clone to avoid mutating original
    const sanitized = JSON.parse(JSON.stringify(details));
    
    // Remove or mask sensitive fields
    if (sanitized.patient) {
      // Keep medical info but mask personal identifiers
      if (sanitized.patient.name) {
        sanitized.patient.name = '***REDACTED***';
      }
      if (sanitized.patient.phone) {
        sanitized.patient.phone = '***REDACTED***';
      }
    }
    
    return sanitized;
  }

  /**
   * Log a routing decision
   */
  async logRoutingDecision(decision, actor = { role: 'system' }) {
    return this.createLogEntry('routing.calculated', actor, {
      decisionId: decision.id,
      patientCondition: decision.patientCondition,
      selectedHospital: decision.selectedHospital,
      alternativeHospitals: decision.alternativeHospitals,
      factors: decision.scores,
      processingTime: decision.processingTime
    });
  }

  /**
   * Log hospital notification
   */
  async logHospitalNotification(notification, actor) {
    return this.createLogEntry('hospital.notified', actor, {
      requestId: notification.requestId,
      hospitalId: notification.hospitalId,
      hospitalName: notification.hospitalName,
      patientInfo: {
        condition: notification.patientCondition?.condition,
        severity: notification.patientCondition?.severity,
        eta: notification.eta
      },
      notificationTime: notification.timestamp
    });
  }

  /**
   * Log crew acknowledgment
   */
  async logCrewAcknowledgment(acknowledgment, actor) {
    return this.createLogEntry('ambulance.enroute', actor, {
      requestId: acknowledgment.requestId,
      ambulanceId: actor.ambulanceId,
      hospitalName: acknowledgment.hospitalName,
      acknowledgmentTime: acknowledgment.timestamp,
      responseReceived: acknowledgment.confirmed
    });
  }

  /**
   * Log GPS location update
   */
  async logGPSUpdate(update, actor = { role: 'system' }) {
    // This might be too noisy for the main audit trail.
    // Consider a separate, non-chained log for high-frequency events.
    // For now, we will log it.
    return this.createLogEntry('ambulance.location_update', actor, {
      requestId: update.requestId,
      ambulanceId: update.ambulanceId,
      location: {
        latitude: update.location.latitude,
        longitude: update.location.longitude,
        speed: update.location.speed,
        heading: update.location.heading
      },
      timestamp: update.timestamp
    });
  }

  /**
   * Log route deviation
   */
  async logDeviation(deviation, actor = { role: 'system' }) {
    const actionType = deviation.resolved ?
      'ambulance.deviation_resolved' : 'ambulance.route_deviation';

    return this.createLogEntry(actionType, actor, {
      requestId: deviation.requestId,
      ambulanceId: deviation.ambulanceId,
      deviation: {
        reasons: deviation.reasons,
        distanceFromRoute: deviation.distanceFromRoute,
      },
      locationAtDetection: deviation.currentLocation,
      alertId: deviation.alertId,
      resolved: deviation.resolved,
      resolution: deviation.resolution
    });
  }

  /**
   * Log route completion
   */
  async logRouteCompletion(completion, actor = { role: 'system' }) {
    return this.createLogEntry('request.completed', actor, {
      requestId: completion.requestId,
      ambulanceId: completion.ambulanceId,
      hospitalId: completion.hospitalId,
      tripStats: completion.tripStats
    });
  }

  /**
   * Verify audit log integrity
   */
  async verifyIntegrity() {
    const entries = await Audit.find().sort({ timestamp: 'asc' });
    let isValid = true;
    let previousHash = 'genesis';

    for (const entry of entries) {
      if (entry.previousHash !== previousHash) {
        console.error(`❌ Integrity check failed at entry ${entry._id}`);
        isValid = false;
        break;
      }

      const calculatedHash = this.calculateHash(entry, entry.timestamp);
      if (calculatedHash !== entry.hash) {
        console.error(`❌ Hash verification failed at entry ${entry._id}`);
        isValid = false;
        break;
      }

      previousHash = entry.hash;
    }

    return {
      isValid,
      totalEntries: entries.length,
      verifiedAt: new Date()
    };
  }

  /**
   * Query audit logs with filters from the database
   */
  async queryLogs(filters = {}) {
    const query = {};
    const page = filters.page || 1;
    const limit = filters.limit || 50;

    if (filters.actionType) query.event = filters.actionType;
    if (filters.requestId) query.request = filters.requestId;
    if (filters.ambulanceId) query.ambulance = filters.ambulanceId;
    if (filters.userId) query.user = filters.userId;
    
    if (filters.startDate && filters.endDate) {
        query.timestamp = { $gte: new Date(filters.startDate), $lte: new Date(filters.endDate) };
    }

    const total = await Audit.countDocuments(query);
    const results = await Audit.find(query)
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('user', 'name role')
      .populate('request', 'status')
      .populate('ambulance', 'licensePlate');

    return {
      data: results,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get audit trail for a specific request
   */
  async getRequestAuditTrail(requestId) {
    return this.queryLogs({ requestId, limit: 1000 });
  }
}

// Export singleton instance
const auditService = new AuditService();

module.exports = {
  auditService,
  AuditService
};
