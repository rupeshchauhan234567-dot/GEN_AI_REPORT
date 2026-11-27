const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
  question: { type: String, required: true, trim: true },
  intention: { type: String, required: true, trim: true },
  answer: { type: String, required: true, trim: true }
}, { _id: false });

const skillGapSchema = new mongoose.Schema({
  skill: { type: String, required: true, trim: true },
  severity: {
    type: String,
    enum: ["low", "medium", "high"],
    required: true
  },
  explanation: { type: String, default: "" },
  recommendation: { type: String, default: "" }
}, { _id: false });

const preparationDaySchema = new mongoose.Schema({
  day: { type: Number, required: true, min: 1, max: 30 },
  focus: { type: String, required: true },
  tasks: {
    type: [String],
    required: true,
    validate: value => value.length >= 2
  }
}, { _id: false });

const interviewReportSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users",
    required: true,
    index: true
  },

  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 180
  },

  jobDescription: {
    type: String,
    required: true,
    maxlength: 20000
  },

  selfDescription: {
    type: String,
    required: true,
    maxlength: 10000
  },

  resume: {
    type: String,
    default: ""
  },

  matchScore: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },

  summary: {
    type: String,
    default: ""
  },

  strengths: {
    type: [String],
    default: []
  },

  technicalQuestions: {
    type: [questionSchema],
    required: true,
    validate: value => value.length >= 5
  },

  behavioralQuestions: {
    type: [questionSchema],
    required: true,
    validate: value => value.length >= 5
  },

  skillGaps: {
    type: [skillGapSchema],
    required: true,
    validate: value => value.length >= 3
  },

  preparationPlan: {
    type: [preparationDaySchema],
    required: true,
    validate: value => value.length >= 5
  }
}, {
  timestamps: true
});

interviewReportSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.models.InterviewReport ||
  mongoose.model("InterviewReport", interviewReportSchema);