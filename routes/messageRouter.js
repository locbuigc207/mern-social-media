const router = require("express").Router();
const auth = require("../middleware/auth");
const messageCtrl = require("../controllers/messageCtrl");
const validateObjectId = require("../middleware/validateObjectId");

router.post("/message", 
  auth, 
  messageCtrl.createMessage
);

router.get("/conversations", 
  auth, 
  messageCtrl.getConversations
);

router.get("/message/:id", 
  auth, 
  validateObjectId('id'), 
  messageCtrl.getMessages
);

router.patch("/message/:messageId/read", 
  auth, 
  validateObjectId('messageId'), 
  messageCtrl.markAsRead
);

router.patch("/messages/:userId/read-all", 
  auth, 
  validateObjectId('userId'), 
  messageCtrl.markAllAsRead
);

router.delete("/message/:messageId", 
  auth, 
  validateObjectId('messageId'), 
  messageCtrl.deleteMessage
);

router.delete("/conversation/:userId", 
  auth, 
  validateObjectId('userId'), 
  messageCtrl.deleteConversation
);

router.get("/messages/unread/count", 
  auth, 
  messageCtrl.getUnreadCount
);

router.get("/messages/:userId/unread", 
  auth, 
  validateObjectId('userId'), 
  messageCtrl.getUnreadByConversation
);

module.exports = router;