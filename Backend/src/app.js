const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");

const apiRateLimit = require("./middlewares/rateLimit.middleware");

const authRoutes = require("./routes/auth.routes");
const interviewRoutes = require("./routes/interview.routes");
const workspaceRoutes = require("./routes/workspace.routes");

const app = express();

app.disable("x-powered-by");
app.set("trust proxy", 1);

const allowedOrigins = (process.env.CORS_ORIGINS || "http://localhost:5173")
  .split(",")
  .map(origin => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    const error = new Error("Origin is not allowed by CORS.");
    error.status = 403;
    return callback(error);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Cache-Control", "no-store");
  next();
});

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(cookieParser());

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "AI Career Learning Hub API is running",
    database: "Connected"
  });
});

app.use("/api", apiRateLimit);

app.use("/api/auth", authRoutes);
app.use("/api/interview", interviewRoutes);
app.use("/api/hub", workspaceRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API route not found."
  });
});

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);

  console.error("API error:", error.stack || error);

  if (error.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({
      success: false,
      message: "Resume file must not exceed 5 MB."
    });
  }

  if (
    error.code === "LIMIT_FILE_COUNT" ||
    error.code === "LIMIT_UNEXPECTED_FILE" ||
    error.code === "LIMIT_FIELD_COUNT" ||
    error.code === "LIMIT_PART_COUNT"
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid file upload. Please upload only one PDF resume."
    });
  }

  if (error.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: "Please check the submitted information."
    });
  }

  if (error.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "Invalid resource ID."
    });
  }

  if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      message: "This record already exists."
    });
  }

  const status = Number(error.status || error.statusCode) || 500;

  return res.status(status).json({
    success: false,
    message: status >= 500
      ? "Something went wrong. Please try again later."
      : error.message
  });
});

module.exports = app;