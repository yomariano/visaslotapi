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

// The Stripe webhook endpoint needs the raw body, so we need to
// add this route before the express.json() middleware
app.use('/api/webhook', webhookRoutes);

// Setup middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Setup CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5173', 'https://visaslot.xyz'];

console.log('Configured allowed origins:', allowedOrigins);

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow all origins if wildcard is present
    if (allowedOrigins.includes('*')) return callback(null, true);
    
    // Check if the origin is in our allowed list
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }
    
    // For debugging in production
    console.log(`CORS blocked origin: ${origin}, allowed origins: ${allowedOrigins.join(',')}`);
    
    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Connect to database
db.connect();

// Setup routes
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

// Start server
app.listen(port, () => {
  logger.info(`Server running on port ${port}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', err);
  // Don't crash the server
});

module.exports = app; 