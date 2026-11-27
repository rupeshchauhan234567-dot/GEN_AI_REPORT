const Groq = require("groq-sdk");
const puppeteer = require("puppeteer");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
  timeout: 60000,
  maxRetries: 0
});

const MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";

function extractJson(content) {
  if (!content || typeof content !== "string") {
    throw new Error("AI returned an empty response.");
  }

  let cleaned = content.trim();

  cleaned = cleaned
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");

  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");

  if (first === -1 || last === -1 || last < first) {
    throw new Error("AI did not return valid JSON.");
  }

  return JSON.parse(cleaned.slice(first, last + 1));
}

function validateQuestion(question) {
  return (
    question &&
    typeof question.question === "string" &&
    question.question.trim() &&
    typeof question.intention === "string" &&
    question.intention.trim() &&
    typeof question.answer === "string" &&
    question.answer.trim()
  );
}

function validateInterviewReport(data) {
  if (!data || typeof data !== "object") {
    throw new Error("Invalid AI report.");
  }

  if (
    !Number.isFinite(Number(data.matchScore)) ||
    Number(data.matchScore) < 0 ||
    Number(data.matchScore) > 100
  ) {
    throw new Error("AI returned an invalid match score.");
  }

  if (
    !Array.isArray(data.technicalQuestions) ||
    data.technicalQuestions.length < 5 ||
    !data.technicalQuestions.every(validateQuestion)
  ) {
    throw new Error("AI returned invalid technical questions.");
  }

  if (
    !Array.isArray(data.behavioralQuestions) ||
    data.behavioralQuestions.length < 5 ||
    !data.behavioralQuestions.every(validateQuestion)
  ) {
    throw new Error("AI returned invalid behavioral questions.");
  }

  if (
    !Array.isArray(data.skillGaps) ||
    data.skillGaps.length < 3 ||
    !data.skillGaps.every(item =>
      item &&
      typeof item.skill === "string" &&
      ["low", "medium", "high"].includes(item.severity)
    )
  ) {
    throw new Error("AI returned invalid skill gaps.");
  }

  if (
    !Array.isArray(data.preparationPlan) ||
    data.preparationPlan.length < 5 ||
    !data.preparationPlan.every(day =>
      Number.isFinite(Number(day.day)) &&
      typeof day.focus === "string" &&
      Array.isArray(day.tasks) &&
      day.tasks.length >= 2 &&
      day.tasks.every(task => typeof task === "string")
    )
  ) {
    throw new Error("AI returned an invalid preparation plan.");
  }

  if (!data.title || typeof data.title !== "string") {
    throw new Error("AI returned an invalid report title.");
  }

  return {
    title: data.title.trim().slice(0, 180),
    matchScore: Number(data.matchScore),
    summary: String(data.summary || ""),
    strengths: Array.isArray(data.strengths)
      ? data.strengths.filter(item => typeof item === "string").slice(0, 15)
      : [],
    technicalQuestions: data.technicalQuestions,
    behavioralQuestions: data.behavioralQuestions,
    skillGaps: data.skillGaps,
    preparationPlan: data.preparationPlan
  };
}

async function groqRequest(messages, options = {}) {
  const attempts = Math.min(
    3,
    Math.max(1, Number(process.env.GROQ_MAX_ATTEMPTS) || 2)
  );

  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await groq.chat.completions.create({
        model: MODEL,
        messages,
        temperature: options.temperature ?? 0.3,
        max_completion_tokens: options.maxTokens ?? 8000,
        ...(options.json ? {
          response_format: { type: "json_object" }
        } : {})
      });

      const content = response.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error("AI returned an empty response.");
      }

      return content;
    } catch (error) {
      lastError = error;

      const status = error.status || error.statusCode;
      const retryable =
        !status ||
        [408, 429, 500, 502, 503, 504].includes(status);

      if (!retryable || attempt === attempts) break;

      await new Promise(resolve => setTimeout(resolve, attempt * 1200));
    }
  }

  console.error("GROQ API FAILED:", {
  model: MODEL,
  status: lastError?.status,
  code: lastError?.code,
  message: lastError?.message
});

  const error = new Error(
    lastError?.status === 429
      ? "AI service is busy. Please try again shortly."
      : "Unable to generate an AI response right now."
  );

  error.status = lastError?.status === 429 ? 429 : 503;
  throw error;
}

async function generateGroqJson(prompt, options = {}) {
  const content = await groqRequest([
    {
      role: "system",
      content: "You are a precise AI assistant. Return valid JSON only. Never invent personal experience, qualifications, job listings, or facts."
    },
    {
      role: "user",
      content: prompt
    }
  ], {
    json: true,
    maxTokens: options.maxTokens || 8000,
    temperature: options.temperature ?? 0.3
  });

  return extractJson(content);
}

