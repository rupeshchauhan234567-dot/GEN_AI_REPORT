
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },

    username: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },

    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false
    },

    emailVerified: {
      type: Boolean,
      default: false,
      index: true
    },

    tokenVersion: {
      type: Number,
      default: 0
    },

    profile: {
      name: {
        type: String,
        trim: true,
        maxlength: 80,
        default: ""
      },
      age: {
        type: Number,
        min: 13,
        max: 100,
        default: null
      },
      avatar: {
        type: String,
        default: ""
      }
    }
  },
  {
    timestamps: true
  }
);

module.exports =
  mongoose.models.users ||
  mongoose.model("users", userSchema);
