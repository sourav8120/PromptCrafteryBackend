const express = require('express');
const router = express.Router();
const Prompt = require('../models/Prompt');
const Category = require('../models/Category');
const { protect } = require('../middleware/auth');

const logPromptRouteError = (route, err) => {
  console.error(`[Prompts Route] ${route} error:`, err?.message || err, { stack: err?.stack });
};

// GET all prompts (public) with search, filter, pagination
router.get('/', async (req, res) => {
  try {
    const { search, category, tags, difficulty, aiModel, featured, page = 1, limit = 12, sort = '-createdAt' } = req.query;

    let query = { isActive: true };

    if (search) {
      query.$text = { $search: search };
    }
    if (category) {
      const cat = await Category.findOne({ slug: category });
      if (cat) query.category = cat._id;
    }
    if (tags) {
      query.tags = { $in: tags.split(',').map(t => t.trim().toLowerCase()) };
    }
    if (difficulty) query.difficulty = difficulty;
    if (aiModel) query.aiModel = aiModel;
    if (featured === 'true') query.isFeatured = true;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Prompt.countDocuments(query);

    const prompts = await Prompt.find(query)
      .populate('category', 'name slug icon color')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .select('-__v');

    res.json({
      prompts,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit)
      }
    });
  } catch (err) {
    logPromptRouteError('GET /', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET single prompt by slug (public)
router.get('/:slug', async (req, res) => {
  try {
    const prompt = await Prompt.findOneAndUpdate(
      { slug: req.params.slug, isActive: true },
      { $inc: { views: 1 } },
      { new: true }
    ).populate('category', 'name slug icon color');

    if (!prompt) return res.status(404).json({ error: 'Prompt not found' });
    res.json({ prompt });
  } catch (err) {
    logPromptRouteError('GET /:slug', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST increment copy count (public)
router.post('/:id/copy', async (req, res) => {
  try {
    await Prompt.findByIdAndUpdate(req.params.id, { $inc: { copies: 1 } });
    res.json({ message: 'Copy count updated' });
  } catch (err) {
    logPromptRouteError('POST /:id/copy', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST like (public)
router.post('/:id/like', async (req, res) => {
  try {
    const prompt = await Prompt.findByIdAndUpdate(req.params.id, { $inc: { likes: 1 } }, { new: true });
    res.json({ likes: prompt.likes });
  } catch (err) {
    logPromptRouteError('POST /:id/like', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST create prompt (admin)
router.post('/', protect, async (req, res) => {
  try {
    const prompt = await Prompt.create(req.body);
    // Update category prompt count
    await Category.findByIdAndUpdate(req.body.category, { $inc: { promptCount: 1 } });
    const populated = await prompt.populate('category', 'name slug icon color');
    res.status(201).json({ prompt: populated });
  } catch (err) {
    logPromptRouteError('POST /', err);
    res.status(400).json({ error: err.message });
  }
});

// PUT update prompt (admin)
router.put('/:id', protect, async (req, res) => {
  try {
    const prompt = await Prompt.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .populate('category', 'name slug icon color');
    if (!prompt) return res.status(404).json({ error: 'Prompt not found' });
    res.json({ prompt });
  } catch (err) {
    logPromptRouteError('PUT /:id', err);
    res.status(400).json({ error: err.message });
  }
});

// DELETE prompt (admin)
router.delete('/:id', protect, async (req, res) => {
  try {
    const prompt = await Prompt.findByIdAndDelete(req.params.id);
    if (!prompt) return res.status(404).json({ error: 'Prompt not found' });
    await Category.findByIdAndUpdate(prompt.category, { $inc: { promptCount: -1 } });
    res.json({ message: 'Prompt deleted' });
  } catch (err) {
    logPromptRouteError('DELETE /:id', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
