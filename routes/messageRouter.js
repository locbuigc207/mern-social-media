const router = require("express").Router();
const auth = require("../middleware/auth");
const messageCtrl = require("../controllers/messageCtrl");

router.post("/message", auth, messageCtrl.createMessage);

router.get("/conversations", auth, messageCtrl.getConversations);

router.get("/message/:id", auth, messageCtrl.getMessages);

router.patch("/message/:messageId/read", auth, messageCtrl.markAsRead);
router.patch("/messages/:userId/read-all", auth, messageCtrl.markAllAsRead);
router.delete("/message/:messageId", auth, messageCtrl.deleteMessage);
router.delete("/conversation/:userId", auth, messageCtrl.deleteConversation);

router.get("/messages/unread/count", auth, messageCtrl.getUnreadCount);
router.get("/messages/:userId/unread", auth, messageCtrl.getUnreadByConversation);

module.exports = router;