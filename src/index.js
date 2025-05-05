const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const logger = require('./utils/logger');
const db = require('./config/database');
const userRoutes = require('./routes/users');
const webhookRoutes = require('./routes/webhook');
const stripeRoutes = require('./routes/stripe');

// Load environment variables with debug info
console.log('Loading environment variables from .env file');
const result = dotenv.config();
if (result.error) {
  console.error('Error loading .env file:', result.error);
} else {
  console.log('.env file loaded successfully');
  console.log('STRIPE_SECRET_KEY is ' + (process.env.STRIPE_SECRET_KEY ? 'defined' : 'undefined'));
}

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Initialize Express app
const app = express();
const port = process.env.PORT || 8000;

// Setup middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Setup CORS - Configure before routes
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5173', 'https://visaslot.xyz'];

console.log('Configured allowed origins:', allowedOrigins);

// Enable CORS for all routes
app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Log all requests for debugging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    origin: req.headers.origin,
    'user-agent': req.headers['user-agent']
  });
  next();
});

// Handle OPTIONS requests explicitly
app.options('*', cors());

// Setup routes - after CORS configuration
app.use('/api/webhook', webhookRoutes);
app.use('/api', userRoutes);
app.use('/api', stripeRoutes);

// Global error handler
app.use((err, req, res, next) => {
  logger.error(`Error: ${err.message}`);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error'
    }
  });
});

// Connect to database
db.connect();

// Start server
app.listen(port, () => {
  logger.info(`Server running on port ${port}`);
  logger.info(`CORS configured for origins: ${allowedOrigins.join(', ')}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', err);
  // Don't crash the server
});

module.exports = app; 