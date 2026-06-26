const express = require('express');
const router = express.Router();
const Prompt = require('../models/Prompt');
const Category = require('../models/Category');
const Admin = require('../models/Admin');
const User = require('../models/User');
const { protect, superAdmin } = require('../middleware/auth');

// GET dashboard stats
router.get('/stats', protect, async (req, res) => {
  try {
    const [totalPrompts, totalCategories, totalViews, totalCopies, featuredPrompts, recentPrompts] = await Promise.all([
      Prompt.countDocuments({ isActive: true }),
      Category.countDocuments({ isActive: true }),
      Prompt.aggregate([{ $group: { _id: null, total: { $sum: '$views' } } }]),
      Prompt.aggregate([{ $group: { _id: null, total: { $sum: '$copies' } } }]),
      Prompt.countDocuments({ isFeatured: true, isActive: true }),
      Prompt.find({ isActive: true }).sort('-createdAt').limit(5).populate('category', 'name icon')
    ]);

    res.json({
      stats: {
        totalPrompts,
        totalCategories,
        totalViews: totalViews[0]?.total || 0,
        totalCopies: totalCopies[0]?.total || 0,
        featuredPrompts
      },
      recentPrompts
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET all prompts for admin (includes inactive)
router.get('/prompts', protect, async (req, res) => {
  try {
    const { page = 1, limit = 20, search, category, isActive } = req.query;
    let query = {};
    if (search) query.$text = { $search: search };
    if (category) query.category = category;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Prompt.countDocuments(query);
    const prompts = await Prompt.find(query)
      .populate('category', 'name slug icon')
      .sort('-createdAt')
      .skip(skip)
      .limit(parseInt(limit));

    res.json({ prompts, total, pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET all categories for admin
router.get('/categories', protect, async (req, res) => {
  try {
    const categories = await Category.find().sort({ order: 1, name: 1 });
    res.json({ categories });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET all registered users for admin
router.get('/users', protect, async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const pageNumber = Math.max(1, parseInt(page) || 1);
    const limitNumber = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const skip = (pageNumber - 1) * limitNumber;

    let query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password')
        .sort('-createdAt')
        .skip(skip)
        .limit(limitNumber),
      User.countDocuments(query)
    ]);

    res.json({ users, total, page: pageNumber, pages: Math.ceil(total / limitNumber) });
  } catch (err) {
    console.error('Admin users fetch error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST bulk import prompts
router.post('/prompts/bulk', protect, async (req, res) => {
  try {
    const { prompts } = req.body;
    if (!Array.isArray(prompts)) return res.status(400).json({ error: 'Prompts must be an array' });

    const results = { success: 0, failed: 0, errors: [] };
    for (const p of prompts) {
      try {
        await Prompt.create(p);
        results.success++;
      } catch (e) {
        results.failed++;
        results.errors.push({ title: p.title, error: e.message });
      }
    }
    res.json({ message: `Imported ${results.success} prompts`, results });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Manage admins (superadmin only)
router.get('/admins', protect, superAdmin, async (req, res) => {
  try {
    const admins = await Admin.find().select('-password');
    res.json({ admins });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/admins', protect, superAdmin, async (req, res) => {
  try {
    const admin = await Admin.create(req.body);
    res.status(201).json({ admin: { id: admin._id, name: admin.name, email: admin.email, role: admin.role } });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ error: 'Email already exists' });
    res.status(400).json({ error: err.message });
  }
});

router.delete('/admins/:id', protect, superAdmin, async (req, res) => {
  try {
    if (req.params.id === req.admin._id.toString()) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    await Admin.findByIdAndDelete(req.params.id);
    res.json({ message: 'Admin deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
