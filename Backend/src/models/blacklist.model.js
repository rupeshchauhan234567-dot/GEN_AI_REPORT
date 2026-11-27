const mongoose = require("mongoose");

const blacklistSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    unique: true
  },

  expiresAt: {
    type: Date,
    required: true
  }
}, {
  timestamps: true
});

blacklistSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);

module.exports = mongoose.models.blacklistTokens ||
  mongoose.model("blacklistTokens", blacklistSchema);