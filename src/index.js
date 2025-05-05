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

// Log all incoming requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log('Headers:', req.headers);
  next();
});

// Simple CORS solution - allow all origins
app.use(cors());

// Setup routes
app.use('/api/webhook', webhookRoutes);
app.use('/api', userRoutes);
app.use('/api', stripeRoutes);

// Add a basic health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
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
  console.log(`Server running on port ${port}`);
  console.log(`CORS configured to allow all origins`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  logger.error('Unhandled Rejection:', err);
});

module.exports = app; 