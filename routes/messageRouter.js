const router = require("express").Router();
const auth = require("../middleware/auth");
const messageCtrl = require("../controllers/messageCtrl");
const validateObjectId = require("../middleware/validateObjectId");
const { messageLimiter, interactionLimiter } = require("../middleware/rateLimiter");

router.use(auth);

router.post("/message", 
  messageLimiter,
  messageCtrl.createMessage
);

router.get("/conversations", 
  messageCtrl.getConversations
);

router.get("/message/:id", 
  validateObjectId('id'), 
  messageCtrl.getMessages
);

router.patch("/message/:messageId/read", 
  validateObjectId('messageId'),
  interactionLimiter,
  messageCtrl.markAsRead
);

router.patch("/messages/:userId/read-all", 
  validateObjectId('userId'),
  interactionLimiter,
  messageCtrl.markAllAsRead
);

router.delete("/message/:messageId", 
  validateObjectId('messageId'), 
  messageCtrl.deleteMessage
);

router.delete("/conversation/:userId", 
  validateObjectId('userId'), 
  messageCtrl.deleteConversation
);

router.get("/messages/unread/count", 
  messageCtrl.getUnreadCount
);

router.get("/messages/:userId/unread", 
  validateObjectId('userId'), 
  messageCtrl.getUnreadByConversation
);

router.get("/messages/search",
  messageCtrl.searchMessages
);

router.post("/message/:messageId/react",
  validateObjectId('messageId'),
  interactionLimiter,
  messageCtrl.reactToMessage
);

router.delete("/message/:messageId/react",
  validateObjectId('messageId'),
  messageCtrl.removeReaction
);

module.exports = router;