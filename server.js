require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── Gemini setup ──────────────────────────────────────────────────────────
let genAI = null;
if (process.env.GEMINI_API_KEY) {
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
}

function extractJSON(text) {
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON object found in response');
  return JSON.parse(match[0]);
}

async function callGemini(prompt) {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  const result = await model.generateContent(prompt);
  return extractJSON(result.response.text());
}

// ─── Mock fallback data ────────────────────────────────────────────────────
const MOCK_ROADMAP = {
  roadmap: {
    title: 'Full-Stack Developer Roadmap',
    totalWeeks: 24,
    phases: [
      {
        id: 'phase-1',
        name: 'Web Foundations',
        description: 'Master the core building blocks of the web',
        weeks: 6,
        skills: ['HTML & CSS', 'JavaScript', 'Git & GitHub'],
        color: '#4F8EF7'
      },
      {
        id: 'phase-2',
        name: 'Frontend & Backend',
        description: 'Build interactive UIs and server-side APIs',
        weeks: 10,
        skills: ['React', 'Node.js', 'Express', 'REST APIs'],
        color: '#8B5CF6'
      },
      {
        id: 'phase-3',
        name: 'Full-Stack Mastery',
        description: 'Ship production-grade applications',
        weeks: 8,
        skills: ['Databases', 'Auth', 'Deployment', 'CI/CD'],
        color: '#10B981'
      }
    ]
  },
  skillTree: [
    { id: 'html-css', name: 'HTML & CSS', category: 'Foundation', level: 1, prerequisites: [], description: 'Build structured, styled web pages', unlocked: true },
    { id: 'javascript', name: 'JavaScript', category: 'Foundation', level: 1, prerequisites: [], description: 'Core language of the web', unlocked: true },
    { id: 'git', name: 'Git & GitHub', category: 'Foundation', level: 1, prerequisites: [], description: 'Version control for every project', unlocked: true },
    { id: 'react', name: 'React', category: 'Frontend', level: 2, prerequisites: ['html-css', 'javascript'], description: 'Build modern component-based UIs', unlocked: false },
    { id: 'nodejs', name: 'Node.js', category: 'Backend', level: 2, prerequisites: ['javascript'], description: 'Server-side JavaScript runtime', unlocked: false },
    { id: 'express', name: 'Express', category: 'Backend', level: 2, prerequisites: ['nodejs'], description: 'Fast, minimalist Node.js framework', unlocked: false },
    { id: 'sql', name: 'SQL & Databases', category: 'Data', level: 2, prerequisites: ['javascript'], description: 'Store and query persistent data', unlocked: false },
    { id: 'auth', name: 'Auth & Security', category: 'Advanced', level: 3, prerequisites: ['express', 'sql'], description: 'JWT auth and secure APIs', unlocked: false },
    { id: 'deployment', name: 'Cloud Deployment', category: 'Advanced', level: 3, prerequisites: ['nodejs', 'react'], description: 'Ship apps to Render, Vercel, AWS', unlocked: false }
  ],
  dailyQuests: [
    { id: 'q-mock-1', title: 'Build Your First Webpage', description: 'Create an HTML file with a heading, paragraph, image, and a styled button using only HTML and CSS. Make it look great.', xp: 30, type: 'build', duration: '45 min' },
    { id: 'q-mock-2', title: 'JavaScript Variables & Functions', description: 'Complete the FreeCodeCamp JavaScript Basics module — cover variables, functions, conditionals, and loops.', xp: 25, type: 'learn', duration: '30 min' },
    { id: 'q-mock-3', title: 'Git Your First Repo', description: 'Create a GitHub repo, push your webpage from Quest 1, and write a meaningful README that explains your project.', xp: 20, type: 'practice', duration: '20 min' }
  ],
  resources: [
    { title: 'The Odin Project', type: 'course', provider: 'theodinproject.com', difficulty: 'beginner', description: 'Free full-stack curriculum from zero to hired' },
    { title: 'CS50 Web Programming', type: 'course', provider: 'edX / Harvard', difficulty: 'beginner', description: "Harvard's legendary web dev course, completely free" },
    { title: 'JavaScript.info', type: 'article', provider: 'javascript.info', difficulty: 'beginner', description: 'The most comprehensive JS reference on the internet' }
  ]
};

