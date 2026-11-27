const mongoose = require("mongoose");

const WorkspaceItem = require("../models/workspaceItem.model");
const InterviewReport = require("../models/interviewReport.model");

const {
  generateGroqJson,
  generateGroqText
} = require("../services/ai.service");

const ALLOWED_TYPES = [
  "note",
  "task",
  "flashcard",
  "planner",
  "bookmark",
  "goal",
  "job",
  "resume",
  "chat"
];

const ALLOWED_STATUSES = [
  "active",
  "completed",
  "archived",
  "applied",
  "interview",
  "rejected",
  "offer"
];

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function cleanItem(item) {
  const value = item.toObject ? item.toObject() : item;

  return {
    ...value,
    id: value._id?.toString(),
    _id: value._id?.toString()
  };
}

function validateItemBody(body, partial = false) {
  if (!partial || body.title !== undefined) {
    if (
      typeof body.title !== "string" ||
      !body.title.trim() ||
      body.title.trim().length > 180
    ) {
      return "Title is required and must be under 180 characters.";
    }
  }

  if (!partial || body.type !== undefined) {
    if (!ALLOWED_TYPES.includes(body.type)) {
      return "Invalid workspace item type.";
    }
  }

  if (body.tags !== undefined) {
    if (
      !Array.isArray(body.tags) ||
      body.tags.length > 20 ||
      !body.tags.every(tag =>
        typeof tag === "string" && tag.trim().length <= 40
      )
    ) {
      return "Tags must be an array of up to 20 short text values.";
    }
  }

  if (
    body.status !== undefined &&
    !ALLOWED_STATUSES.includes(body.status)
  ) {
    return "Invalid status.";
  }

  if (body.dueAt !== undefined && body.dueAt !== null) {
    if (Number.isNaN(new Date(body.dueAt).getTime())) {
      return "Invalid due date.";
    }
  }

  if (
    body.content !== undefined &&
    (body.content === null || typeof body.content !== "object")
  ) {
    return "Content must be an object or array.";
  }

  return null;
}

exports.listItems = async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));

    const filter = { user: req.user.id };

    if (req.query.type) {
      if (!ALLOWED_TYPES.includes(req.query.type)) {
        return res.status(400).json({
          success: false,
          message: "Invalid item type."
        });
      }

      filter.type = req.query.type;
    }

    if (req.query.status) {
      if (!ALLOWED_STATUSES.includes(req.query.status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status."
        });
      }

      filter.status = req.query.status;
    }

    if (req.query.search) {
      const search = String(req.query.search).trim().slice(0, 100);
      const regex = new RegExp(escapeRegex(search), "i");

      filter.$or = [
        { title: regex },
        { "content.text": regex }
      ];
    }

    const [items, total] = await Promise.all([
      WorkspaceItem.find(filter)
        .sort({ updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),

      WorkspaceItem.countDocuments(filter)
    ]);

    return res.status(200).json({
      success: true,
      items: items.map(cleanItem),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.createItem = async (req, res, next) => {
  try {
    const validationError = validateItemBody(req.body);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError
      });
    }

    const item = await WorkspaceItem.create({
      user: req.user.id,
      type: req.body.type,
      title: req.body.title.trim(),
      content: req.body.content || {},
      tags: (req.body.tags || []).map(tag => tag.trim()),
      status: req.body.status || "active",
      dueAt: req.body.dueAt || null
    });

    return res.status(201).json({
      success: true,
      message: "Workspace item created.",
      item: cleanItem(item)
    });
  } catch (error) {
    next(error);
  }
};

