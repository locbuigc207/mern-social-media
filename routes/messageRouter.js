const router = require("express").Router();
const auth = require("../middleware/auth");
const messageCtrl = require("../controllers/messageCtrl");
const validateObjectId = require("../middleware/validateObjectId");

// Create message
router.post("/message", 
  auth, 
  messageCtrl.createMessage
);

// Get conversations
router.get("/conversations", 
  auth, 
  messageCtrl.getConversations
);

// Get messages
router.get("/message/:id", 
  auth, 
  validateObjectId('id'), 
  messageCtrl.getMessages
);

// Mark message as read
router.patch("/message/:messageId/read", 
  auth, 
  validateObjectId('messageId'), 
  messageCtrl.markAsRead
);

// Mark all as read
router.patch("/messages/:userId/read-all", 
  auth, 
  validateObjectId('userId'), 
  messageCtrl.markAllAsRead
);

// Delete message
router.delete("/message/:messageId", 
  auth, 
  validateObjectId('messageId'), 
  messageCtrl.deleteMessage
);

// Delete conversation
router.delete("/conversation/:userId", 
  auth, 
  validateObjectId('userId'), 
  messageCtrl.deleteConversation
);

// Get unread count
router.get("/messages/unread/count", 
  auth, 
  messageCtrl.getUnreadCount
);

// Get unread by conversation
router.get("/messages/:userId/unread", 
  auth, 
  validateObjectId('userId'), 
  messageCtrl.getUnreadByConversation
);

module.exports = router;