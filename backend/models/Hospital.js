const mongoose = require('mongoose');

const HospitalSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Hospital name is required'],
    trim: true
  },
  location: {
    latitude: {
      type: Number,
      required: true
    },
    longitude: {
      type: Number,
      required: true
    },
    address: {
      type: String,
      required: true
    }
  },
  contact: {
    phone: {
      type: String,
      required: true
    },
    emergency: {
      type: String,
      required: true
    }
  },
  capacity: {
    totalBeds: {
      type: Number,
      required: true,
      default: 100
    },
    availableBeds: {
      type: Number,
      required: true,
      default: 50,
      min: 0
    },
    totalICU: {
      type: Number,
      required: true,
      default: 20
    },
    availableICU: {
      type: Number,
      required: true,
      default: 10,
      min: 0
    },
    totalVentilators: {
      type: Number,
      default: 10
    },
    availableVentilators: {
      type: Number,
      default: 5,
      min: 0
    }
  },
  specialists: [{
    specialty: {
      type: String,
      enum: ['cardiology', 'neurology', 'orthopedics', 'general-surgery', 'trauma', 'pediatrics'],
      required: true
    },
    available: {
      type: Boolean,
      default: true
    },
    onDuty: [{
      type: String
    }]
  }],
  equipment: {
    ctScan: {
      type: Boolean,
      default: false
    },
    mri: {
      type: Boolean,
      default: false
    },
    xray: {
      type: Boolean,
      default: true
    },
    cathLab: {
      type: Boolean,
      default: false
    },
    bloodBank: {
      type: Boolean,
      default: true
    },
    ventilator: {
      type: Boolean,
      default: true
    },
    oxygenSupply: {
      type: Boolean,
      default: true
    }
  },
  currentLoad: {
    type: String,
    enum: ['low', 'moderate', 'high', 'critical'],
    default: 'moderate'
  },
  status: {
    type: String,
    enum: ['active', 'full', 'emergency-only', 'inactive'],
    default: 'active'
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create geospatial index for location-based queries
HospitalSchema.index({ 'location.latitude': 1, 'location.longitude': 1 });

module.exports = mongoose.model('Hospital', HospitalSchema);