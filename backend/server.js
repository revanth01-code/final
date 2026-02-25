const express = require('express');
const http = require('http');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const socketInstance = require('./socket/socketInstance');
const Hospital = require('./models/Hospital');

// Load environment variables
dotenv.config();

// Connect to database
connectDB();

// Initialize Express app
const app = express();

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io using the centralized instance
const io = socketInstance.init(server);

// Helper to normalize allowed origins
const allowedOrigins = [
    process.env.FRONTEND_URL,
    "http://localhost:3000",
    "http://localhost:3001"
].filter(Boolean);

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error('CORS policy violation'));
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware (development only)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/hospitals', require('./routes/hospitals'));
app.use('/api/requests', require('./routes/requests'));
app.use('/api/optimized-routing', require('./routes/optimizedRouting'));

// Basic route
app.get('/', (req, res) => {
  res.json({ 
    message: 'MediRoute API Server',
    version: '1.0.0',
    status: 'active'
  });
});

// Health check route
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date(),
    uptime: process.uptime()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Initialize Socket.io handlers
require('./socket/socketHandler')(io);

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, async () => {
  console.log(`

    MediRoute Server Running         
    Port: ${PORT}                      
    Environment: ${process.env.NODE_ENV || 'development'}      
    Socket.io: Active                

  `);
  // debug address
  const addr = server.address();
  console.log('Server bound to', addr);

  // simulate periodic hospital capacity updates for demo purposes
  const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  setInterval(async () => {
    try {
      const hospitals = await Hospital.find({}).limit(5);
      if (hospitals.length === 0) return;
      const hospital = hospitals[randomInt(0, hospitals.length - 1)];
      const update = {
        hospitalId: hospital._id,
        hospitalName: hospital.name,
        availableBeds: randomInt(0, hospital.capacity.totalBeds),
        availableICU: randomInt(0, hospital.capacity.totalICU),
        timestamp: new Date()
      };
      io.emit('capacity-updated', update);
      console.log('Simulated capacity update', update);
    } catch (err) {
      console.error('Error simulating capacity update', err);
    }
  }, 30000); // every 30 seconds

  // send any already‑queued requests to their hospitals so dashboards start populated
  try {
    const Request = require('./models/Request');
    const pending = await Request.find({ status: 'requested' });
    pending.forEach(r => {
      const hospRoom = `hospital-${r.selectedHospital || r.hospitalId}`;
      io.to(hospRoom).emit('incoming-patient', {
        requestId: r._id,
        patientAge: r.patient.age,
        patientGender: r.patient.gender,
        condition: r.patient.condition,
        severity: r.patient.severity,
        requiredSpecialty: r.patient.requiredSpecialty,
        vitals: r.patient.vitals,
        eta: r.navigation?.estimatedTime || 0,
        ambulanceId: r.ambulance,
        paramedicName: r.paramedic.name,
        paramedicPhone: r.paramedic.phone,
        ambulanceLocation: r.location,
        timestamp: r.createdAt
      });
    });
    if (pending.length) console.log('Emitted', pending.length, 'pending requests');
  } catch (err) {
    console.error('Error emitting pending requests', err);
  }
});

server.on('error', (err) => {
  console.error('Server encountered error:', err);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error(' Unhandled Rejection:', err);
  // Close server & exit process
  server.close(() => process.exit(1));
});