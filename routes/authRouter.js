const router = require('express').Router();
const authCtrl = require('../controllers/authCtrl');
const auth = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

router.post('/register', authCtrl.register);
router.post("/register_admin", authCtrl.registerAdmin);
router.post("/changePassword", auth, authCtrl.changePassword);

router.get("/verify-email/:token", authCtrl.verifyEmail);
router.post("/resend-verification", authCtrl.resendVerificationEmail);

router.post("/forgot-password", authCtrl.forgotPassword);
router.post("/reset-password/:token", authCtrl.resetPassword);

router.post("/login", authLimiter, authCtrl.login);
router.post("/admin_login", authLimiter, authCtrl.adminLogin);

router.post("/logout", authCtrl.logout);

router.post("/refresh_token", authCtrl.generateAccessToken);

module.exports = router;