const MOCK_QUESTS = [
  { id: 'q-new-1', title: 'Build a React Todo App', description: 'Create a fully functional Todo app in React with add, delete, and toggle-complete functionality. Use useState and useEffect.', xp: 50, type: 'build', duration: '1.5 hours' },
  { id: 'q-new-2', title: 'Study Flexbox & CSS Grid', description: 'Complete CSS Grid Garden and Flexbox Froggy to master modern layout techniques. Then rebuild a layout using both.', xp: 25, type: 'practice', duration: '35 min' },
  { id: 'q-new-3', title: 'Code Review: Yesterday\'s Work', description: 'Review your previous project with fresh eyes. Find 3 things to improve, refactor them, and document what you changed.', xp: 20, type: 'review', duration: '20 min' }
];

// ─── Routes ────────────────────────────────────────────────────────────────
app.post('/api/generate-roadmap', async (req, res) => {
  const { goal, timePerDay, skillLevel, situation, enjoyment } = req.body;

  if (!genAI) {
    return res.json({ success: true, data: MOCK_ROADMAP, mock: true });
  }

  try {
    const prompt = `You are a career coach AI for an RPG-style career learning platform called Career Copilot.
Generate a personalized learning roadmap for this user:
- Dream career goal: ${goal}
- Daily time available: ${timePerDay}
- Current skill level: ${skillLevel}
- Current life situation: ${situation || 'Not specified'}
- What they enjoy: ${Array.isArray(enjoyment) ? enjoyment.join(', ') : (enjoyment || 'Not specified')}

Return ONLY a valid JSON object (no markdown, no extra text) with this exact structure:
{
  "roadmap": {
    "title": "string",
    "totalWeeks": number,
    "phases": [
      {
        "id": "phase-1",
        "name": "string",
        "description": "string",
        "weeks": number,
        "skills": ["skill1", "skill2", "skill3"],
        "color": "#4F8EF7"
      }
    ]
  },
  "skillTree": [
    {
      "id": "unique-kebab-id",
      "name": "Skill Name",
      "category": "Category",
      "level": 1,
      "prerequisites": [],
      "description": "One sentence description",
      "unlocked": true
    }
  ],
  "dailyQuests": [
    {
      "id": "q-1",
      "title": "Quest Title",
      "description": "Specific, actionable description with clear steps",
      "xp": 30,
      "type": "learn",
      "duration": "45 min"
    }
  ],
  "resources": [
    {
      "title": "Resource Name",
      "type": "course",
      "provider": "Platform Name",
      "difficulty": "beginner",
      "description": "One sentence about this resource"
    }
  ]
}

Rules:
- Exactly 3 roadmap phases. Colors: phase 1 = "#4F8EF7", phase 2 = "#8B5CF6", phase 3 = "#10B981"
- 8-10 skill tree nodes across 3 levels. Level 1 nodes: unlocked=true. Level 2-3: unlocked=false
- Prerequisites are arrays of node "id" strings from level 1 nodes
- Exactly 3 daily quests. Types: "learn", "practice", "build", or "review". XP: 20-50
- Exactly 3 learning resources
- Make everything specific to: "${goal}"
- Tailor quests and pacing to their situation and enjoyment preferences`;

    const data = await callGemini(prompt);
    res.json({ success: true, data });
  } catch (err) {
    console.error('Gemini roadmap error:', err.message);
    res.json({ success: true, data: MOCK_ROADMAP, mock: true });
  }
});

app.post('/api/generate-quests', async (req, res) => {
  const { goal, completedSkills = [], currentPhase = 'Foundation', level = 1 } = req.body;

  if (!genAI) {
    return res.json({ success: true, data: { quests: MOCK_QUESTS }, mock: true });
  }

  try {
    const prompt = `Generate exactly 3 fresh daily quests for a Career Copilot user.

User context:
- Goal: ${goal}
- Current phase: ${currentPhase}
- Completed skills: ${completedSkills.join(', ') || 'none yet'}
- Player level: ${level}

Return ONLY valid JSON:
{
  "quests": [
    {
      "id": "q-${Date.now()}-1",
      "title": "Quest Title",
      "description": "Specific, actionable description with clear steps",
      "xp": 30,
      "type": "learn",
      "duration": "45 min"
    }
  ]
}

Rules:
- Exactly 3 quests. Make them varied: one "learn", one "practice" or "build", one "review" or "build"
- XP: 20-50 based on difficulty
- Duration: realistic time estimates
- Quests must be specific and actionable for the goal: "${goal}"
- Slightly harder than beginner if level > 3`;

    const data = await callGemini(prompt);
    res.json({ success: true, data });
  } catch (err) {
    console.error('Gemini quests error:', err.message);
    res.json({ success: true, data: { quests: MOCK_QUESTS }, mock: true });
  }
});

