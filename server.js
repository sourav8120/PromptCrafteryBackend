const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');
const dns = require('dns');

// Configure DNS to use Google's public DNS servers (fixes MongoDB SRV lookup issues)
dns.setServers(['8.8.8.8', '8.8.4.4']);

// Load environment variables from .env file
dotenv.config();

console.log('=== SERVER STARTUP ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('MONGODB_URI exists:', !!process.env.MONGODB_URI);
console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);
console.log('MONGODB_URI first 50 chars:', process.env.MONGODB_URI?.substring(0, 50) || 'NOT SET');
console.log('=======================');

const app = express();

// Rate limiting (safe for Vercel/proxies)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: 1,
  message: { error: 'Too many requests, please try again later.' }
});

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    process.env.FRONTEND_URL,
    process.env.ADMIN_URL
  ].filter(Boolean),
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/api/', limiter);

// Singleton MongoDB connection pool
let mongooseConnection = null;

const connectDB = async () => {
  if (mongooseConnection && mongoose.connection.readyState === 1) {
    return mongooseConnection;
  }

  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable not set');
    }

    mongooseConnection = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 60000,
      retryWrites: true,
      maxPoolSize: 1,
      family: 4,
      tls: true,
      bufferCommands: false,
    });

    console.log('✅ MongoDB connected to:', mongoose.connection.name);
    return mongooseConnection;
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    console.error('MONGODB_URI set:', !!process.env.MONGODB_URI);
    throw err;
  }
};

// Middleware to ensure DB connection before routes
app.use(async (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    try {
      await connectDB();
    } catch (err) {
      console.error('DB connection failed in middleware:', err.message);
      return res.status(503).json({ error: 'Database temporarily unavailable' });
    }
  }
  next();
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/subscription', require('./routes/subscription'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/prompts', require('./routes/prompts'));
app.use('/api/admin', require('./routes/admin'));

// Base API check
app.get('/api', (req, res) => {
  res.json({ status: 'ok', message: 'PromptVault API is running', timestamp: new Date().toISOString() });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Debug endpoint (only in development)
if (process.env.NODE_ENV !== 'production') {
  app.get('/api/debug', (req, res) => {
    res.json({
      env: process.env.NODE_ENV,
      mongodbUri: process.env.MONGODB_URI ? 'SET' : 'NOT SET',
      jwtSecret: process.env.JWT_SECRET ? 'SET' : 'NOT SET',
      mongooseState: mongoose.connection.readyState
    });
  });
}

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
  connectDB().catch((err) => {
    console.error('Initial DB warmup failed:', err.message);
  });
}

// For Vercel: export the app for serverless functions
module.exports = app;

// For local development: listen on port
const PORT = process.env.PORT || 5001;
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(PORT, async () => {
    console.log(`🚀 Server running on port ${PORT}`);
    try {
      await connectDB();
      console.log('✅ MongoDB connected successfully!');
    } catch (err) {
      console.error('❌ Failed to connect to MongoDB:', err.message);
    }
  });
}
