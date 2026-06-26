const mongoose = require('mongoose');
const dotenv = require('dotenv');
const dns = require('dns');

// Configure DNS
dns.setServers(['8.8.8.8', '8.8.4.4']);

dotenv.config();

const Category = require('./models/Category');
const Prompt = require('./models/Prompt');

// Prompt templates for each category
const promptTemplates = {
  'Study & Learning': [
    'Create a study plan for [TOPIC]',
    'Explain [TOPIC] in simple terms',
    'Generate flashcard questions for [TOPIC]',
    'Write a summary of [TOPIC]',
    'Create practice problems for [TOPIC]',
    'Explain the key concepts of [TOPIC]',
    'Generate quiz questions about [TOPIC]',
    'Create a mind map for [TOPIC]'
  ],
  'Software Development': [
    'Write [LANGUAGE] code for [TASK]',
    'Debug this [LANGUAGE] code: [CODE]',
    'Optimize this algorithm: [ALGORITHM]',
    'Design system for [SYSTEM]',
    'Explain [CONCEPT] in programming',
    'Write unit tests for [FUNCTION]',
    'Create API endpoint for [ENDPOINT]',
    'Refactor this code for better performance'
  ],
  'Physical Fitness': [
    'Create a [DURATION] workout plan for [GOAL]',
    'Suggest exercises for [MUSCLE_GROUP]',
    'Create a weekly fitness routine for [LEVEL]',
    'Suggest diet plan for [FITNESS_GOAL]',
    'Explain proper form for [EXERCISE]',
    'Create HIIT workout for [DURATION]',
    'Suggest supplements for [GOAL]',
    'Create strength training program'
  ],
  'Health & Wellness': [
    'Suggest tips for [HEALTH_CONDITION]',
    'Create meal plan for [HEALTH_GOAL]',
    'Explain benefits of [HEALTH_PRACTICE]',
    'Suggest stress management techniques',
    'Create sleep improvement plan',
    'Suggest meditation routine for [DURATION]',
    'Explain nutrition facts about [FOOD]',
    'Create wellness routine for [GOAL]'
  ],
  'Business & Marketing': [
    'Write marketing copy for [PRODUCT]',
    'Create business plan for [BUSINESS]',
    'Suggest marketing strategy for [PRODUCT]',
    'Write sales pitch for [SERVICE]',
    'Create email campaign for [PRODUCT]',
    'Suggest social media content for [NICHE]',
    'Write product description for [PRODUCT]',
    'Create brand positioning strategy'
  ],
  'Creative Writing': [
    'Write a short story about [THEME]',
    'Create character profile for [CHARACTER_TYPE]',
    'Write dialogue between [CHARACTERS]',
    'Create story plot for [GENRE]',
    'Write poem about [THEME]',
    'Create screenplay for [SCENARIO]',
    'Write world-building for [SETTING]',
    'Create story outline for [STORY_TYPE]'
  ],
  'Productivity': [
    'Create daily schedule for [GOAL]',
    'Suggest productivity tips for [ROLE]',
    'Create time management plan',
    'Suggest tools for [TASK_TYPE]',
    'Create project timeline for [PROJECT]',
    'Suggest habit formation strategy',
    'Create goal breakdown for [GOAL]',
    'Suggest focus techniques'
  ],
  'Language Learning': [
    'Teach me [LANGUAGE] vocabulary',
    'Explain grammar of [LANGUAGE]',
    'Create language learning plan',
    'Suggest conversation practice',
    'Explain idioms in [LANGUAGE]',
    'Create translation exercise',
    'Suggest pronunciation tips',
    'Create language immersion plan'
  ],
  'Art & Design': [
    'Design concept for [PROJECT]',
    'Suggest color palette for [THEME]',
    'Create design brief for [DESIGN_TYPE]',
    'Suggest typography for [DESIGN]',
    'Create layout concept for [LAYOUT_TYPE]',
    'Suggest design principles for [DESIGN]',
    'Create mood board for [THEME]',
    'Design user interface for [APP]'
  ],
  'Finance & Investing': [
    'Create investment strategy for [GOAL]',
    'Suggest budgeting tips for [SITUATION]',
    'Explain investment concept [CONCEPT]',
    'Create financial plan for [TIMEFRAME]',
    'Suggest savings strategy for [GOAL]',
    'Explain stock market basics',
    'Create retirement plan',
    'Suggest tax optimization strategy'
  ],
  'Cooking & Recipes': [
    'Create recipe for [CUISINE] [DISH]',
    'Suggest meal plan for [DIET]',
    'Create cooking tips for [TECHNIQUE]',
    'Suggest ingredient substitutes',
    'Create menu for [OCCASION]',
    'Suggest food pairing for [FOOD]',
    'Create cooking schedule for [EVENT]',
    'Suggest kitchen hacks'
  ],
  'Career & Resume': [
    'Write resume for [JOB_TITLE]',
    'Create cover letter for [COMPANY]',
    'Suggest interview tips for [JOB_TYPE]',
    'Create career development plan',
    'Suggest skill development for [ROLE]',
    'Create LinkedIn profile for [INDUSTRY]',
    'Suggest networking strategy',
    'Create portfolio for [PROFESSION]'
  ]
};

const generatePrompts = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const categories = await Category.find();
    console.log(`📚 Found ${categories.length} categories`);

    const PROMPTS_PER_CATEGORY = Math.ceil(200000 / categories.length);
    let totalCreated = 0;

    for (const category of categories) {
      const templates = promptTemplates[category.name] || promptTemplates['Study & Learning'];
      const prompts = [];

      console.log(`\n📝 Generating prompts for "${category.name}"...`);

      for (let i = 0; i < PROMPTS_PER_CATEGORY; i++) {
        const template = templates[i % templates.length];
        const variations = [
          template,
          `${template} and explain the steps`,
          `${template} with best practices`,
          `${template} for beginners`,
          `${template} for advanced users`,
          `${template} with real examples`,
          `${template} and provide resources`
        ];

        const title = `${template.substring(0, 60)} - ${i + 1}`;
        const slug = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50)}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        const prompt = new Prompt({
          title: title,
          content: variations[i % variations.length],
          description: `${template.substring(0, 60)}...`,
          slug: slug,
          category: category._id,
          isFeatured: Math.random() > 0.95, // 5% featured
          likes: Math.floor(Math.random() * 100),
          views: Math.floor(Math.random() * 1000)
        });

        prompts.push(prompt);

        // Insert in batches of 1000
        if (prompts.length === 1000) {
          await Prompt.insertMany(prompts);
          totalCreated += prompts.length;
          console.log(`   ✅ Created ${totalCreated} prompts total...`);
          prompts.length = 0;
        }
      }

      // Insert remaining prompts
      if (prompts.length > 0) {
        await Prompt.insertMany(prompts);
        totalCreated += prompts.length;
      }

      console.log(`   ✅ Created ${PROMPTS_PER_CATEGORY} prompts for "${category.name}"`);
    }

    // Get final count
    const finalCount = await Prompt.countDocuments();
    
    console.log('\n');
    console.log('═════════════════════════════════════');
    console.log('🎉 Database generation complete!');
    console.log('═════════════════════════════════════');
    console.log(`✅ Total Prompts Created: ${finalCount}`);
    console.log(`📊 Average per category: ${Math.floor(finalCount / categories.length)}`);
    console.log('═════════════════════════════════════\n');

    // Show category breakdown
    console.log('📈 Prompts per category:');
    for (const category of categories) {
      const count = await Prompt.countDocuments({ category: category._id });
      console.log(`   - ${category.name}: ${count} prompts`);
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
};

generatePrompts();
