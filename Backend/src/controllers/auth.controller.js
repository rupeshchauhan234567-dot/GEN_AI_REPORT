const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/user.model");
const EmailOtp = require("../models/emailOtp.model");
const Blacklist = require("../models/blacklist.model");
const RefreshSession = require("../models/refreshSession.model");

const { sendOtpEmail } = require("../services/email.service");

const OTP_EXPIRY_MS = 10 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const ACCESS_COOKIE = "token";
const REFRESH_COOKIE = "refreshToken";

const isProduction = process.env.NODE_ENV === "production";

const accessCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
  path: "/",
  maxAge: 15 * 60 * 1000
};

const refreshCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
  path: "/api/auth",
  maxAge: Number(process.env.REFRESH_TOKEN_DAYS || 30) * 24 * 60 * 60 * 1000
};

const clearAccessOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
  path: "/"
};

const clearRefreshOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
  path: "/api/auth"
};

function hashValue(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function generateOtp() {
  return crypto.randomInt(100000, 1000000).toString();
}

function safeUser(user) {
  return {
    id: user._id.toString(),
    username: user.username,
    email: user.email,
    emailVerified: user.emailVerified,
    profile: user.profile
  };
}

function createAccessToken(user) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      tokenVersion: user.tokenVersion || 0,
      type: "access"
    },
    process.env.JWT_ACCESS_SECRET,
    {
      algorithm: "HS256",
      expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || "15m"
    }
  );
}

function createRefreshToken(user, sessionId, familyId) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      sid: sessionId.toString(),
      familyId,
      tokenVersion: user.tokenVersion || 0,
      type: "refresh"
    },
    process.env.JWT_REFRESH_SECRET,
    {
      algorithm: "HS256",
      expiresIn: `${Number(process.env.REFRESH_TOKEN_DAYS || 30)}d`
    }
  );
}

function setAccessCookie(res, token) {
  res.cookie(ACCESS_COOKIE, token, accessCookieOptions);
}

function setRefreshCookie(res, token) {
  res.cookie(REFRESH_COOKIE, token, refreshCookieOptions);
}

function clearAuthCookies(res) {
  res.clearCookie(ACCESS_COOKIE, clearAccessOptions);
  res.clearCookie(REFRESH_COOKIE, clearRefreshOptions);
}

