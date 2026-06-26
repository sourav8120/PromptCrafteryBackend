const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const Admin = require('../models/Admin');
const { protect } = require('../middleware/auth');

const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });

// @route POST /api/auth/login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

  try {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email }).select('+password');
    if (!admin || !await admin.comparePassword(password)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    if (!admin.isActive) return res.status(401).json({ error: 'Account is deactivated' });

    admin.lastLogin = new Date();
    await admin.save({ validateBeforeSave: false });

    const token = signToken(admin._id);
    res.json({
      token,
      admin: { id: admin._id, name: admin.name, email: admin.email, role: admin.role }
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// @route GET /api/auth/me
router.get('/me', protect, (req, res) => {
  res.json({ admin: { id: req.admin._id, name: req.admin.name, email: req.admin.email, role: req.admin.role } });
});

// @route POST /api/auth/change-password
router.post('/change-password', protect, [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 6 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
  try {
    const admin = await Admin.findById(req.admin._id).select('+password');
    if (!await admin.comparePassword(req.body.currentPassword)) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }
    admin.password = req.body.newPassword;
    await admin.save();
    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
