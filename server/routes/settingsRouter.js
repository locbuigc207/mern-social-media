// server/routes/settingsRouter.js
const router = require("express").Router();
const auth = require("../middleware/auth").auth;
const settingsCtrl = require("../controllers/settingsCtrl");
const { validate } = require("../middleware/validate");
const settingsSchemas = require("../schemas/settingsSchema");

// Privacy settings
router.patch(
  "/settings/privacy",
  auth,
  validate(settingsSchemas.privacy),
  settingsCtrl.updatePrivacySettings
);

router.get("/settings/privacy", auth, settingsCtrl.getPrivacySettings);

// Notification preferences
router.patch(
  "/settings/notifications",
  auth,
  validate(settingsSchemas.notifications),
  settingsCtrl.updateNotificationSettings
);

router.get("/settings/notifications", auth, settingsCtrl.getNotificationSettings);

// Account settings
router.patch(
  "/settings/account",
  auth,
  validate(settingsSchemas.account),
  settingsCtrl.updateAccountSettings
);

router.get("/settings/account", auth, settingsCtrl.getAccountSettings);

// Deactivate account
router.post("/settings/deactivate", auth, settingsCtrl.deactivateAccount);

// Delete account
router.delete("/settings/account", auth, settingsCtrl.deleteAccount);

// Download user data
router.get("/settings/data/download", auth, settingsCtrl.downloadUserData);

module.exports = router;