async function generateGroqText(messages, options = {}) {
  return groqRequest(
    messages.map(message => ({
      role: ["system", "assistant"].includes(message.role)
        ? message.role
        : "user",
      content: String(message.content || "")
    })),
    {
      maxTokens: options.maxTokens || 2500,
      temperature: options.temperature ?? 0.4
    }
  );
}

async function generateInterviewReport({
  jobDescription,
  selfDescription,
  resumeText
}) {
  const prompt = `
Create a detailed interview preparation report using the candidate information.

JOB DESCRIPTION:
${jobDescription}

CANDIDATE DESCRIPTION:
${selfDescription}

RESUME TEXT:
${resumeText || "Not provided"}

Return a JSON object with this exact structure:
{
  "title": "Role-specific report title",
  "matchScore": 0,
  "summary": "Honest candidate-job fit summary",
  "strengths": ["strength 1", "strength 2"],
  "technicalQuestions": [
    {
      "question": "Interview question",
      "intention": "What interviewer evaluates",
      "answer": "A sample answer suitable for this candidate"
    }
  ],
  "behavioralQuestions": [
    {
      "question": "Behavioral question",
      "intention": "What interviewer evaluates",
      "answer": "A truthful sample answer framework"
    }
  ],
  "skillGaps": [
    {
      "skill": "Skill",
      "severity": "low",
      "explanation": "Why it matters",
      "recommendation": "How to improve"
    }
  ],
  "preparationPlan": [
    {
      "day": 1,
      "focus": "Topic",
      "tasks": ["Task 1", "Task 2"]
    }
  ]
}

Rules:
- Exactly 8 technical questions.
- At least 5 behavioral questions.
- At least 3 skill gaps.
- Exactly 7 preparation days.
- Each preparation day must have at least 2 tasks.
- matchScore must be an integer from 0 to 100.
- Never claim the candidate has experience not stated in their information.
- If information is missing, say so honestly.
- Sample answers must be adaptable and must not fabricate achievements.
- Return JSON only.
`;

  const raw = await generateGroqJson(prompt, { maxTokens: 12000 });

  return validateInterviewReport(raw);
}

function sanitizeHtml(html) {
  return String(html || "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, "")
    .replace(/<object\b[^>]*>[\s\S]*?<\/object>/gi, "")
    .replace(/<embed\b[^>]*>/gi, "")
    .replace(/<form\b[^>]*>[\s\S]*?<\/form>/gi, "")
    .replace(/\son\w+\s*=\s*(['"]).*?\1/gi, "")
    .replace(/javascript:/gi, "");
}


async function htmlToPdf(html) {
  let browser;

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();

    await page.setJavaScriptEnabled(false);
    await page.setRequestInterception(true);

    page.on("request", request => {
      const url = request.url();

      if (url.startsWith("data:") || url === "about:blank") {
        request.continue();
      } else {
        request.abort();
      }
    });

    await page.setContent(sanitizeHtml(html), {
      waitUntil: "domcontentloaded",
      timeout: 30000
    });

    const pdfData = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "18mm",
        right: "15mm",
        bottom: "18mm",
        left: "15mm"
      }
    });

    const buffer = Buffer.from(pdfData);

    console.log("PDF OUTPUT DEBUG:", {
      isBuffer: Buffer.isBuffer(buffer),
      length: buffer.length,
      header: buffer.subarray(0, 5).toString("ascii")
    });

    if (
      buffer.length === 0 ||
      buffer.subarray(0, 5).toString("ascii") !== "%PDF-"
    ) {
      throw new Error("PDF generation returned an invalid file.");
    }

    return buffer;

  } catch (error) {
    console.error("HTML TO PDF ERROR:", error);
    throw error;
  } finally {
    if (browser) await browser.close();
  }
}


async function generateResumePdf({ user, report }) {
  const prompt = `
Create a professional, ATS-friendly resume in HTML.

Candidate information:
${JSON.stringify(user)}

Interview report:
${JSON.stringify(report)}

Rules:
- Use only information supplied above.
- Never invent a company, qualification, degree, project, date or achievement.
- Leave missing information out.
- Return JSON: {"html":"complete HTML document"}.
- Keep design clean and print-friendly.
- Use inline CSS only.
- No JavaScript, external images, external fonts or links to external resources.
`;

  const result = await generateGroqJson(prompt, { maxTokens: 6000 });

  if (!result.html || typeof result.html !== "string") {
    throw new Error("AI could not generate the resume layout.");
  }

  return htmlToPdf(result.html);
}

module.exports = {
  generateGroqJson,
  generateGroqText,
  generateInterviewReport,
  generateResumePdf
};