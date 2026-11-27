const jwt = require("jsonwebtoken");

const User = require("../models/user.model");
const Blacklist = require("../models/blacklist.model");

async function authUser(req, res, next) {
  try {
    const token = req.cookies?.token;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required."
      });
    }

    let decoded;

    try {
      decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET, {
        algorithms: ["HS256"]
      });
    } catch {
      return res.status(401).json({
        success: false,
        message: "Session expired. Please log in again."
      });
    }

    const blacklisted = await Blacklist.exists({ token });

    if (blacklisted) {
      return res.status(401).json({
        success: false,
        message: "This session has been revoked."
      });
    }

    const user = await User.findById(decoded.sub).select(
      "_id username email emailVerified tokenVersion profile"
    );

    if (!user || !user.emailVerified) {
      return res.status(401).json({
        success: false,
        message: "Please verify your email and log in again."
      });
    }

    if (Number(decoded.tokenVersion) !== Number(user.tokenVersion)) {
      return res.status(401).json({
        success: false,
        message: "Session is no longer valid. Please log in again."
      });
    }

    req.user = {
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      profile: user.profile
    };

    req.accessToken = token;

    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = authUser;