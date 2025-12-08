const router = require('express').Router();
const auth = require('../middleware/auth');
const userCtrl = require('../controllers/userCtrl');

router.get('/search', auth, userCtrl.searchUser);

router.get('/user/:id', auth, userCtrl.getUser);

router.patch("/user", auth, userCtrl.updateUser);

router.get("/privacy-settings", auth, userCtrl.getPrivacySettings);
router.patch("/privacy-settings", auth, userCtrl.updatePrivacySettings);

router.post("/user/:id/block", auth, userCtrl.blockUser);
router.delete("/user/:id/unblock", auth, userCtrl.unblockUser);
router.get("/blocked-users", auth, userCtrl.getBlockedUsers);
router.get("/user/:id/check-blocked", auth, userCtrl.checkBlocked);

router.patch("/user/:id/follow", auth, userCtrl.follow);
router.patch("/user/:id/unfollow", auth, userCtrl.unfollow);

router.get("/suggestionsUser", auth, userCtrl.suggestionsUser);

module.exports = router;