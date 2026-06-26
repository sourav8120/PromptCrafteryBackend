const mongoose = require('mongoose');
const slugify = require('slugify');

const promptSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  slug: {
    type: String,
    unique: true
  },
  content: {
    type: String,
    required: [true, 'Prompt content is required'],
    maxlength: [10000, 'Prompt content cannot exceed 10000 characters']
  },
  description: {
    type: String,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Category is required']
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner'
  },
  aiModel: {
    type: String,
    enum: ['ChatGPT', 'Claude', 'Gemini', 'Any', 'GPT-4', 'Llama'],
    default: 'Any'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  views: {
    type: Number,
    default: 0
  },
  copies: {
    type: Number,
    default: 0
  },
  likes: {
    type: Number,
    default: 0
  },
  author: {
    type: String,
    default: 'PromptVault Team'
  }
}, {
  timestamps: true
});

// Auto-generate slug
promptSchema.pre('save', async function(next) {
  if (this.isModified('title')) {
    let baseSlug = slugify(this.title, { lower: true, strict: true });
    let slug = baseSlug;
    let count = 1;
    while (await mongoose.model('Prompt').findOne({ slug, _id: { $ne: this._id } })) {
      slug = `${baseSlug}-${count++}`;
    }
    this.slug = slug;
  }
  next();
});

// Text index for search
promptSchema.index({ title: 'text', content: 'text', tags: 'text', description: 'text' });
promptSchema.index({ category: 1, isActive: 1 });
promptSchema.index({ isFeatured: 1, isActive: 1 });

module.exports = mongoose.model('Prompt', promptSchema);
