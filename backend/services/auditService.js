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
 * In production, this would use blockchain or append-only database
 * to ensure immutability.
 */

const crypto = require('crypto');

class AuditService {
  constructor() {
    // In production, this would be a database collection
    this.auditLog = [];
    
    // Hash of previous block for chain integrity
    this.previousHash = 'genesis';
    
    // Store audit logs in memory (would be database in production)
    this.logCollection = new Map();
  }

  /**
   * Create an immutable audit log entry
   */
  createLogEntry(actionType, actor, details, metadata = {}) {
    const timestamp = new Date();
    
    // Create log entry
    const logEntry = {
      // Unique identifier
      id: this.generateId(),
      
      // Timestamp
      timestamp: timestamp,
      timestampISO: timestamp.toISOString(),
      
      // Action details
      actionType,
      action: this.getActionDescription(actionType),
      
      // Who performed the action
      actor: {
        id: actor.id,
        role: actor.role,
        name: actor.name,
        hospitalId: actor.hospitalId,
        ambulanceId: actor.ambulanceId
      },
      
      // Detailed information
      details: this.sanitizeDetails(details),
      
      // Additional metadata
      metadata: {
        ...metadata,
        ipAddress: metadata.ipAddress || 'internal',
        userAgent: metadata.userAgent || 'system',
        sessionId: metadata.sessionId
      },
      
      // Chain hash (for immutability verification)
      previousHash: this.previousHash,
      hash: null // Will be calculated
    };
    
    // Calculate hash for this entry
    logEntry.hash = this.calculateHash(logEntry);
    
    // Update previous hash for next entry
    this.previousHash = logEntry.hash;
    
    // Store the entry
    this.logCollection.set(logEntry.id, logEntry);
    this.auditLog.push(logEntry);
    
    console.log(`📋 Audit log created: ${actionType} by ${actor.role} at ${timestamp.toISOString()}`);
    
    return logEntry;
  }

