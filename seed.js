const mongoose = require('mongoose');
const dotenv = require('dotenv');
const dns = require('dns');

// Configure DNS to use Google's public DNS servers (fixes MongoDB SRV lookup issues)
dns.setServers(['8.8.8.8', '8.8.4.4']);

dotenv.config();

const Category = require('./models/Category');
const Prompt = require('./models/Prompt');
const Admin = require('./models/Admin');

const categories = [
  { name: 'Study & Learning', icon: '📚', color: '#3b82f6', description: 'Prompts for students, research, and academic learning', order: 1 },
  { name: 'Software Development', icon: '💻', color: '#8b5cf6', description: 'Code generation, debugging, architecture, and tech prompts', order: 2 },
  { name: 'Physical Fitness', icon: '💪', color: '#f59e0b', description: 'Workout plans, exercise routines, and fitness guidance', order: 3 },
  { name: 'Health & Wellness', icon: '🏥', color: '#10b981', description: 'Health advice, nutrition, mental wellness prompts', order: 4 },
  { name: 'Business & Marketing', icon: '📈', color: '#ef4444', description: 'Marketing copy, business strategy, and entrepreneurship', order: 5 },
  { name: 'Creative Writing', icon: '✍️', color: '#ec4899', description: 'Stories, poetry, scripts, and creative content', order: 6 },
  { name: 'Productivity', icon: '⚡', color: '#06b6d4', description: 'Task management, time optimization, goal setting', order: 7 },
  { name: 'Language Learning', icon: '🌍', color: '#f97316', description: 'Language practice, translation, grammar prompts', order: 8 },
  { name: 'Art & Design', icon: '🎨', color: '#a855f7', description: 'Image generation, design feedback, creative direction', order: 9 },
  { name: 'Finance & Investing', icon: '💰', color: '#84cc16', description: 'Financial planning, investment analysis, budgeting', order: 10 },
  { name: 'Cooking & Recipes', icon: '🍳', color: '#fb923c', description: 'Recipe creation, meal planning, cooking guidance', order: 11 },
  { name: 'Career & Resume', icon: '🎯', color: '#64748b', description: 'Resume writing, interview prep, career guidance', order: 12 }
];