exports.updateItem = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid workspace item ID."
      });
    }

    const validationError = validateItemBody(req.body, true);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError
      });
    }

    const updates = {};

    for (const key of ["title", "content", "tags", "status", "dueAt"]) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    if (updates.title) updates.title = updates.title.trim();

    if (updates.tags) {
      updates.tags = updates.tags.map(tag => tag.trim());
    }

    const item = await WorkspaceItem.findOneAndUpdate(
      { _id: id, user: req.user.id },
      { $set: updates },
     { returnDocument: "after", runValidators: true }
    );

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Workspace item not found."
      });
    }

    return res.status(200).json({
      success: true,
      message: "Workspace item updated.",
      item: cleanItem(item)
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteItem = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid workspace item ID."
      });
    }

    const item = await WorkspaceItem.findOneAndDelete({
      _id: id,
      user: req.user.id
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Workspace item not found."
      });
    }

    return res.status(200).json({
      success: true,
      message: "Workspace item deleted."
    });
  } catch (error) {
    next(error);
  }
};

const AI_TASKS = {
  quiz: "Create a multiple-choice quiz with correct answers and explanations.",
  flashcards: "Create useful study flashcards with question and answer pairs.",
  notes: "Create structured, easy-to-revise study notes.",
  roadmap: "Create a practical step-by-step learning roadmap.",
  "jd-analysis": "Analyze the job description and identify skills, responsibilities and preparation priorities.",
  "project-ideas": "Suggest realistic portfolio projects with features and technology recommendations.",
  "cover-letter": "Write a truthful cover letter using only supplied candidate details.",
  portfolio: "Suggest portfolio sections and project presentation improvements.",
  summary: "Create a concise, structured summary of the supplied topic."
};