async function issueOtp(user, purpose) {
  const now = new Date();

  const existing = await EmailOtp.findOne({
    user: user._id,
    purpose
  });

  if (
    existing &&
    now.getTime() - existing.lastSentAt.getTime() < OTP_RESEND_COOLDOWN_MS
  ) {
    const remaining = Math.ceil(
      (OTP_RESEND_COOLDOWN_MS - (now.getTime() - existing.lastSentAt.getTime())) / 1000
    );

    const error = new Error(`Please wait ${remaining} seconds before requesting another OTP.`);
    error.status = 429;
    throw error;
  }

  const otp = generateOtp();

  await EmailOtp.findOneAndUpdate(
    { user: user._id, purpose },
    {
      $set: {
        otpHash: hashValue(otp),
        expiresAt: new Date(now.getTime() + OTP_EXPIRY_MS),
        lastSentAt: now,
        attempts: 0
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  try {
    await sendOtpEmail({
      email: user.email,
      otp,
      purpose
    });
  } catch (error) {
    await EmailOtp.deleteOne({ user: user._id, purpose });
    console.error("OTP email delivery failed:", error.message);

    const mailError = new Error("Unable to send verification email. Please try again later.");
    mailError.status = 503;
    throw mailError;
  }
}

async function verifyOtp(userId, purpose, submittedOtp) {
  if (!/^\d{6}$/.test(String(submittedOtp || ""))) {
    return { valid: false, message: "Enter a valid 6-digit OTP." };
  }

  const record = await EmailOtp.findOne({
    user: userId,
    purpose
  }).select("+otpHash");

  if (!record) {
    return { valid: false, message: "OTP not found. Please request a new OTP." };
  }

  if (record.expiresAt <= new Date()) {
    await EmailOtp.deleteOne({ _id: record._id });
    return { valid: false, message: "OTP expired. Please request a new OTP." };
  }

  if (record.attempts >= OTP_MAX_ATTEMPTS) {
    await EmailOtp.deleteOne({ _id: record._id });
    return { valid: false, message: "Too many incorrect attempts. Request a new OTP." };
  }

  const submittedHash = hashValue(String(submittedOtp));
  const expected = Buffer.from(record.otpHash, "hex");
  const actual = Buffer.from(submittedHash, "hex");

  const matched =
    expected.length === actual.length &&
    crypto.timingSafeEqual(expected, actual);

  if (!matched) {
    record.attempts += 1;
    await record.save();

    return {
      valid: false,
      message: `Incorrect OTP. ${Math.max(0, OTP_MAX_ATTEMPTS - record.attempts)} attempts remaining.`
    };
  }

  await EmailOtp.deleteOne({ _id: record._id });
  return { valid: true };
}

async function createSession(user, req, res, familyId = crypto.randomUUID()) {
  const expiresAt = new Date(
    Date.now() + Number(process.env.REFRESH_TOKEN_DAYS || 30) * 86400000
  );

  const session = await RefreshSession.create({
    user: user._id,
    tokenHash: crypto.randomBytes(32).toString("hex"),
    familyId,
    expiresAt,
    userAgent: req.get("user-agent") || "",
    ipAddress: req.ip || ""
  });

  const refreshToken = createRefreshToken(user, session._id, familyId);

  session.tokenHash = hashValue(refreshToken);
  await session.save();

  const accessToken = createAccessToken(user);

  setAccessCookie(res, accessToken);
  setRefreshCookie(res, refreshToken);
}

async function revokeAllUserSessions(userId) {
  await RefreshSession.updateMany(
    { user: userId, revokedAt: null },
    { $set: { revokedAt: new Date() } }
  );
}

exports.register = async (req, res, next) => {
  try {
    const username = String(req.body.username || "").trim().toLowerCase();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (!/^[a-z0-9_]{3,30}$/.test(username)) {
      return res.status(400).json({
        success: false,
        message: "Username must be 3-30 characters and contain only letters, numbers or underscores."
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid email address."
      });
    }

    if (password.length < 8 || password.length > 72) {
      return res.status(400).json({
        success: false,
        message: "Password must contain 8-72 characters."
      });
    }

    const existing = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existing) {
      if (existing.email === email && !existing.emailVerified) {
        await issueOtp(existing, "verify_email");

        return res.status(200).json({
          success: true,
          requiresVerification: true,
          message: "Your account is awaiting verification. A new OTP has been sent."
        });
      }

      return res.status(409).json({
        success: false,
        message: existing.email === email
          ? "An account with this email already exists."
          : "This username is already taken."
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      emailVerified: false
    });

    try {
      await issueOtp(user, "verify_email");
    } catch (error) {
      await User.deleteOne({ _id: user._id });
      throw error;
    }

    return res.status(201).json({
      success: true,
      requiresVerification: true,
      message: "Registration successful. Check your email for the verification OTP.",
      user: safeUser(user)
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Email or username is already registered."
      });
    }

    next(error);
  }
};

exports.verifyEmail = async (req, res, next) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const otp = req.body.otp;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Account not found."
      });
    }

    if (user.emailVerified) {
      return res.status(200).json({
        success: true,
        message: "Email is already verified."
      });
    }

    const result = await verifyOtp(user._id, "verify_email", otp);

    if (!result.valid) {
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }

    user.emailVerified = true;
    await user.save();

    await createSession(user, req, res);

    return res.status(200).json({
      success: true,
      message: "Email verified successfully.",
      user: safeUser(user)
    });
  } catch (error) {
    next(error);
  }
};

exports.resendVerificationOtp = async (req, res, next) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(200).json({
        success: true,
        message: "If the account exists and needs verification, an OTP will be sent."
      });
    }

    if (user.emailVerified) {
      return res.status(400).json({
        success: false,
        message: "This email is already verified."
      });
    }

    await issueOtp(user, "verify_email");

    return res.status(200).json({
      success: true,
      message: "A new OTP has been sent."
    });
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required."
      });
    }

    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password."
      });
    }

    const passwordMatches = await bcrypt.compare(password, user.password);

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password."
      });
    }

    if (!user.emailVerified) {
      return res.status(403).json({
        success: false,
        requiresVerification: true,
        message: "Please verify your email before logging in."
      });
    }

    await createSession(user, req, res);

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      user: safeUser(user)
    });
  } catch (error) {
    next(error);
  }
};