const seedPrompts = (categoryMap) => [
  // Study & Learning
  {
    title: 'Feynman Technique Explainer',
    content: 'Explain [TOPIC] to me as if I am a complete beginner with zero prior knowledge. Use simple analogies, real-world examples, and avoid jargon. Break it down into the most fundamental concepts, then build up from there. After explaining, give me 3 questions I can use to test my understanding.',
    description: 'Use the Feynman technique to deeply understand any topic',
    category: categoryMap['Study & Learning'],
    tags: ['feynman', 'learning', 'explanation', 'study'],
    difficulty: 'beginner',
    aiModel: 'Any',
    isFeatured: true
  },
  {
    title: 'Active Recall Flashcard Generator',
    content: 'I am studying [SUBJECT/TOPIC]. Create 15 high-quality flashcard pairs (question on front, answer on back) that cover the most important concepts. Format each as:\nQ: [question]\nA: [answer]\n\nMake questions specific and answers concise. Include a mix of definitions, concepts, and application questions.',
    description: 'Generate effective flashcards for any subject',
    category: categoryMap['Study & Learning'],
    tags: ['flashcards', 'memorization', 'active recall'],
    difficulty: 'beginner',
    aiModel: 'Any'
  },
  {
    title: 'Research Paper Summarizer',
    content: 'I will provide you with a research paper or academic text. Please summarize it with:\n1. **Core Question**: What problem does this paper address?\n2. **Methodology**: How did they approach it?\n3. **Key Findings**: What are the 3-5 main results?\n4. **Significance**: Why does this matter?\n5. **Limitations**: What are the caveats?\n6. **Key Terms**: Define 5 domain-specific terms.\n\nHere is the text: [PASTE YOUR TEXT]',
    description: 'Break down complex academic papers into digestible summaries',
    category: categoryMap['Study & Learning'],
    tags: ['research', 'academic', 'summarization', 'analysis'],
    difficulty: 'intermediate',
    aiModel: 'Any',
    isFeatured: true
  },
  // Software Development
  {
    title: 'Code Review & Improvement',
    content: 'Please review the following code and provide:\n1. **Bugs**: Any errors, edge cases, or security vulnerabilities\n2. **Performance**: Optimization opportunities\n3. **Readability**: Naming, structure, comments\n4. **Best Practices**: Language/framework-specific improvements\n5. **Refactored Version**: Provide an improved version of the code\n\nLanguage: [LANGUAGE]\nCode:\n```\n[PASTE YOUR CODE]\n```',
    description: 'Get a thorough code review with actionable improvements',
    category: categoryMap['Software Development'],
    tags: ['code review', 'debugging', 'refactoring'],
    difficulty: 'intermediate',
    aiModel: 'Claude',
    isFeatured: true
  },
  {
    title: 'System Architecture Designer',
    content: 'I need to build [DESCRIBE YOUR APPLICATION]. Please design a scalable system architecture including:\n1. **High-Level Architecture**: Components and how they interact\n2. **Tech Stack Recommendation**: Best tools for each layer and why\n3. **Database Design**: Schema/model suggestions\n4. **API Design**: Key endpoints and data flow\n5. **Scalability Considerations**: How to handle growth\n6. **Potential Bottlenecks**: And how to address them\n\nScale: [EXPECTED USERS/LOAD]\nBudget: [BUDGET CONSTRAINTS]',
    description: 'Design complete system architectures for your applications',
    category: categoryMap['Software Development'],
    tags: ['architecture', 'system design', 'scalability'],
    difficulty: 'advanced',
    aiModel: 'GPT-4'
  },
  {
    title: 'SQL Query Optimizer',
    content: 'Here is my slow SQL query:\n```sql\n[YOUR QUERY]\n```\n\nTable schemas:\n[DESCRIBE YOUR TABLES]\n\nPlease:\n1. Explain why this query might be slow\n2. Suggest indexes that would help\n3. Rewrite the query for better performance\n4. Explain the optimizations you made\n5. Give an estimated performance improvement',
    description: 'Optimize slow SQL queries with expert analysis',
    category: categoryMap['Software Development'],
    tags: ['sql', 'database', 'optimization', 'performance'],
    difficulty: 'advanced',
    aiModel: 'Any'
  },
  // Physical Fitness
  {
    title: 'Custom 12-Week Workout Plan',
    content: 'Create a personalized 12-week workout program for me based on:\n- Goal: [WEIGHT LOSS / MUSCLE GAIN / ENDURANCE / STRENGTH]\n- Current Level: [BEGINNER / INTERMEDIATE / ADVANCED]\n- Available Equipment: [GYM / HOME / MINIMAL]\n- Days Per Week: [NUMBER]\n- Time Per Session: [MINUTES]\n- Any Injuries/Limitations: [LIST ANY]\n\nInclude: weekly schedule, sets/reps for each exercise, progressive overload plan, rest day activities, and tips for each phase.',
    description: 'Get a fully personalized workout plan tailored to your goals',
    category: categoryMap['Physical Fitness'],
    tags: ['workout', 'training plan', 'fitness', 'exercise'],
    difficulty: 'beginner',
    aiModel: 'Any',
    isFeatured: true
  },
  {
    title: 'HIIT Workout Generator',
    content: 'Design a [DURATION]-minute HIIT workout for [FITNESS LEVEL: beginner/intermediate/advanced]. I have access to: [EQUIPMENT]. \n\nFormat as:\n- Warm-up (5 min)\n- Main circuit with work:rest ratios\n- Cool-down (5 min)\n\nFor each exercise include: proper form cues, muscles targeted, and modifications for beginners. Make it challenging but achievable.',
    description: 'Generate custom HIIT workouts for any fitness level',
    category: categoryMap['Physical Fitness'],
    tags: ['hiit', 'cardio', 'fat loss', 'high intensity'],
    difficulty: 'intermediate',
    aiModel: 'Any'
  },
  // Health & Wellness
  {
    title: 'Personalized Meal Plan Creator',
    content: 'Create a 7-day meal plan based on my profile:\n- Dietary Preference: [VEGAN/VEGETARIAN/KETO/PALEO/BALANCED]\n- Daily Calorie Goal: [CALORIES]\n- Allergies/Restrictions: [LIST]\n- Cooking Skill: [BEGINNER/INTERMEDIATE/ADVANCED]\n- Prep Time Available: [MINUTES PER DAY]\n- Budget: [BUDGET PER WEEK]\n\nFor each day include breakfast, lunch, dinner, and 2 snacks. Add a shopping list at the end. Include macro breakdowns per day.',
    description: 'Get a complete weekly meal plan with shopping list',
    category: categoryMap['Health & Wellness'],
    tags: ['nutrition', 'meal plan', 'diet', 'healthy eating'],
    difficulty: 'beginner',
    aiModel: 'Any',
    isFeatured: true
  },
  {
    title: 'Mental Health Check-In Journal',
    content: 'Act as a supportive mental wellness coach. Guide me through a structured journaling session with these prompts:\n1. How am I feeling right now on a scale of 1-10 and why?\n2. What is one thing causing me stress today?\n3. What is one thing I am grateful for?\n4. What is one small action I can take today to improve my wellbeing?\n5. What does my inner critic say and how can I reframe it?\n\nAfter I answer each, provide a brief, compassionate reflection and any relevant evidence-based coping strategy.',
    description: 'Guided journaling session for mental wellness and reflection',
    category: categoryMap['Health & Wellness'],
    tags: ['mental health', 'journaling', 'wellness', 'mindfulness'],
    difficulty: 'beginner',
    aiModel: 'Claude'
  },
  // Business & Marketing
  {
    title: 'Email Marketing Campaign Builder',
    content: 'Create a 5-email drip campaign for [PRODUCT/SERVICE] targeting [TARGET AUDIENCE].\n\nFor each email provide:\n- Subject line (with 2 A/B test variants)\n- Preview text\n- Email body (conversational tone)\n- CTA button text\n- Send timing\n\nThe sequence should follow: (1) Welcome, (2) Value/Education, (3) Social Proof, (4) Overcome Objections, (5) Final CTA.\n\nProduct: [DESCRIBE YOUR OFFER]\nMain pain point you solve: [PAIN POINT]',
    description: 'Build a complete email drip campaign from scratch',
    category: categoryMap['Business & Marketing'],
    tags: ['email marketing', 'copywriting', 'drip campaign', 'sales'],
    difficulty: 'intermediate',
    aiModel: 'Any',
    isFeatured: true
  },
  // Creative Writing
  {
    title: 'Story Starter & Plot Developer',
    content: 'I want to write a [GENRE] story. Please help me by:\n1. Generating 3 unique opening paragraphs with different tones\n2. Creating a compelling protagonist with: backstory, motivation, flaw, goal\n3. Designing an antagonist or central conflict\n4. Outlining a 3-act structure with key plot points\n5. Suggesting 5 subplots or twists\n\nTheme I want to explore: [THEME]\nSetting: [TIME/PLACE]\nTarget audience: [AUDIENCE]',
    description: 'Kickstart any story with character development and plot structure',
    category: categoryMap['Creative Writing'],
    tags: ['story', 'fiction', 'plot', 'character development'],
    difficulty: 'beginner',
    aiModel: 'Claude'
  },
  // Career & Resume
  {
    title: 'ATS-Optimized Resume Builder',
    content: 'Help me rewrite my resume to pass ATS (Applicant Tracking Systems) and impress hiring managers.\n\nTarget Job Title: [JOB TITLE]\nTarget Company/Industry: [COMPANY/INDUSTRY]\nYears of Experience: [NUMBER]\n\nMy current experience:\n[PASTE YOUR CURRENT RESUME OR EXPERIENCE]\n\nPlease:\n1. Identify key skills/keywords from the job description\n2. Rewrite bullet points using the STAR method with metrics\n3. Optimize the summary/objective statement\n4. Suggest skills section improvements\n5. Flag any red flags to fix',
    description: 'Optimize your resume to beat ATS and land interviews',
    category: categoryMap['Career & Resume'],
    tags: ['resume', 'job search', 'ATS', 'career'],
    difficulty: 'beginner',
    aiModel: 'Any',
    isFeatured: true
  }
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await Promise.all([Category.deleteMany({}), Prompt.deleteMany({}), Admin.deleteMany({})]);
    console.log('Cleared existing data');

    // Create categories
    const createdCategories = await Category.create(categories);
    const categoryMap = {};
    createdCategories.forEach(c => { categoryMap[c.name] = c._id; });
    console.log(`✅ Created ${createdCategories.length} categories`);

    // Create prompts
    const promptData = seedPrompts(categoryMap);
    await Prompt.create(promptData);
    console.log(`✅ Created ${promptData.length} prompts`);

    // Create super admin
    await Admin.create({
      name: 'Super Admin',
      email: 'admin@promptvault.com',
      password: 'Admin@123456',
      role: 'superadmin'
    });
    console.log('✅ Created super admin: admin@promptvault.com / Admin@123456');

    console.log('\n🎉 Database seeded successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
}

seed();