app.post('/api/generate-portfolio', async (req, res) => {
  const { name, goal, completedSkills = [], level = 1, xp = 0 } = req.body;

  if (!genAI) {
    return res.json({
      success: true,
      data: {
        bio: `${name} is an ambitious learner on a mission to become a ${goal}. With consistent daily practice and a structured learning roadmap, they're building the skills needed to make an impact in tech.`,
        headline: `Aspiring ${goal} | Career Copilot Scholar`,
        highlights: ['Committed to daily learning streaks', 'Completing structured skill-based quests', 'Building real projects to prove skills']
      },
      mock: true
    });
  }

  try {
    const prompt = `Write a professional portfolio summary for a Career Copilot learner.

Name: ${name}
Goal: ${goal}
Completed skills: ${completedSkills.join(', ') || 'Getting started'}
Player level: ${level}
Total XP earned: ${xp}

Return ONLY valid JSON:
{
  "bio": "2-3 sentence professional bio highlighting journey and ambition",
  "headline": "Professional headline for this person (under 80 chars)",
  "highlights": ["achievement1", "achievement2", "achievement3"]
}

Make it sound ambitious, professional, and forward-looking. Specific to their goal: "${goal}".`;

    const data = await callGemini(prompt);
    res.json({ success: true, data });
  } catch (err) {
    console.error('Gemini portfolio error:', err.message);
    res.json({
      success: true,
      data: {
        bio: `${name} is an ambitious learner on a mission to become a ${goal}. With consistent daily practice and a structured AI-powered roadmap, they're systematically building the skills needed to land their dream role.`,
        headline: `Aspiring ${goal} | Career Copilot Scholar`,
        highlights: ['Committed to daily learning streaks', 'Completing structured skill-based quests', 'Building real projects to prove skills']
      },
      mock: true
    });
  }
});

app.post('/api/verify-proof', async (req, res) => {
  const { questTitle, questDescription, proof, questXP } = req.body;

  if (!genAI) {
    return res.json({
      success: true,
      data: {
        approved: true,
        feedback: `Solid proof for "${questTitle}"! Your work demonstrates real engagement with the material. This is exactly the kind of hands-on practice that builds lasting skills.`,
        xpBonus: 10
      },
      mock: true
    });
  }

  try {
    const prompt = `You are an AI quest verifier for Career Copilot, a gamified career learning platform.

Quest title: "${questTitle}"
Quest description: "${questDescription}"

The learner submitted this proof of completion:
"""
${proof}
"""

Your job: decide if this proof genuinely shows they completed or made real progress on this quest.
Be encouraging and give benefit of the doubt. Approve if they show any meaningful effort or learning.
Only reject if the proof is completely off-topic, empty, or clearly fabricated (e.g. just "I did it" with zero detail).

Return ONLY valid JSON (no markdown):
{
  "approved": boolean,
  "feedback": "1-2 sentences. If approved: celebrate a specific thing they mentioned. If rejected: tell them exactly one concrete thing to add to get approved.",
  "xpBonus": number (0 if not approved; 5-20 if approved, higher for richer proof with links or specific details)
}`;

    const data = await callGemini(prompt);
    res.json({ success: true, data });
  } catch (err) {
    console.error('Gemini verify error:', err.message);
    res.json({
      success: true,
      data: {
        approved: true,
        feedback: `Great effort on "${questTitle}"! Your commitment to proving your work shows real dedication to growth.`,
        xpBonus: 5
      },
      mock: true
    });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  const apiStatus = process.env.GEMINI_API_KEY ? '✓ Gemini AI connected' : '⚠ No GEMINI_API_KEY — using mock data';
  console.log(`\n🚀 Career Copilot running at http://localhost:${PORT}`);
  console.log(`   ${apiStatus}\n`);
});
