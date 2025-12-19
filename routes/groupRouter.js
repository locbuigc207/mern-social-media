const router = require("express").Router();
const auth = require("../middleware/auth");
const groupCtrl = require("../controllers/groupCtrl");
const { validate } = require("../middleware/validate");
const groupSchemas = require("../schemas/groupSchema");
const validateObjectId = require("../middleware/validateObjectId");
const { validatePagination, rateLimitByUser } = require("../middleware/validation");

router.post("/group", 
  auth,
  rateLimitByUser(10, 60 * 60 * 1000),
  validate(groupSchemas.create),
  groupCtrl.createGroup
);

router.get("/groups", 
  auth, 
  groupCtrl.getUserGroups
);

router.get("/group/:groupId", 
  auth,
  validateObjectId('groupId'),
  groupCtrl.getGroupDetails
);

router.post("/group/:groupId/message", 
  auth,
  validateObjectId('groupId'),
  rateLimitByUser(100, 60 * 1000),
  validate(groupSchemas.sendMessage),
  groupCtrl.sendGroupMessage
);

router.get("/group/:groupId/messages", 
  auth,
  validateObjectId('groupId'),
  validatePagination,
  groupCtrl.getGroupMessages
);

router.post("/group/:groupId/members", 
  auth,
  validateObjectId('groupId'),
  validate(groupSchemas.addMembers),
  groupCtrl.addMembers
);

router.delete("/group/:groupId/member/:memberId", 
  auth,
  validateObjectId('groupId'),
  validateObjectId('memberId'),
  groupCtrl.removeMember
);

router.post("/group/:groupId/leave", 
  auth,
  validateObjectId('groupId'),
  groupCtrl.leaveGroup
);

router.patch("/group/:groupId", 
  auth,
  validateObjectId('groupId'),
  validate(groupSchemas.update),
  groupCtrl.updateGroupInfo
);

router.post("/group/message/:messageId/react", 
  auth,
  validateObjectId('messageId'),
  groupCtrl.reactToMessage
);

router.post("/group/:groupId/read", 
  auth,
  validateObjectId('groupId'),
  groupCtrl.markAsRead
);

module.exports = router;