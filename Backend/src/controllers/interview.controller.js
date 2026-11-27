
const mongoose = require("mongoose");
const { PDFParse } = require("pdf-parse");

const InterviewReport = require("../models/interviewReport.model");
const User = require("../models/user.model");

const {
  generateInterviewReport,
  generateResumePdf
} = require("../services/ai.service");

// ========================================
// EXTRACT TEXT FROM RESUME PDF
// ========================================

async function extractPdfText(buffer) {
  let parser;

  try {
    parser = new PDFParse({ data: buffer });

    const result = await parser.getText();
    const text = String(result?.text || "").trim();

    if (!text) {
      throw new Error("No readable text was found in the PDF.");
    }

    return text.slice(0, 30000);
  } finally {
    if (parser) {
      await parser.destroy();
    }
  }
}

// ========================================
// VALIDATE INTERVIEW INPUT
// ========================================

function validateInterviewInput(jobDescription, selfDescription) {
  const jd = String(jobDescription || "").trim();
  const sd = String(selfDescription || "").trim();

  if (!jd) {
    return "Job description is required.";
  }

  if (jd.length > 20000) {
    return "Job description cannot exceed 20,000 characters.";
  }

  if (!sd) {
    return "Self-description is required.";
  }

  if (sd.length > 10000) {
    return "Self-description cannot exceed 10,000 characters.";
  }

  return null;
}

// ========================================
// GENERATE INTERVIEW REPORT
// ========================================

exports.generateInterViewReportController = async (req, res, next) => {
  try {
    const jobDescription = String(
      req.body.jobDescription || ""
    ).trim();

    const selfDescription = String(
      req.body.selfDescription || ""
    ).trim();

    // Validate input
    const validationError = validateInterviewInput(
      jobDescription,
      selfDescription
    );

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError
      });
    }

    // Resume is required
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload your resume PDF."
      });
    }

    // Extract resume text
    const resumeText = await extractPdfText(req.file.buffer);

    // Generate AI report
    const generated = await generateInterviewReport({
      jobDescription,
      selfDescription,
      resumeText
    });

    if (!generated) {
      throw new Error("AI failed to generate the interview report.");
    }

    // Save report in database
    const report = await InterviewReport.create({
      user: req.user.id,
      title: generated.title,
      jobDescription,
      selfDescription,
      resume: resumeText,
      matchScore: generated.matchScore,
      summary: generated.summary,
      strengths: generated.strengths,
      technicalQuestions: generated.technicalQuestions,
      behavioralQuestions: generated.behavioralQuestions,
      skillGaps: generated.skillGaps,
      preparationPlan: generated.preparationPlan
    });

    return res.status(201).json({
      success: true,
      message: "Interview report generated successfully.",

      // Keep all response keys compatible
      interviewReport: report,
      interViewReport: report,
      report,
      data: report
    });

  } catch (error) {
    console.error("Generate Interview Report Controller Error:", error);

    if (
      error.message?.includes("No readable text") ||
      error.message?.includes("Invalid PDF") ||
      error.message?.includes("PDF")
    ) {
      return res.status(400).json({
        success: false,
        message: "Unable to read this PDF. Please upload a valid, text-readable resume."
      });
    }

    next(error);
  }
};

// ========================================
// GET INTERVIEW REPORT BY ID
// ========================================

exports.getInterviewReportController = async (req, res, next) => {
  try {
    const { interviewId } = req.params;

    if (!mongoose.isValidObjectId(interviewId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid interview report ID."
      });
    }

    const report = await InterviewReport.findOne({
      _id: interviewId,
      user: req.user.id
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Interview report not found."
      });
    }

    return res.status(200).json({
      success: true,
      interviewReport: report,
      interViewReport: report,
      report,
      data: report
    });

  } catch (error) {
    next(error);
  }
};

// ========================================
// DELETE INTERVIEW REPORT
// ========================================

exports.deleteInterviewReportController = async (req, res, next) => {
  try {
    const { interviewId } = req.params;

    if (!mongoose.isValidObjectId(interviewId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid interview report ID."
      });
    }

    const report = await InterviewReport.findOneAndDelete({
      _id: interviewId,
      user: req.user.id
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Interview report not found."
      });
    }

    return res.status(200).json({
      success: true,
      message: "Interview report deleted successfully."
    });

  } catch (error) {
    next(error);
  }
};

// ========================================
// GET ALL INTERVIEW REPORTS
// ========================================

exports.getAllInterviewReportsController = async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(
      50,
      Math.max(1, Number(req.query.limit) || 10)
    );

    const [reports, total] = await Promise.all([
      InterviewReport.find({
        user: req.user.id
      })
        .select("title matchScore summary createdAt updatedAt")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),

      InterviewReport.countDocuments({
        user: req.user.id
      })
    ]);

    return res.status(200).json({
      success: true,
      interviewReports: reports,
      interViewReports: reports,
      reports,
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

// ========================================
// DOWNLOAD RESUME PDF
// ========================================

exports.downloadResumePdfController = async (req, res, next) => {
  try {
    const { interviewReportId } = req.params;

    if (!mongoose.isValidObjectId(interviewReportId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid interview report ID."
      });
    }

    const [report, user] = await Promise.all([
      InterviewReport.findOne({
        _id: interviewReportId,
        user: req.user.id
      }).lean(),

      User.findById(req.user.id)
        .select("username email profile")
        .lean()
    ]);

    if (!report || !user) {
      return res.status(404).json({
        success: false,
        message: "Interview report or user not found."
      });
    }

    const pdfBuffer = await generateResumePdf({
      user,
      report
    });

    if (!Buffer.isBuffer(pdfBuffer) || pdfBuffer.length === 0) {
      throw new Error("Failed to generate a valid resume PDF.");
    }

    const filename = `career-resume-${Date.now()}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"`
    );
    res.setHeader("Content-Length", pdfBuffer.length);
    res.setHeader("Cache-Control", "no-store");

    return res.status(200).send(pdfBuffer);

 } catch (error) {
    console.error("RESUME PDF GENERATION ERROR:", {
        message: error.message,
        stack: error.stack,
        status: error.status
    });

    next(error);
}
};
