const router = require('express').Router();
const auth = require('../middleware/auth');
const userCtrl = require('../controllers/userCtrl');
const { validate } = require('../middleware/validate');
const userSchemas = require('../schemas/userSchema');
const validateObjectId = require('../middleware/validateObjectId');

// Search user
router.get('/search', 
  auth, 
  userCtrl.searchUser
);

// Get user by ID
router.get('/user/:id', 
  auth, 
  validateObjectId('id'), 
  userCtrl.getUser
);

// Update profile
router.patch("/user", 
  auth, 
  validate(userSchemas.updateProfile), 
  userCtrl.updateUser
);

// Get privacy settings
router.get("/privacy-settings", 
  auth, 
  userCtrl.getPrivacySettings
);

// Update privacy settings
router.patch("/privacy-settings", 
  auth, 
  validate(userSchemas.updatePrivacy), 
  userCtrl.updatePrivacySettings
);

// Block user
router.post("/user/:id/block", 
  auth, 
  validateObjectId('id'), 
  userCtrl.blockUser
);

// Unblock user
router.delete("/user/:id/unblock", 
  auth, 
  validateObjectId('id'), 
  userCtrl.unblockUser
);

// Get blocked users
router.get("/blocked-users", 
  auth, 
  userCtrl.getBlockedUsers
);

// Check if user is blocked
router.get("/user/:id/check-blocked", 
  auth, 
  validateObjectId('id'), 
  userCtrl.checkBlocked
);

// Follow user
router.patch("/user/:id/follow", 
  auth, 
  validateObjectId('id'), 
  userCtrl.follow
);

// Unfollow user
router.patch("/user/:id/unfollow", 
  auth, 
  validateObjectId('id'), 
  userCtrl.unfollow
);

// Get suggestions
router.get("/suggestionsUser", 
  auth, 
  userCtrl.suggestionsUser
);

module.exports = router;