const router = require("express").Router();
const auth = require("../middleware/auth");
const groupCtrl = require("../controllers/groupCtrl");
const { 
  validateBody, 
  validateObjectId, 
  validatePagination,
  rateLimitByUser 
} = require("../middleware/validation");

// Validation schemas
const createGroupSchema = {
  name: {
    type: 'string',
    required: true,
    minLength: 1,
    maxLength: 100
  },
  description: {
    type: 'string',
    required: false,
    maxLength: 500
  },
  members: {
    type: 'object',
    required: true,
    minItems: 1,
    maxItems: 256
  }
};

const sendMessageSchema = {
  text: {
    type: 'string',
    required: false,
    maxLength: 5000
  }
};

const addMembersSchema = {
  members: {
    type: 'object',
    required: true,
    minItems: 1,
    maxItems: 50
  }
};

const updateGroupSchema = {
  name: {
    type: 'string',
    required: false,
    minLength: 1,
    maxLength: 100
  },
  description: {
    type: 'string',
    required: false,
    maxLength: 500
  }
};

const reactionSchema = {
  emoji: {
    type: 'string',
    required: true,
    minLength: 1,
    maxLength: 10
  }
};

// Create group
router.post(
  "/group", 
  auth,
  rateLimitByUser(10, 60 * 60 * 1000), // 10 groups per hour
  validateBody(createGroupSchema),
  groupCtrl.createGroup
);

// Get user groups
router.get("/groups", auth, groupCtrl.getUserGroups);

// Get group details
router.get(
  "/group/:groupId", 
  auth,
  validateObjectId('groupId'),
  groupCtrl.getGroupDetails
);

// Send message
router.post(
  "/group/:groupId/message", 
  auth,
  validateObjectId('groupId'),
  rateLimitByUser(100, 60 * 1000), // 100 messages per minute
  validateBody(sendMessageSchema),
  groupCtrl.sendGroupMessage
);

// Get group messages
router.get(
  "/group/:groupId/messages", 
  auth,
  validateObjectId('groupId'),
  validatePagination,
  groupCtrl.getGroupMessages
);

// Add members
router.post(
  "/group/:groupId/members", 
  auth,
  validateObjectId('groupId'),
  validateBody(addMembersSchema),
  groupCtrl.addMembers
);

// Remove member
router.delete(
  "/group/:groupId/member/:memberId", 
  auth,
  validateObjectId('groupId'),
  validateObjectId('memberId'),
  groupCtrl.removeMember
);

// Leave group
router.post(
  "/group/:groupId/leave", 
  auth,
  validateObjectId('groupId'),
  groupCtrl.leaveGroup
);

// Update group info
router.patch(
  "/group/:groupId", 
  auth,
  validateObjectId('groupId'),
  validateBody(updateGroupSchema),
  groupCtrl.updateGroupInfo
);

// React to message
router.post(
  "/group/message/:messageId/react", 
  auth,
  validateObjectId('messageId'),
  validateBody(reactionSchema),
  groupCtrl.reactToMessage
);

// Mark as read
router.post(
  "/group/:groupId/read", 
  auth,
  validateObjectId('groupId'),
  groupCtrl.markAsRead
);

module.exports = router;