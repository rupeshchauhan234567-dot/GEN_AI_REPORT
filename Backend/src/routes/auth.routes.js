const express = require("express");
const router = express.Router();

const authController = require("../controllers/auth.controller");
const authUser = require("../middlewares/auth.middleware");
const { authRateLimit } = require("../middlewares/rateLimit.middleware");

router.post("/register", authRateLimit, authController.register);
router.post("/verify-email", authRateLimit, authController.verifyEmail);
router.post("/resend-otp", authRateLimit, authController.resendVerificationOtp);

router.post("/login", authRateLimit, authController.login);
router.post("/refresh", authRateLimit, authController.refreshSession);

router.post("/logout", authController.logout);
router.get("/logout", authController.logout);

router.get("/get-me", authUser, authController.getMe);

router.post("/forgot-password", authRateLimit, authController.forgotPassword);
router.post("/reset-password", authRateLimit, authController.resetPassword);

module.exports = router;