const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const logger = require('../utils/logger');

const router = express.Router();

// Debug logging helper
const debug = (message, data = {}) => {
  console.log(`[Users API] ${message}`, JSON.stringify(data, null, 2));
};

// Validation rules for user creation/update
const userValidationRules = [
  body('email').isEmail().withMessage('Must be a valid email address'),
  body('phone').notEmpty().withMessage('Phone number is required'),
  body('countryFrom').notEmpty().withMessage('Country of origin is required'),
  body('cityFrom').notEmpty().withMessage('City of origin is required'),
  body('countryTo').optional(),
  body('cityTo').optional(),
  body('subscriptionType').notEmpty().withMessage('Subscription type is required'),
  body('paymentDate').optional().isISO8601().toDate().withMessage('Payment date must be a valid date')
];

// Create or update a user
// Note: This endpoint will be accessible at /api/users
router.post('/users', userValidationRules, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      email,
      phone,
      countryFrom,
      cityFrom,
      countryTo,
      cityTo,
      subscriptionType,
      paymentDate
    } = req.body;

    logger.info(`Creating/updating user with email: ${email}`);

    // Check if user already exists
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      logger.info(`Updating existing user: ${email}`);
      
      // Check if this is a payment update
      if (paymentDate) {
        logger.info(`Payment date updated for user: ${email}, subscription: ${subscriptionType}, date: ${paymentDate}`);
      }
      
      // Update existing user
      existingUser.phone = phone;
      existingUser.countryFrom = countryFrom;
      existingUser.cityFrom = cityFrom;
      existingUser.countryTo = countryTo;
      existingUser.cityTo = cityTo;
      existingUser.subscriptionType = subscriptionType;
      
      // Only set payment date if explicitly provided, otherwise leave it unchanged
      if (paymentDate) {
        existingUser.paymentDate = paymentDate;
      }
      
      existingUser.updatedAt = new Date();
      
      await existingUser.save();
      
      return res.status(200).json({
        message: 'User updated successfully',
        email,
        paymentUpdated: !!paymentDate
      });
    }

    logger.info(`Creating new user: ${email}`);
    
    // Create new user
    const newUser = new User({
      email,
      phone,
      countryFrom,
      cityFrom,
      countryTo,
      cityTo,
      subscriptionType,
      paymentDate: null,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    console.log('newUser', newUser);
    const savedUser = await newUser.save();
    
    // Log payment info for new users as well
    if (paymentDate) {
      logger.info(`Payment date set for new user: ${email}, subscription: ${subscriptionType}, date: ${paymentDate}`);
    }
    
    return res.status(201).json({
      message: 'User created successfully',
      id: savedUser._id.toString(),
      email,
      paymentUpdated: !!paymentDate
    });

  } catch (error) {
    logger.error(`Error creating/updating user: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// Add a route to get user payment status - for testing purposes
router.get('/users/:email', async (req, res) => {
  try {
    const email = req.params.email;
    
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    return res.status(200).json({
      email: user.email,
      subscriptionType: user.subscriptionType,
      paymentDate: user.paymentDate,
      hasActiveSubscription: !!user.paymentDate
    });
    
  } catch (error) {
    logger.error(`Error getting user: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// New endpoint to confirm payment after Stripe redirect
// Note: This endpoint will be accessible at /api/users/confirm-payment
router.post('/users/confirm-payment', [
  body('email').isEmail().withMessage('Must be a valid email address'),
  body('subscriptionType').notEmpty().withMessage('Subscription type is required'),
  body('paymentDate').isISO8601().toDate().withMessage('Payment date must be a valid date')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, subscriptionType, paymentDate } = req.body;

    logger.info(`Confirming payment for user: ${email}, subscription: ${subscriptionType}`);

    // Find the user by email
    const user = await User.findOne({ email });

    if (!user) {
      logger.error(`User not found with email: ${email}`);
      return res.status(404).json({ error: 'User not found' });
    }

    // Update payment date
    const previousPaymentDate = user.paymentDate;
    user.paymentDate = paymentDate;
    user.updatedAt = new Date();

    await user.save();

    logger.info('Payment confirmed and date updated:', {
      userId: user._id,
      email: user.email,
      subscriptionType,
      previousPaymentDate,
      newPaymentDate: user.paymentDate
    });

    return res.status(200).json({
      message: 'Payment confirmed successfully',
      email,
      subscriptionType
    });

  } catch (error) {
    logger.error(`Error confirming payment: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// Add a diagnostic endpoint to test the API connection
router.get('/users/test', async (req, res) => {
  try {
    logger.info('Diagnostic endpoint called');
    
    // Get database connection status
    let dbStatus = 'Connected';
    try {
      // Try to find a document to test database connection
      await User.findOne({}).limit(1);
    } catch (dbError) {
      dbStatus = `Error: ${dbError.message}`;
      logger.error('Database connection error:', dbError);
    }
    
    // Return diagnostic information
    res.status(200).json({
      status: 'API is working',
      time: new Date().toISOString(),
      env: {
        nodeEnv: process.env.NODE_ENV || 'not set',
        port: process.env.PORT || '8000 (default)',
        mongoConnected: dbStatus
      }
    });
  } catch (error) {
    logger.error(`Diagnostic endpoint error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// Test endpoint for debug page
router.get('/test', (req, res) => {
  debug('Test endpoint called');
  res.json({ status: 'ok', message: 'API is working' });
});

router.post('/update-payment', async (req, res) => {
  try {
    debug('Updating payment info', { body: req.body });
    
    const {
      email,
      phone,
      countryFrom,
      cityFrom,
      countryTo,
      cityTo,
      subscriptionType
    } = req.body;

    // Validate required fields
    if (!email || !phone || !subscriptionType) {
      debug('Missing required fields', { email, phone, subscriptionType });
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Find or create user
    let user = await User.findOne({ email });
    debug('User lookup result', { found: !!user, email });

    if (!user) {
      debug('Creating new user', { email });
      user = new User({ email });
    }

    // Update user data
    Object.assign(user, {
      phone,
      countryFrom,
      cityFrom,
      countryTo,
      cityTo,
      subscriptionType,
      updatedAt: new Date()
    });

    debug('Saving user data', { userId: user._id });
    await user.save();
    
    res.json({
      status: 'success',
      user: {
        email: user.email,
        phone: user.phone,
        subscriptionType: user.subscriptionType
      }
    });
  } catch (error) {
    debug('Error in update-payment', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

router.post('/confirm-payment', async (req, res) => {
  try {
    logger.info('Confirming payment:', { body: req.body });
    
    const { email, subscriptionType } = req.body;
    if (!email || !subscriptionType) {
      logger.error('Missing required fields for payment confirmation', { email, subscriptionType });
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const user = await User.findOne({ email });
    logger.info('User lookup for payment confirmation', { found: !!user, email });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update payment date and subscription type
    user.paymentDate = new Date();
    user.subscriptionType = subscriptionType;
    
    logger.info('Updating user payment status', { 
      userId: user._id, 
      email,
      subscriptionType,
      paymentDate: user.paymentDate
    });
    
    await user.save();

    res.json({
      status: 'success',
      user: {
        email: user.email,
        subscriptionType,
        paymentDate: user.paymentDate
      }
    });
  } catch (error) {
    logger.error('Error confirming payment:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add a CORS diagnostic endpoint
router.get('/cors-test', (req, res) => {
  debug('CORS test endpoint called');
  
  // Get all request headers for debugging
  const requestHeaders = {
    origin: req.headers.origin,
    'access-control-request-method': req.headers['access-control-request-method'],
    'access-control-request-headers': req.headers['access-control-request-headers']
  };

  // Get all response headers
  const responseHeaders = res.getHeaders();

  res.json({ 
    status: 'ok', 
    message: 'CORS diagnostic information',
    request: {
      method: req.method,
      path: req.path,
      headers: requestHeaders
    },
    response: {
      headers: responseHeaders
    },
    environment: {
      allowedOrigins: process.env.ALLOWED_ORIGINS,
      nodeEnv: process.env.NODE_ENV
    }
  });
});

module.exports = router; 