exports.refreshSession = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.[REFRESH_COOKIE];

    if (!refreshToken) {
      clearAuthCookies(res);
      return res.status(401).json({
        success: false,
        message: "Refresh session not found. Please log in again."
      });
    }

    let decoded;

    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, {
        algorithms: ["HS256"]
      });
    } catch {
      clearAuthCookies(res);
      return res.status(401).json({
        success: false,
        message: "Refresh session expired. Please log in again."
      });
    }

    if (decoded.type !== "refresh" || !decoded.sid || !decoded.familyId) {
      clearAuthCookies(res);
      return res.status(401).json({
        success: false,
        message: "Invalid refresh session."
      });
    }

    const session = await RefreshSession.findById(decoded.sid).select("+tokenHash");

    if (!session || session.user.toString() !== decoded.sub) {
      clearAuthCookies(res);
      return res.status(401).json({
        success: false,
        message: "Refresh session not found."
      });
    }

    if (session.revokedAt) {
      await RefreshSession.updateMany(
        { user: decoded.sub, familyId: decoded.familyId, revokedAt: null },
        { $set: { revokedAt: new Date() } }
      );

      clearAuthCookies(res);

      return res.status(401).json({
        success: false,
        message: "Refresh token reuse detected. Please log in again."
      });
    }

    if (
      session.expiresAt <= new Date() ||
      session.tokenHash !== hashValue(refreshToken)
    ) {
      clearAuthCookies(res);
      return res.status(401).json({
        success: false,
        message: "Refresh session is no longer valid."
      });
    }

    const user = await User.findById(decoded.sub);

    if (
      !user ||
      !user.emailVerified ||
      Number(decoded.tokenVersion) !== Number(user.tokenVersion)
    ) {
      await revokeAllUserSessions(decoded.sub);
      clearAuthCookies(res);

      return res.status(401).json({
        success: false,
        message: "Account session is no longer valid. Please log in again."
      });
    }

    const now = new Date();

    const claimed = await RefreshSession.updateOne(
      { _id: session._id, revokedAt: null },
      { $set: { revokedAt: now } }
    );

    if (claimed.modifiedCount !== 1) {
      await RefreshSession.updateMany(
        { user: user._id, familyId: decoded.familyId, revokedAt: null },
        { $set: { revokedAt: new Date() } }
      );

      clearAuthCookies(res);

      return res.status(401).json({
        success: false,
        message: "Refresh session reuse detected."
      });
    }

    const expiresAt = new Date(
      Date.now() + Number(process.env.REFRESH_TOKEN_DAYS || 30) * 86400000
    );

    const nextSession = await RefreshSession.create({
      user: user._id,
      tokenHash: crypto.randomBytes(32).toString("hex"),
      familyId: decoded.familyId,
      expiresAt,
      userAgent: req.get("user-agent") || "",
      ipAddress: req.ip || ""
    });

    const nextRefreshToken = createRefreshToken(
      user,
      nextSession._id,
      decoded.familyId
    );

    nextSession.tokenHash = hashValue(nextRefreshToken);
    await nextSession.save();

    session.replacedByHash = nextSession.tokenHash;
    await session.save();

    setAccessCookie(res, createAccessToken(user));
    setRefreshCookie(res, nextRefreshToken);

    return res.status(200).json({
      success: true,
      message: "Session refreshed."
    });
  } catch (error) {
    next(error);
  }
};

exports.logout = async (req, res, next) => {
  try {
    const accessToken = req.cookies?.[ACCESS_COOKIE];
    const refreshToken = req.cookies?.[REFRESH_COOKIE];

    if (accessToken) {
      try {
        const decoded = jwt.verify(
          accessToken,
          process.env.JWT_ACCESS_SECRET,
          { algorithms: ["HS256"] }
        );

        await Blacklist.updateOne(
          { token: accessToken },
          {
            $setOnInsert: {
              token: accessToken,
              expiresAt: new Date(decoded.exp * 1000)
            }
          },
          { upsert: true }
        );
      } catch {
        // Expired access tokens do not need to be blacklisted.
      }
    }

    if (refreshToken) {
      try {
        const decoded = jwt.verify(
          refreshToken,
          process.env.JWT_REFRESH_SECRET,
          { algorithms: ["HS256"] }
        );

        if (decoded.sid) {
          await RefreshSession.updateOne(
            { _id: decoded.sid, revokedAt: null },
            { $set: { revokedAt: new Date() } }
          );
        }
      } catch {
        // Invalid or expired refresh tokens are already unusable.
      }
    }

    clearAuthCookies(res);

    return res.status(200).json({
      success: true,
      message: "Logged out successfully."
    });
  } catch (error) {
    next(error);
  }
};

exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found."
      });
    }

    return res.status(200).json({
      success: true,
      user: safeUser(user)
    });
  } catch (error) {
    next(error);
  }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const user = await User.findOne({ email });

    if (user && user.emailVerified) {
      await issueOtp(user, "reset_password");
    }

    return res.status(200).json({
      success: true,
      message: "If a verified account exists for this email, a password reset OTP will be sent."
    });
  } catch (error) {
    next(error);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const otp = req.body.otp;
    const password = String(req.body.password || "");

    if (password.length < 8 || password.length > 72) {
      return res.status(400).json({
        success: false,
        message: "Password must contain 8-72 characters."
      });
    }

    const user = await User.findOne({ email }).select("+password");

    if (!user || !user.emailVerified) {
      return res.status(400).json({
        success: false,
        message: "Invalid reset request."
      });
    }

    const result = await verifyOtp(user._id, "reset_password", otp);

    if (!result.valid) {
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }

    user.password = await bcrypt.hash(password, 12);
    user.tokenVersion += 1;
    await user.save();

    await revokeAllUserSessions(user._id);
    await EmailOtp.deleteMany({ user: user._id });

    clearAuthCookies(res);

    return res.status(200).json({
      success: true,
      message: "Password reset successfully. Please log in again."
    });
  } catch (error) {
    next(error);
  }
};