  /**
   * Generate unique ID
   */
  generateId() {
    return `audit-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  }

  /**
   * Calculate SHA-256 hash for entry
   */
  calculateHash(entry) {
    const hashInput = JSON.stringify({
      id: entry.id,
      timestamp: entry.timestampISO,
      actionType: entry.actionType,
      actor: entry.actor,
      details: entry.details,
      previousHash: entry.previousHash
    });
    
    return crypto.createHash('sha256').update(hashInput).digest('hex');
  }

  /**
   * Get human-readable action description
   */
  getActionDescription(actionType) {
    const descriptions = {
      // Routing decisions
      'ROUTING_DECISION': 'Hospital selection decision made by system',
      'OPTIMAL_HOSPITAL_SELECTED': 'Optimal hospital selected for patient',
      'ALTERNATIVE_ROUTE': 'Alternative hospital route considered',
      
      // Hospital actions
      'HOSPITAL_NOTIFIED': 'Hospital notified of incoming patient',
      'HOSPITAL_ACCEPTED': 'Hospital accepted patient',
      'HOSPITAL_REJECTED': 'Hospital rejected patient',
      'HOSPITAL_CAPACITY_UPDATED': 'Hospital updated capacity information',
      
      // Ambulance actions
      'AMBULANCE_DISPATCHED': 'Ambulance dispatched to hospital',
      'AMBULANCE_ENROUTE': 'Ambulance en route to hospital',
      'AMBULANCE_ARRIVED': 'Ambulance arrived at hospital',
      'AMBULANCE_DEPARTED': 'Ambulance departed from hospital',
      
      // Acknowledgments
      'CREW_ACKNOWLEDGMENT': 'Ambulance crew acknowledged destination',
      'CREW_CONFIRMATION': 'Crew confirmed receipt of routing instructions',
      'HOSPITAL_CONFIRMATION': 'Hospital confirmed patient acceptance',
      
      // GPS/Tracking
      'GPS_LOCATION_UPDATE': 'GPS location updated',
      'ROUTE_DEVIATION_DETECTED': 'Route deviation detected',
      'DEVIATION_ALERT_SENT': 'Deviation alert sent to dispatch',
      'DEVIATION_ACKNOWLEDGED': 'Deviation alert acknowledged',
      'DEVIATION_RESOLVED': 'Deviation resolved',
      
      // Travel
      'ROUTE_STARTED': 'Route navigation started',
      'ROUTE_COMPLETED': 'Route completed successfully',
      'ALTERNATE_PATH_TAKEN': 'Alternate path taken by ambulance',
      
      // System
      'SYSTEM_ALERT': 'System-generated alert',
      'DATA_ACCESS': 'Data accessed by user',
      'CONFIGURATION_CHANGE': 'System configuration changed',
      
      // Patient
      'PATIENT_INFO_RECEIVED': 'Patient information received',
      'PATIENT_CONDITION_UPDATED': 'Patient condition updated',
      'PATIENT_HANDOVER': 'Patient handed over to hospital'
    };
    
    return descriptions[actionType] || actionType;
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
  logRoutingDecision(decision, actor = { role: 'system' }) {
    return this.createLogEntry('ROUTING_DECISION', actor, {
      decisionId: decision.id,
      patientCondition: decision.patientCondition,
      selectedHospital: decision.selectedHospital,
      alternativeHospitals: decision.alternativeHospitals,
      factors: decision.scores,
      processingTime: decision.processingTime
    }, {
      systemComponent: 'optimization-engine'
    });
  }

  /**
   * Log hospital notification
   */
  logHospitalNotification(notification, actor) {
    return this.createLogEntry('HOSPITAL_NOTIFIED', actor, {
      requestId: notification.requestId,
      hospitalId: notification.hospitalId,
      hospitalName: notification.hospitalName,
      patientInfo: {
        condition: notification.patientCondition?.condition,
        severity: notification.patientCondition?.severity,
        eta: notification.eta
      },
      notificationTime: notification.timestamp
    }, {
      communicationMethod: 'socket'
    });
  }

  /**
   * Log crew acknowledgment
   */
  logCrewAcknowledgment(acknowledgment, actor) {
    return this.createLogEntry('CREW_ACKNOWLEDGMENT', actor, {
      requestId: acknowledgment.requestId,
      ambulanceId: acknowledgment.ambulanceId,
      hospitalName: acknowledgment.hospitalName,
      acknowledgmentTime: acknowledgment.timestamp,
      responseReceived: acknowledgment.confirmed
    });
  }

  /**
   * Log GPS location update
   */
  logGPSUpdate(update, actor = { role: 'system' }) {
    return this.createLogEntry('GPS_LOCATION_UPDATE', actor, {
      requestId: update.requestId,
      ambulanceId: update.ambulanceId,
      location: {
        latitude: update.location.latitude,
        longitude: update.location.longitude,
        accuracy: update.location.accuracy,
        speed: update.location.speed,
        heading: update.location.heading
      },
      timestamp: update.timestamp,
      sequenceNumber: update.sequenceNumber
    }, {
      deviceId: update.deviceId
    });
  }

  /**
   * Log route deviation
   */
  logDeviation(deviation, actor = { role: 'system' }) {
    const actionType = deviation.resolved ? 
      'DEVIATION_RESOLVED' : 'ROUTE_DEVIATION_DETECTED';
    
    return this.createLogEntry(actionType, actor, {
      requestId: deviation.requestId,
      ambulanceId: deviation.ambulanceId,
      deviation: {
        type: deviation.type,
        distanceFromRoute: deviation.distanceFromRoute,
        deviationAngle: deviation.deviationAngle,
        delayMinutes: deviation.delayMinutes,
        reasons: deviation.reasons
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
  logRouteCompletion(completion, actor = { role: 'system' }) {
    return this.createLogEntry('ROUTE_COMPLETED', actor, {
      requestId: completion.requestId,
      ambulanceId: completion.ambulanceId,
      hospitalId: completion.hospitalId,
      hospitalName: completion.hospitalName,
      tripStats: {
        totalDistance: completion.totalDistance,
        totalTime: completion.totalTime,
        averageSpeed: completion.averageSpeed,
        deviationCount: completion.deviationCount
      },
      actualPath: completion.actualPath,
      expectedPath: completion.expectedPath,
      pathDeviation: completion.pathDeviation
    });
  }

  /**
   * Verify audit log integrity
   */
  verifyIntegrity() {
    const entries = Array.from(this.logCollection.values());
    let isValid = true;
    let previousHash = 'genesis';
    
    for (const entry of entries) {
      // Verify previous hash matches
      if (entry.previousHash !== previousHash) {
        console.error(`❌ Integrity check failed at entry ${entry.id}`);
        isValid = false;
        break;
      }
      
      // Verify entry hash
      const calculatedHash = this.calculateHash(entry);
      if (calculatedHash !== entry.hash) {
        console.error(`❌ Hash verification failed at entry ${entry.id}`);
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
   * Query audit logs with filters
   */
  queryLogs(filters = {}) {
    let results = Array.from(this.logCollection.values());
    
    // Apply filters
    if (filters.actionType) {
      results = results.filter(entry => entry.actionType === filters.actionType);
    }
    
    if (filters.actorRole) {
      results = results.filter(entry => entry.actor.role === filters.actorRole);
    }
    
    if (filters.ambulanceId) {
      results = results.filter(entry => 
        entry.details.ambulanceId === filters.ambulanceId ||
        entry.actor.ambulanceId === filters.ambulanceId
      );
    }
    
    if (filters.hospitalId) {
      results = results.filter(entry => 
        entry.details.hospitalId === filters.hospitalId ||
        entry.actor.hospitalId === filters.hospitalId
      );
    }
    
    if (filters.requestId) {
      results = results.filter(entry => entry.details.requestId === filters.requestId);
    }
    
    if (filters.startDate && filters.endDate) {
      const start = new Date(filters.startDate);
      const end = new Date(filters.endDate);
      results = results.filter(entry => {
        const entryDate = new Date(entry.timestamp);
        return entryDate >= start && entryDate <= end;
      });
    }
    
    // Sort by timestamp descending (newest first)
    results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Apply pagination
    const total = results.length;
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const paginatedResults = results.slice((page - 1) * limit, page * limit);
    
    return {
      data: paginatedResults,
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
  getRequestAuditTrail(requestId) {
    return this.queryLogs({ requestId, limit: 1000 });
  }

  /**
   * Export audit logs (for compliance)
   */
  exportLogs(format = 'json', filters = {}) {
    const { data } = this.queryLogs({ ...filters, limit: 10000 });
    
    if (format === 'json') {
      return JSON.stringify(data, null, 2);
    }
    
    // CSV format
    if (format === 'csv') {
      const headers = ['ID', 'Timestamp', 'Action Type', 'Actor Role', 'Actor ID', 'Details'];
      const rows = data.map(entry => [
        entry.id,
        entry.timestampISO,
        entry.actionType,
        entry.actor.role,
        entry.actor.id,
        JSON.stringify(entry.details).replace(/"/g, '""')
      ]);
      
      return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    }
    
    return data;
  }

  /**
   * Get audit summary statistics
   */
  getSummaryStats(startDate, endDate) {
    const { data } = this.queryLogs({ startDate, endDate, limit: 10000 });
    
    // Count by action type
    const actionCounts = {};
    data.forEach(entry => {
      actionCounts[entry.actionType] = (actionCounts[entry.actionType] || 0) + 1;
    });
    
    // Count by actor role
    const roleCounts = {};
    data.forEach(entry => {
      roleCounts[entry.actor.role] = (roleCounts[entry.actor.role] || 0) + 1;
    });
    
    // Count deviations
    const deviations = data.filter(e => 
      e.actionType === 'ROUTE_DEVIATION_DETECTED'
    ).length;
    
    return {
      totalEntries: data.length,
      dateRange: { startDate, endDate },
      byActionType: actionCounts,
      byActorRole: roleCounts,
      deviationCount: deviations,
      generatedAt: new Date()
    };
  }
}

// Export singleton instance
const auditService = new AuditService();

module.exports = {
  auditService,
  AuditService
};
