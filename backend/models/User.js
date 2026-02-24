const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6
  },
  role: {
    type: String,
    enum: ['paramedic', 'hospital-staff', 'admin'],
    required: true
  },
  phone: {
    type: String,
    trim: true
  },
  hospitalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hospital',
    required: function() {
      return this.role === 'hospital-staff';
    }
  },
  ambulanceId: {
    type: String,
    required: function() {
      return this.role === 'paramedic';
    }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', UserSchema);