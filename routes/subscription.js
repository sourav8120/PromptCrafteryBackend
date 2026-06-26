const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const User = require('../models/User');

const router = express.Router();

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Subscription plans (Prices in INR - Indian Rupees)
const PLANS = {
  starter: {
    name: 'Starter',
    price: 99, // Rs 99
    prompts: 25,
    duration: 30,
    promptsLimit: 25
  },
  pro: {
    name: 'Pro',
    price: 299, // Rs 299
    prompts: 100,
    duration: 180, // 6 months
    promptsLimit: 100
  },
  premium: {
    name: 'Premium',
    price: 799, // Rs 799
    prompts: 400,
    duration: 365, // 1 year
    promptsLimit: 400
  }
};

// Get subscription plans
router.get('/plans', (req, res) => {
  res.json({
    plans: [
      { 
        id: 'starter', 
        name: 'Starter', 
        price: 99,
        prompts: 25,
        currency: 'INR',
        duration: '1 month',
        features: ['25 prompts per month', 'Basic support', 'Save your favorites']
      },
      { 
        id: 'pro', 
        name: 'Pro', 
        price: 299,
        prompts: 100,
        currency: 'INR',
        duration: '6 months',
        features: ['100 prompts per month', 'Priority support', 'Save 50% vs monthly', 'Early access to new prompts']
      },
      { 
        id: 'premium', 
        name: 'Premium', 
        price: 799,
        prompts: 400,
        currency: 'INR',
        duration: '1 year',
        features: ['400 prompts per month', 'VIP support', 'Save 73% vs monthly', 'Lifetime access to new prompts']
      }
    ],
    freePrompts: 5
  });
});

// Create Razorpay Order
router.post('/create-order', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const { planId } = req.body;

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    if (!planId || !PLANS[planId]) {
      return res.status(400).json({ error: 'Invalid plan selected' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const plan = PLANS[planId];

    try {
      // Create Razorpay order
      // Razorpay requires receipt to be max 40 characters
      const shortUserId = user._id.toString().slice(-8);
      const planShort = planId[0]; // s, p, or x
      const timestamp = Date.now().toString().slice(-6);
      const receipt = `ord_${shortUserId}_${planShort}_${timestamp}`;

      const order = await razorpay.orders.create({
        amount: plan.price * 100, // Amount in paise (1 INR = 100 paise)
        currency: 'INR',
        receipt: receipt, // Max 40 characters
        notes: {
          planId: planId,
          userId: user._id.toString(),
          userEmail: user.email,
          planName: plan.name
        }
      });

      res.json({
        success: true,
        orderId: order.id,
        planId: planId,
        amount: plan.price,
        currency: 'INR',
        planName: plan.name
      });
    } catch (razorpayError) {
      console.error('Razorpay order creation error:', {
        message: razorpayError.message,
        statusCode: razorpayError.statusCode,
        code: razorpayError.code,
        description: razorpayError.description,
        source: 'Razorpay API'
      });
      return res.status(500).json({ 
        error: 'Failed to create payment order',
        details: razorpayError.message || 'Razorpay API error'
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verify Payment and Activate Subscription
router.post('/verify-payment', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planId } = req.body;

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    if (!planId || !PLANS[planId]) {
      return res.status(400).json({ error: 'Invalid plan' });
    }

    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const plan = PLANS[planId];
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + plan.duration);

    // Update user subscription
    user.subscription = {
      plan: planId,
      status: 'active',
      startDate,
      endDate,
      price: plan.price,
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id
    };

    // Reset prompts count and set new limit
    user.promptsUsed = 0;
    user.promptsLimit = plan.promptsLimit;

    await user.save();

    res.json({
      success: true,
      message: `Successfully subscribed to ${plan.name}`,
      subscription: user.subscription,
      promptsLimit: user.promptsLimit,
      totalPrompts: plan.prompts
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Purchase subscription
// Note: Use /verify-payment endpoint instead for Razorpay payment verification
// The /purchase endpoint is deprecated in favor of the proper payment verification flow

// Cancel subscription
router.post('/cancel', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.subscription.status = 'cancelled';
    user.subscription.plan = 'free';
    user.promptsLimit = 5;
    user.promptsUsed = 0;

    await user.save();

    res.json({
      success: true,
      message: 'Subscription cancelled',
      subscription: user.subscription
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user subscription status
router.get('/status', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if subscription expired
    if (user.subscription.status === 'active' && user.subscription.endDate) {
      if (new Date() > user.subscription.endDate) {
        user.subscription.status = 'expired';
        user.subscription.plan = 'free';
        user.promptsLimit = 5;
        user.promptsUsed = 0;
        await user.save();
      }
    }

    res.json({
      subscription: user.subscription,
      promptsUsed: user.promptsUsed,
      promptsLimit: user.promptsLimit,
      canAccess: user.canAccessMorePrompts(),
      remainingPrompts: user.promptsLimit - user.promptsUsed
    });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

module.exports = router;
