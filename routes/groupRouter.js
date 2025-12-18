const router = require("express").Router();
const auth = require("../middleware/auth");
const groupCtrl = require("../controllers/groupCtrl");
const { validate } = require("../middleware/validate");
const groupSchemas = require("../schemas/groupSchema");
const validateObjectId = require("../middleware/validateObjectId");
const { validatePagination, rateLimitByUser } = require("../middleware/validation");

// Create group
router.post("/group", 
  auth,
  rateLimitByUser(10, 60 * 60 * 1000),
  validate(groupSchemas.create),
  groupCtrl.createGroup
);

// Get user groups
router.get("/groups", 
  auth, 
  groupCtrl.getUserGroups
);

// Get group details
router.get("/group/:groupId", 
  auth,
  validateObjectId('groupId'),
  groupCtrl.getGroupDetails
);

// Send message
router.post("/group/:groupId/message", 
  auth,
  validateObjectId('groupId'),
  rateLimitByUser(100, 60 * 1000),
  validate(groupSchemas.sendMessage),
  groupCtrl.sendGroupMessage
);

// Get group messages
router.get("/group/:groupId/messages", 
  auth,
  validateObjectId('groupId'),
  validatePagination,
  groupCtrl.getGroupMessages
);

// Add members
router.post("/group/:groupId/members", 
  auth,
  validateObjectId('groupId'),
  validate(groupSchemas.addMembers),
  groupCtrl.addMembers
);

// Remove member
router.delete("/group/:groupId/member/:memberId", 
  auth,
  validateObjectId('groupId'),
  validateObjectId('memberId'),
  groupCtrl.removeMember
);

// Leave group
router.post("/group/:groupId/leave", 
  auth,
  validateObjectId('groupId'),
  groupCtrl.leaveGroup
);

// Update group info
router.patch("/group/:groupId", 
  auth,
  validateObjectId('groupId'),
  validate(groupSchemas.update),
  groupCtrl.updateGroupInfo
);

// React to message
router.post("/group/message/:messageId/react", 
  auth,
  validateObjectId('messageId'),
  groupCtrl.reactToMessage
);

// Mark as read
router.post("/group/:groupId/read", 
  auth,
  validateObjectId('groupId'),
  groupCtrl.markAsRead
);

module.exports = router;