const mongoose = require("mongoose");

const workspaceItemSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users",
    required: true,
    index: true
  },

  type: {
    type: String,
    required: true,
    enum: [
      "note",
      "task",
      "flashcard",
      "planner",
      "bookmark",
      "goal",
      "job",
      "resume",
      "chat"
    ]
  },

  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 180
  },

  content: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },

  tags: {
    type: [String],
    default: [],
    validate: value => value.length <= 20
  },

  status: {
    type: String,
    enum: ["active", "completed", "archived", "applied", "interview", "rejected", "offer"],
    default: "active"
  },

  dueAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

workspaceItemSchema.index({ user: 1, type: 1, updatedAt: -1 });

module.exports = mongoose.models.WorkspaceItem ||
  mongoose.model("WorkspaceItem", workspaceItemSchema);