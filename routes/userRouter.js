const router = require('express').Router();
const auth = require('../middleware/auth');
const userCtrl = require('../controllers/userCtrl');
const { validate } = require('../middleware/validate');
const userSchemas = require('../schemas/userSchema');
const validateObjectId = require('../middleware/validateObjectId');
const { followLimiter, searchLimiter } = require('../middleware/rateLimiter');

router.get('/search', 
  auth,
  searchLimiter,  
  userCtrl.searchUser
);

router.get('/user/:id', 
  auth, 
  validateObjectId('id'), 
  userCtrl.getUser
);

router.patch("/user", 
  auth, 
  validate(userSchemas.updateProfile), 
  userCtrl.updateUser
);

router.get("/privacy-settings", 
  auth, 
  userCtrl.getPrivacySettings
);

router.patch("/privacy-settings", 
  auth, 
  validate(userSchemas.updatePrivacy), 
  userCtrl.updatePrivacySettings
);

router.post("/user/:id/block", 
  auth, 
  validateObjectId('id'), 
  userCtrl.blockUser
);

router.delete("/user/:id/unblock", 
  auth, 
  validateObjectId('id'), 
  userCtrl.unblockUser
);

router.get("/blocked-users", 
  auth, 
  userCtrl.getBlockedUsers
);

router.get("/user/:id/check-blocked", 
  auth, 
  validateObjectId('id'), 
  userCtrl.checkBlocked
);

router.patch("/user/:id/follow", 
  auth, 
  validateObjectId('id'),
  followLimiter,  
  userCtrl.follow
);

router.patch("/user/:id/unfollow", 
  auth, 
  validateObjectId('id'),
  followLimiter,  
  userCtrl.unfollow
);

router.get("/suggestionsUser", 
  auth, 
  userCtrl.suggestionsUser
);

module.exports = router;