// const router = require("express").Router();
// const auth = require("../middleware/auth").auth;
// const messageCtrl = require("../controllers/messageCtrl");
// const validateObjectId = require("../middleware/validateObjectId");
// const { uploadMultiple } = require("../middleware/upload");
// const {
//   messageLimiter,
//   interactionLimiter,
// } = require("../middleware/rateLimiter");

// router.use(auth);

// router.post("/message", messageLimiter, messageCtrl.createMessage);

// router.get("/conversations", messageCtrl.getConversations);

// router.get("/message/:id", validateObjectId("id"), messageCtrl.getMessages);

// router.patch(
//   "/message/:messageId/read",
//   validateObjectId("messageId"),
//   interactionLimiter,
//   messageCtrl.markAsRead
// );

// router.patch(
//   "/messages/:userId/read-all",
//   validateObjectId("userId"),
//   interactionLimiter,
//   messageCtrl.markAllAsRead
// );

// router.delete(
//   "/message/:messageId",
//   validateObjectId("messageId"),
//   messageCtrl.deleteMessage
// );

// router.delete(
//   "/conversation/:userId",
//   validateObjectId("userId"),
//   messageCtrl.deleteConversation
// );

// router.get("/messages/unread/count", messageCtrl.getUnreadCount);

// router.get(
//   "/messages/:userId/unread",
//   validateObjectId("userId"),
//   messageCtrl.getUnreadByConversation
// );

// router.get("/messages/search", messageCtrl.searchMessages);

// router.post(
//   "/message/:messageId/react",
//   validateObjectId("messageId"),
//   interactionLimiter,
//   messageCtrl.reactToMessage
// );

// router.delete(
//   "/message/:messageId/react",
//   validateObjectId("messageId"),
//   messageCtrl.removeReaction
// );

// module.exports = router;
const router = require("express").Router();
const multer = require("multer"); // Thêm Multer
const path = require("path");
const fs = require("fs");
const {uploadMultiple}=require("../middleware/upload")

// --- 1. SỬA LỖI IMPORT AUTH ---
// Logic: Tự động chọn .auth hoặc export mặc định để tránh lỗi "requires a callback"
const authMiddleware = require("../middleware/auth");
const auth = authMiddleware.auth || authMiddleware;

const messageCtrl = require("../controllers/messageCtrl");
const validateObjectId = require("../middleware/validateObjectId");
const {
  messageLimiter,
  interactionLimiter,
} = require("../middleware/rateLimiter");

// Create message
router.post("/message", auth, uploadMultiple, messageCtrl.createMessage);

//create message from story reply

router.post(
  "/message/story-reply",
  auth,
  messageCtrl.createMessageFromStoryReply
);

// Conversations
router.get("/conversations", auth, messageCtrl.getConversations);

// Messages in a conversation
router.get("/message/:id", auth, messageCtrl.getMessages);

// Đánh dấu đã đọc 1 tin
router.patch(
  "/message/:messageId/read",
  validateObjectId("messageId"),
  interactionLimiter,
  messageCtrl.markAsRead
);

// Đánh dấu tất cả đã đọc
router.patch(
  "/messages/:userId/read-all",
  validateObjectId("userId"),
  interactionLimiter,
  messageCtrl.markAllAsRead
);

router.delete(
  "/message/:messageId",
  validateObjectId("messageId"),
  messageCtrl.deleteMessage
);

router.delete(
  "/conversation/:userId",
  validateObjectId("userId"),
  messageCtrl.deleteConversation
);

// Các route thống kê & tìm kiếm
router.get("/messages/unread/count", messageCtrl.getUnreadCount);

router.get(
  "/messages/:userId/unread",
  validateObjectId("userId"),
  messageCtrl.getUnreadByConversation
);

//router.get("/messages/search", messageCtrl.searchMessages);

// Reaction (Thả tim, icon)
/*router.post(
  "/message/:messageId/react",
  validateObjectId("messageId"),
  interactionLimiter,
  messageCtrl.reactToMessage
);*/

router.delete(
  "/message/:messageId/react",
  validateObjectId("messageId"),
  messageCtrl.removeReaction
);

module.exports = router;
