const router = require('express').Router();
const authCtrl = require('../controllers/authCtrl');
const auth = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const { validate } = require('../middleware/validate');
const authSchemas = require('../schemas/authSchema');

// Register
router.post('/register', 
  validate(authSchemas.register), 
  authCtrl.register
);

// Admin register
router.post("/register_admin", 
  validate(authSchemas.register), 
  authCtrl.registerAdmin
);

// Change password (logged in)
router.post("/changePassword", 
  auth, 
  validate(authSchemas.changePassword), 
  authCtrl.changePassword
);

// Verify email
router.get("/verify-email/:token", 
  authCtrl.verifyEmail
);

// Resend verification
router.post("/resend-verification", 
  validate(authSchemas.resendVerification), 
  authCtrl.resendVerificationEmail
);

// Forgot password
router.post("/forgot-password", 
  validate(authSchemas.forgotPassword), 
  authCtrl.forgotPassword
);

// Reset password
router.post("/reset-password/:token", 
  validate(authSchemas.resetPassword), 
  authCtrl.resetPassword
);

// Login
router.post("/login", 
  authLimiter, 
  validate(authSchemas.login), 
  authCtrl.login
);

// Admin login
router.post("/admin_login", 
  authLimiter, 
  validate(authSchemas.login), 
  authCtrl.adminLogin
);

// Logout
router.post("/logout", authCtrl.logout);

// Refresh token
router.post("/refresh_token", authCtrl.generateAccessToken);

module.exports = router;