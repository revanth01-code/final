const mongoose = require('mongoose');

const AuditSchema = new mongoose.Schema({
  request: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Request'
  },
  ambulance: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ambulance'
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  event: {
    type: String,
    required: true,
    enum: [
      'request.created',
      'request.updated',
      'routing.calculated',
      'hospital.selected',
      'hospital.notified',
      'ambulance.dispatched',
      'ambulance.enroute',
      'ambulance.arrived',
      'ambulance.route_deviation',
      'ambulance.location_update',
      'patient.handed_over',
      'request.completed',
      'request.cancelled',
      'system.error'
    ]
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: { createdAt: 'timestamp' } 
});

AuditSchema.index({ request: 1 });
AuditSchema.index({ ambulance: 1 });
AuditSchema.index({ timestamp: -1 });

module.exports = mongoose.model('Audit', AuditSchema);