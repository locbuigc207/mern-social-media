const router = require("express").Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { uploadMultiple } = require("../middleware/upload");

const authMiddleware = require("../middleware/auth");
const auth = authMiddleware.auth || authMiddleware;

const messageCtrl = require("../controllers/messageCtrl");
const validateObjectId = require("../middleware/validateObjectId");
const {
  messageLimiter,
  interactionLimiter,
  searchLimiter
} = require("../middleware/rateLimiter");
const { validatePagination } = require("../middleware/validation");

router.post("/message", auth, uploadMultiple, messageLimiter, messageCtrl.createMessage);

router.post(
  "/message/story-reply",
  auth,
  messageLimiter,
  messageCtrl.createMessageFromStoryReply
);

router.get("/conversations", auth, messageCtrl.getConversations);

router.get("/message/:id", auth, validateObjectId("id"), messageCtrl.getMessages);

router.patch(
  "/message/:messageId/read",
  auth,
  validateObjectId("messageId"),
  interactionLimiter,
  messageCtrl.markAsRead
);

router.patch(
  "/messages/:userId/read-all",
  auth,
  validateObjectId("userId"),
  interactionLimiter,
  messageCtrl.markAllAsRead
);

router.delete(
  "/message/:messageId",
  auth,
  validateObjectId("messageId"),
  messageCtrl.deleteMessage
);

router.delete(
  "/conversation/:userId",
  auth,
  validateObjectId("userId"),
  messageCtrl.deleteConversation
);

router.get("/messages/unread/count", auth, messageCtrl.getUnreadCount);

router.get(
  "/messages/:userId/unread",
  auth,
  validateObjectId("userId"),
  messageCtrl.getUnreadByConversation
);

router.get(
  "/messages/search",
  auth,
  searchLimiter,
  validatePagination,
  messageCtrl.searchMessages
);

router.post(
  "/message/:messageId/react",
  auth,
  validateObjectId("messageId"),
  interactionLimiter,
  messageCtrl.reactToMessage
);

router.delete(
  "/message/:messageId/react",
  auth,
  validateObjectId("messageId"),
  messageCtrl.removeReaction
);

module.exports = router;