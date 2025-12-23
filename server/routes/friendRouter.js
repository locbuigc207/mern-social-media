// server/routes/friendRouter.js
const router = require("express").Router();
const auth = require("../middleware/auth").auth;
const friendCtrl = require("../controllers/friendCtrl");
const { validate } = require("../middleware/validate");
const friendSchemas = require("../schemas/friendSchema");
const validateObjectId = require("../middleware/validateObjectId");
const { followLimiter } = require("../middleware/rateLimiter");

// Send friend request
router.post(
  "/friend/request/:userId",
  auth,
  validateObjectId("userId"),
  followLimiter,
  friendCtrl.sendFriendRequest
);

// Accept friend request
router.post(
  "/friend/accept/:userId",
  auth,
  validateObjectId("userId"),
  friendCtrl.acceptFriendRequest
);

// Decline friend request
router.post(
  "/friend/decline/:userId",
  auth,
  validateObjectId("userId"),
  friendCtrl.declineFriendRequest
);

// Cancel sent friend request
router.delete(
  "/friend/request/:userId",
  auth,
  validateObjectId("userId"),
  friendCtrl.cancelFriendRequest
);

// Unfriend
router.delete(
  "/friend/:userId",
  auth,
  validateObjectId("userId"),
  friendCtrl.unfriend
);

// Get friends list
router.get("/friends", auth, friendCtrl.getFriends);
router.get("/friends/:userId", auth, validateObjectId("userId"), friendCtrl.getFriends);

// Get friend requests (received)
router.get("/friend/requests/received", auth, friendCtrl.getReceivedRequests);

// Get sent friend requests
router.get("/friend/requests/sent", auth, friendCtrl.getSentRequests);

// Get mutual friends
router.get(
  "/friend/mutual/:userId",
  auth,
  validateObjectId("userId"),
  friendCtrl.getMutualFriends
);

// Get friend suggestions
router.get("/friend/suggestions", auth, friendCtrl.getFriendSuggestions);

// Check friendship status
router.get(
  "/friend/status/:userId",
  auth,
  validateObjectId("userId"),
  friendCtrl.checkFriendshipStatus
);

module.exports = router;