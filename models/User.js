const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'monthly', 'quarterly', 'yearly'],
      default: 'free'
    },
    status: {
      type: String,
      enum: ['active', 'cancelled', 'expired'],
      default: 'active'
    },
    startDate: Date,
    endDate: Date,
    price: {
      type: Number,
      default: 0
    }
  },
  promptsUsed: {
    type: Number,
    default: 0
  },
  promptsLimit: {
    type: Number,
    default: 5 // Free tier: 5 prompts
  },
  freeTrialUsed: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before save
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Update prompt usage
userSchema.methods.incrementPromptUsage = async function() {
  this.promptsUsed += 1;
  await this.save();
};

// Check if user can access more prompts
userSchema.methods.canAccessMorePrompts = function() {
  if (this.subscription.plan === 'free') {
    return this.promptsUsed < this.promptsLimit;
  }
  // Paid subscribers have unlimited access
  return true;
};

module.exports = mongoose.model('User', userSchema);
