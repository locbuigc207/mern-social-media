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

// --- 2. CẤU HÌNH UPLOAD (Để sửa lỗi "Recipient is required") ---
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype.startsWith("image/") ||
      file.mimetype.startsWith("video/")
    ) {
      cb(null, true);
    } else {
      cb(new Error("File format not supported!"), false);
    }
  },
});

// Middleware xử lý upload: Bắt trường tên là "files" (khớp với Frontend React)
const uploadFiles = upload.array("files", 10);

// --- 3. ROUTES ---

// Áp dụng Auth cho tất cả các route bên dưới
router.use(auth);

// Route tạo tin nhắn: Thêm uploadFiles vào để parse FormData
router.post(
  "/message",
  messageLimiter,
  uploadFiles, // <--- QUAN TRỌNG: Phải có dòng này thì req.body.recipient mới có dữ liệu
  messageCtrl.createMessage
);

router.get("/conversations", messageCtrl.getConversations);

router.get("/message/:id", validateObjectId("id"), messageCtrl.getMessages);

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

router.get("/messages/search", messageCtrl.searchMessages);

// Reaction (Thả tim, icon)
router.post(
  "/message/:messageId/react",
  validateObjectId("messageId"),
  interactionLimiter,
  messageCtrl.reactToMessage
);

router.delete(
  "/message/:messageId/react",
  validateObjectId("messageId"),
  messageCtrl.removeReaction
);

module.exports = router;
