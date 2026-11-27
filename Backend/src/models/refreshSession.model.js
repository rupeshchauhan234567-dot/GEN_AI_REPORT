const mongoose = require("mongoose");

const refreshSessionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users",
    required: true,
    index: true
  },

  tokenHash: {
    type: String,
    required: true,
    unique: true,
    select: false
  },

  familyId: {
    type: String,
    required: true,
    index: true
  },

  expiresAt: {
    type: Date,
    required: true
  },

  revokedAt: {
    type: Date,
    default: null
  },

  replacedByHash: {
    type: String,
    default: null
  },

  userAgent: {
    type: String,
    maxlength: 500,
    default: ""
  },

  ipAddress: {
    type: String,
    maxlength: 100,
    default: ""
  }
}, {
  timestamps: true
});

refreshSessionSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);

refreshSessionSchema.index({ user: 1, familyId: 1 });

module.exports = mongoose.models.RefreshSession ||
  mongoose.model("RefreshSession", refreshSessionSchema);