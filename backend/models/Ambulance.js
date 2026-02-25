const mongoose = require('mongoose');

const AmbulanceSchema = new mongoose.Schema({
  licensePlate: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  paramedic: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  location: {
    latitude: {
      type: Number,
      default: null
    },
    longitude: {
      type: Number,
      default: null
    }
  },
  status: {
    type: String,
    enum: ['available', 'dispatched', 'at_scene', 'enroute_to_hospital', 'at_hospital', 'returning', 'unavailable'],
    default: 'unavailable'
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

AmbulanceSchema.index({ 'location.latitude': 1, 'location.longitude': 1 });

module.exports = mongoose.model('Ambulance', AmbulanceSchema);