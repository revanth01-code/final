const mongoose = require('mongoose');

const RequestSchema = new mongoose.Schema({
  ambulance: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ambulance',
    required: true
  },
  paramedic: {
    name: String,
    phone: String
  },
  patient: {
    age: {
      type: Number,
      required: true
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
      required: true
    },
    condition: {
      type: String,
      required: true
    },
    severity: {
      type: String,
      enum: ['mild', 'moderate', 'severe', 'critical'],
      required: true
    },
    vitals: {
      heartRate: Number,
      bloodPressure: String,
      oxygenLevel: Number,
      temperature: Number
    },
    symptoms: [String],
    requiredSpecialty: {
      type: String,
      enum: ['cardiology', 'neurology', 'orthopedics', 'general-surgery', 'trauma', 'pediatrics'],
      required: true
    },
    consciousness: {
      type: String,
      enum: ['alert', 'drowsy', 'semi-conscious', 'unconscious']
    }
  },
  location: {
    latitude: {
      type: Number,
      required: true
    },
    longitude: {
      type: Number,
      required: true
    }
  },
  recommendedHospitals: [{
    hospitalId: mongoose.Schema.Types.ObjectId,
    hospitalName: String,
    distance: Number,
    eta: Number,
    matchScore: Number,
    reasons: [String]
  }],
  selectedHospital: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hospital'
  },
  status: {
    type: String,
    enum: ['requested', 'assigned', 'enroute', 'arrived', 'completed', 'cancelled'],
    default: 'requested'
  },
  navigation: {
    distance: Number,
    estimatedTime: Number,
    routeCoordinates: [[Number]]
  },
  tracking: {
    startedAt: Date,
    currentLocation: {
        latitude: Number,
        longitude: Number
    },
    completedAt: Date,
    finalStats: mongoose.Schema.Types.Mixed,
    deviationAlerts: [mongoose.Schema.Types.Mixed]
  },
  arrivedAt: Date,
  completedAt: Date
}, {
  timestamps: true
});

module.exports = mongoose.model('Request', RequestSchema);