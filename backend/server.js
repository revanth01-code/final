const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

// Connect to database
connectDB();

// Initialize Express app
const app = express();

// Create HTTP server
const server = http.createServer(app);

// Helper to normalize allowed origins (accepts single or array)
const allowedOrigins = [];
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}
// support both default ports used by CRA and additional port 3001 when React
allowedOrigins.push("http://localhost:3000", "http://localhost:3001");

// Initialize Socket.io with CORS
const io = socketIo(server, {
  cors: {
    origin: (origin, callback) => {
      // allow requests with no origin (mobile apps, curl)
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error('CORS policy violation'));
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  }
});

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
server.listen(PORT, () => {
  console.log(`

    MediRoute Server Running         
    Port: ${PORT}                      
    Environment: ${process.env.NODE_ENV || 'development'}      
    Socket.io: Active                

  `);
  // debug address
  const addr = server.address();
  console.log('Server bound to', addr);
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