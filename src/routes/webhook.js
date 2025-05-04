const express = require('express');
const User = require('../models/User');
const logger = require('../utils/logger');

const router = express.Router();

// Webhook secret should be configured in environment variables
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Log webhook configuration on startup
logger.info(`Webhook configuration:`, {
  webhookSecretConfigured: !!webhookSecret,
  stripeKeyConfigured: !!process.env.STRIPE_SECRET_KEY
});

// Stripe webhook endpoint to receive payment events
router.post('/', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    logger.info(`Webhook received: ${new Date().toISOString()}`);
    logger.info(`Request headers:`, req.headers);
    
    // Only proceed if we have a webhook secret configured
    if (!webhookSecret) {
      logger.warn('Stripe webhook secret not configured');
      return res.status(400).send('Webhook secret not configured');
    }

    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const sig = req.headers['stripe-signature'];
    
    logger.info(`Stripe signature present: ${!!sig}`);
    
    let event;
    
    // Verify the event came from Stripe
    try {
      logger.info(`Constructing Stripe event from webhook data...`);
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      logger.info(`Webhook event received: ${event.type}`);
      logger.info(`Event ID: ${event.id}`);
      logger.info(`Event data:`, JSON.stringify(event.data.object).substring(0, 500) + '...');
    } catch (err) {
      logger.error(`Webhook Error: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    
    // Handle specific event types
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      logger.info('Payment completed. Session details:', {
        sessionId: session.id,
        paymentStatus: session.payment_status,
        customerDetails: session.customer_details,
        metadata: session.metadata
      });
      
      // Extract customer information
      const customerEmail = session.customer_details.email;
      const customerPhone = session.metadata?.phone; // Get phone from metadata
      const planType = session.metadata?.plan_type; // Get subscription plan type
      
      logger.info('Looking up user with:', {
        email: customerEmail,
        phone: customerPhone,
        planType
      });
      
      if (!customerEmail) {
        logger.error('No customer email found in completed session');
        return res.status(400).send('No customer email found in session');
      }
      
      // Update the user's payment date in the database
      const user = await User.findOne({ email: customerEmail });
      
      if (!user) {
        logger.error(`User not found with email: ${customerEmail}`);
        
        // Log all users for debugging
        try {
          const allUsers = await User.find({}, { email: 1, phone: 1 }).limit(10);
          logger.info(`First 10 users in the database:`, allUsers);
        } catch (findError) {
          logger.error(`Error fetching users for debugging:`, findError);
        }
        
        return res.status(404).send('User not found');
      }
      
      logger.info('Found user:', {
        userId: user._id,
        email: user.email,
        phone: user.phone,
        subscriptionType: user.subscriptionType,
        currentPaymentDate: user.paymentDate
      });
      
      // Update payment date
      const previousPaymentDate = user.paymentDate;
      user.paymentDate = new Date();
      
      // Also update subscription type if provided and different
      if (planType && planType !== user.subscriptionType) {
        logger.info(`Updating subscription type from ${user.subscriptionType} to ${planType}`);
        user.subscriptionType = planType;
      }
      
      await user.save();
      
      logger.info('Payment date updated:', {
        userId: user._id,
        email: user.email,
        previousPaymentDate,
        newPaymentDate: user.paymentDate,
        subscriptionType: user.subscriptionType
      });
    } else if (event.type === 'payment_intent.succeeded') {
      // Handle payment intent success (alternative way Stripe might report successful payments)
      const paymentIntent = event.data.object;
      logger.info(`Payment intent succeeded: ${paymentIntent.id}`);
      
      // Extract customer email from payment intent or related objects if available
      const customerEmail = paymentIntent.receipt_email || 
                           (paymentIntent.charges?.data?.[0]?.billing_details?.email);
      
      if (customerEmail) {
        // Find and update user
        const user = await User.findOne({ email: customerEmail });
        if (user) {
          logger.info(`Updating payment date for user ${customerEmail} from payment intent`);
          user.paymentDate = new Date();
          await user.save();
        } else {
          logger.warn(`User not found with email: ${customerEmail} from payment intent`);
        }
      }
    } else {
      // Log other event types that aren't specifically handled
      logger.info(`Received unhandled event type: ${event.type}`);
    }
    
    // Return a 200 success response
    logger.info(`Webhook processing completed successfully.`);
    res.status(200).json({ received: true });
  } catch (error) {
    logger.error(`Webhook error: ${error.message}`, {
      stack: error.stack,
      details: error
    });
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 