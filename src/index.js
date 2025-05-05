const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config(); // Ensure env vars are loaded
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

// --- CORS Configuration ---
const allowedOriginsEnv = process.env.ALLOWED_ORIGINS;
console.log(`ALLOWED_ORIGINS environment variable: "${allowedOriginsEnv}"`); // Log the raw env var

const allowedOrigins = allowedOriginsEnv ? allowedOriginsEnv.split(',').map(origin => origin.trim()) : [];
console.log('Configured Allowed Origins:', allowedOrigins); // Log the parsed origins

if (allowedOrigins.length === 0) {
  console.warn('Warning: ALLOWED_ORIGINS environment variable is not set or empty. CORS might block requests.');
}

const corsOptions = {
  origin: function (origin, callback) {
    // Log the origin of the incoming request
    console.log(`CORS Check: Request Origin: ${origin}`);

    // Allow requests with no origin (like mobile apps or curl requests) OR if origin is in the allowed list
    if (!origin || allowedOrigins.includes(origin)) {
      console.log(`CORS Check: Allowing origin: ${origin || 'N/A'}`);
      callback(null, true);
    } else {
      console.error(`CORS Check: Blocking origin: ${origin}. Not in allowed list: ${allowedOrigins.join(', ')}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  allowedHeaders: 'Content-Type,Authorization',
  credentials: true, // Often needed if frontend sends cookies or auth headers
  optionsSuccessStatus: 200 // Return 200 for preflight
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Explicitly handle OPTIONS requests for all routes
// This ensures preflight requests are handled correctly even before they reach specific route handlers
app.options('*', cors(corsOptions));

// --- End CORS Configuration ---


// Log all incoming requests (keep this after CORS)
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log('Headers:', req.headers);
  next();
});


// Setup routes (keep these after CORS)
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
  // Removed the static CORS message, new logs are above
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  logger.error('Unhandled Rejection:', err);
});

module.exports = app;
