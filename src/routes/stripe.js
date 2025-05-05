const express = require('express');
const router = express.Router();

// Check if STRIPE_SECRET_KEY is defined
if (!process.env.STRIPE_SECRET_KEY) {
  console.log('WARNING: STRIPE_SECRET_KEY is not defined in the environment');
  console.log('Current environment variables:', process.env);
}

// Initialize Stripe with a fallback for testing
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || 'your_test_key_here';
console.log('Using Stripe key:', stripeSecretKey ? 'Key is defined' : 'No key available');
const stripe = require('stripe')(stripeSecretKey);
const logger = require('../utils/logger');

router.post('/create-checkout-session', async (req, res) => {
  try {
    const {
      priceId,
      successUrl,
      cancelUrl,
      customerEmail,
      metadata
    } = req.body;

    logger.info('Creating checkout session:', {
      priceId,
      customerEmail,
      successUrl,
      cancelUrl,
      metadata
    });

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: customerEmail,
      metadata: metadata,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      client_reference_id: customerEmail,
      expires_at: Math.floor(Date.now() / 1000) + (60 * 30),
    });

    logger.info('Checkout session created:', {
      sessionId: session.id,
      url: session.url,
      successUrl: session.success_url,
      cancelUrl: session.cancel_url
    });

    res.json({ url: session.url });
  } catch (error) {
    logger.error('Error creating checkout session:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 