exports.aiGenerate = async (req, res, next) => {
  try {
    const task = String(req.body.task || req.body.kind || "").trim();
    const topic = String(req.body.topic || "").trim();
    const context = String(req.body.context || "").trim();

    console.log("AI TASK:", task);

    if (!AI_TASKS[task]) {
      return res.status(400).json({
        success: false,
        message: "Unsupported AI task: " + task
      });
    }

    if (!topic || topic.length > 10000 || context.length > 15000) {
      return res.status(400).json({
        success: false,
        message: "Topic is required. Input is too long."
      });
    }

    const count = Math.min(10, Math.max(3, Number(req.body.count) || 5));

    const schemas = {
      quiz: `
{
  "title": "Quiz title",
  "questions": [
    {
      "question": "Question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answer": "Correct option text",
      "explanation": "Why this answer is correct"
    }
  ]
}
Generate exactly ${count} questions.`,

      flashcards: `
{
  "title": "Flashcard deck title",
  "cards": [
    {
      "front": "Question or concept",
      "back": "Short and accurate answer"
    }
  ]
}
Generate exactly ${count} cards.`,

      notes: `
{
  "title": "Notes title",
  "summary": "Short overview",
  "sections": [
    {
      "heading": "Section heading",
      "content": "Detailed explanation",
      "points": ["Important point 1", "Important point 2"]
    }
  ]
}
Create structured, detailed study notes.`,

      roadmap: `
{
  "title": "Roadmap title",
  "summary": "Roadmap overview",
  "phases": [
    {
      "title": "Phase title",
      "duration": "2 weeks",
      "description": "What to learn",
      "tasks": ["Task 1", "Task 2"]
    }
  ]
}
Create a practical step-by-step roadmap.`,

      "jd-analysis": `
{
  "title": "Job description analysis",
  "role": "Job role",
  "summary": "Role summary",
  "sections": [
    {
      "heading": "Responsibilities",
      "content": "Explanation"
    }
  ],
  "requiredSkills": ["Skill 1", "Skill 2"],
  "preparationTips": ["Tip 1", "Tip 2"]
}`,

      "project-ideas": `
{
  "title": "Project ideas",
  "ideas": [
    {
      "name": "Project name",
      "description": "Project description",
      "difficulty": "Intermediate",
      "technologies": ["React", "Node.js"],
      "features": ["Feature 1", "Feature 2"]
    }
  ]
}
Generate exactly ${count} ideas.`,

      "cover-letter": `
{
  "title": "Cover letter",
  "body": "Complete professional cover letter"
}`,

      portfolio: `
{
  "title": "Portfolio improvement plan",
  "summary": "Portfolio overview",
  "sections": [
    {
      "heading": "Section name",
      "content": "What to include and how to improve it"
    }
  ],
  "ideas": ["Improvement idea 1", "Improvement idea 2"]
}`,

      summary: `
{
  "title": "Topic summary",
  "summary": "Concise summary",
  "sections": [
    {
      "heading": "Main concept",
      "content": "Explanation"
    }
  ],
  "keyPoints": ["Key point 1", "Key point 2"]
}`
    };

    const prompt = `
You are an expert study and career assistant.

TASK:
${AI_TASKS[task]}

TOPIC:
${topic}

ADDITIONAL CONTEXT:
${context || "No additional context supplied."}

REQUIRED JSON STRUCTURE:
${schemas[task]}

IMPORTANT RULES:
- Return one valid JSON object only.
- Follow the exact keys and structure provided above.
- Do not wrap JSON in Markdown code fences.
- Do not omit required fields.
- Use clear, useful and accurate explanations.
- Do not invent personal experience, qualifications, citations or job openings.
- Keep content relevant to the supplied topic.
- For multiple-choice questions, provide exactly four options.
- For quizzes, answer must exactly match one of the options.
- Do not include text outside the JSON object.
`;

    console.log("Sending prompt to Groq...");
    console.log("Groq model:", process.env.GROQ_MODEL || "openai/gpt-oss-120b");

    const result = await generateGroqJson(prompt, {
      maxTokens: 6000,
      temperature: 0.3
    });

    if (!result || typeof result !== "object" || Array.isArray(result)) {
      throw new Error("AI returned an invalid result structure.");
    }

    console.log("AI GENERATION SUCCESS:", task);
    console.log("AI RESULT KEYS:", Object.keys(result));

    return res.status(200).json({
      success: true,
      task,
      result,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error("AI GENERATION ERROR:", {
      message: error.message,
      status: error.status,
      stack: error.stack
    });

    next(error);
  }
};


exports.chat = async (req, res, next) => {
  try {
    const message = String(req.body.message || "").trim();

    if (!message || message.length > 5000) {
      return res.status(400).json({
        success: false,
        message: "Message is required and must be under 5,000 characters."
      });
    }

    const history = Array.isArray(req.body.history)
      ? req.body.history.slice(-8)
      : [];

    const safeHistory = history
      .filter(item =>
        item &&
        ["user", "assistant"].includes(item.role) &&
        typeof item.content === "string"
      )
      .map(item => ({
        role: item.role,
        content: item.content.slice(0, 3000)
      }));

    const response = await generateGroqText([
      {
        role: "user",
        content: "You are Career Learning Hub's career and learning assistant. Give practical, honest and clear guidance. Never invent job listings or claim to have performed external actions."
      },
      ...safeHistory,
      { role: "user", content: message }
    ], {
      maxTokens: 2500
    });

    return res.status(200).json({
      success: true,
      reply: response,
      message: response
    });
  } catch (error) {
    next(error);
  }
};

exports.dashboard = async (req, res, next) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);

    const [
      counts,
      totalReports,
      recentItems,
      recentReports,
      completedTasks
    ] = await Promise.all([
      WorkspaceItem.aggregate([
        { $match: { user: userId } },
        { $group: { _id: "$type", count: { $sum: 1 } } }
      ]),

      InterviewReport.countDocuments({ user: userId }),

      WorkspaceItem.find({ user: userId })
        .sort({ updatedAt: -1 })
        .limit(6)
        .lean(),

      InterviewReport.find({ user: userId })
        .select("title matchScore createdAt")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),

      WorkspaceItem.countDocuments({
        user: userId,
        type: "task",
        status: "completed"
      })
    ]);

    const itemCounts = Object.fromEntries(
      counts.map(item => [item._id, item.count])
    );

    const totalItems = counts.reduce((sum, item) => sum + item.count, 0);

    return res.status(200).json({
      success: true,
      dashboard: {
        totalItems,
        totalReports,
        completedTasks,
        itemCounts,
        recentItems: recentItems.map(cleanItem),
        recentReports
      },
      data: {
        totalItems,
        totalReports,
        completedTasks,
        itemCounts,
        recentItems: recentItems.map(cleanItem),
        recentReports
      }
    });
  } catch (error) {
    next(error);
  }
};