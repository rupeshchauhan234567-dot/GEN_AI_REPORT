const mongoose = require("mongoose");

const emailOtpSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users",
    required: true
  },

  purpose: {
    type: String,
    enum: ["verify_email", "reset_password"],
    required: true
  },

  otpHash: {
    type: String,
    required: true,
    select: false
  },

  expiresAt: {
    type: Date,
    required: true
  },

  lastSentAt: {
    type: Date,
    required: true
  },

  attempts: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true
});

emailOtpSchema.index(
  { user: 1, purpose: 1 },
  { unique: true }
);

emailOtpSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);

module.exports = mongoose.models.EmailOtp ||
  mongoose.model("EmailOtp", emailOtpSchema);