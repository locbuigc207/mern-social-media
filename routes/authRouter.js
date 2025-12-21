const router = require("express").Router();
const authCtrl = require("../controllers/authCtrl");

const { auth } = require("../middleware/auth");
const {
  authLimiter,
  registerLimiter,
  passwordResetLimiter,
} = require("../middleware/rateLimiter");
const { validate } = require("../middleware/validate");
const authSchemas = require("../schemas/authSchema");

router.post(
  "/register",
  registerLimiter,
  validate(authSchemas.register),
  authCtrl.register
);

router.post(
  "/register_admin",
  validate(authSchemas.register),
  authCtrl.registerAdmin
);

router.post(
  "/changePassword",
  auth,
  validate(authSchemas.changePassword),
  authCtrl.changePassword
);

router.get("/verify-email/:token", authCtrl.verifyEmail);

router.post(
  "/resend-verification",
  validate(authSchemas.resendVerification),
  authCtrl.resendVerificationEmail
);

router.post(
  "/forgot-password",
  passwordResetLimiter,
  validate(authSchemas.forgotPassword),
  authCtrl.forgotPassword
);

router.post(
  "/reset-password/:token",
  validate(authSchemas.resetPassword),
  authCtrl.resetPassword
);

router.post("/login", authLimiter, validate(authSchemas.login), authCtrl.login);

router.post(
  "/admin_login",
  authLimiter,
  validate(authSchemas.login),
  authCtrl.adminLogin
);

router.post("/logout", authCtrl.logout);

const refreshTokenLimiter =
  require("../middleware/rateLimiter").createRateLimiter({
    windowMs: 60 * 1000,
    max: 10,
    message: "Too many token refresh requests",
    prefix: "rl:refresh-token:",
  });

router.post(
  "/refresh_token",
  refreshTokenLimiter,
  authCtrl.generateAccessToken
);

module.exports = router;
