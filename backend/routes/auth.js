const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Ambulance = require('../models/Ambulance');
const protect = require('../middleware/auth');

/* registration endpoint disabled for demo builds
// @route   POST /api/auth/register
// @desc    Register new user
// @access  Public
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, phone, hospitalId, ambulanceId } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists with this email' });
    }

    let finalAmbulanceId;
    if (role === 'paramedic') {
      if (!ambulanceId) {
        return res.status(400).json({ error: 'Ambulance license plate is required for paramedics.' });
      }
      const ambulance = await Ambulance.findOne({ licensePlate: ambulanceId });
      if (!ambulance) {
        return res.status(400).json({ error: 'Ambulance with this license plate is not registered.' });
      }
      finalAmbulanceId = ambulance._id;
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      phone,
      hospitalId: role === 'hospital-staff' ? hospitalId : undefined,
      ambulanceId: finalAmbulanceId
    });

    // Create JWT token
    const token = jwt.sign(
      { 
        userId: user._id,
        role: user.role,
        email: user.email
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        hospitalId: user.hospitalId,
        ambulanceId: user.ambulanceId
      }
    });

  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Server error during registration' });
  }
});
*/

// simple handler explaining that registration is turned off
router.post('/register', (req, res) => {
  res.status(404).json({ error: 'Registration is disabled in demo mode' });
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user (email is stored in lowercase so normalize)
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // user does not exist in database
      console.warn(`Login attempt for non-existent email: ${email}`);
      return res.status(404).json({ error: 'User not found' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.warn(`Invalid password attempt for user ${email}`);
      return res.status(401).json({ error: 'Incorrect password' });
    }

    // Create JWT token
    const token = jwt.sign(
      { 
        userId: user._id,
        role: user.role,
        email: user.email
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        hospitalId: user.hospitalId,
        ambulanceId: user.ambulanceId
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    res.json({
      success: true,
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        phone: req.user.phone,
        hospitalId: req.user.hospitalId,
        ambulanceId: req.user.ambulanceId
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;