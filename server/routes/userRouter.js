const router = require("express").Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const auth = require("../middleware/auth").auth;
const userCtrl = require("../controllers/userCtrl");
const { validate } = require("../middleware/validate");
const userSchemas = require("../schemas/userSchema");
const validateObjectId = require("../middleware/validateObjectId");
const { followLimiter, searchLimiter } = require("../middleware/rateLimiter");

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
  limits: { fileSize: 10 * 1024 * 1024 }, // Giới hạn 10MB
  fileFilter: (req, file, cb) => {
    // Chỉ chấp nhận ảnh
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Not an image! Please upload only images."), false);
    }
  },
});

const uploadFields = upload.fields([
  { name: "avatar", maxCount: 1 },
  { name: "coverPhoto", maxCount: 1 },
]);
router.get("/user/me", auth, userCtrl.getCurrentUser);
router.get("/user/following", auth, userCtrl.getFollowing);
router.get("/user/followers", auth, userCtrl.getFollowers);
router.get(
  "/user/:id/following",
  auth,
  validateObjectId("id"),
  userCtrl.getFollowing
);
router.get(
  "/user/:id/followers",
  auth,
  validateObjectId("id"),
  userCtrl.getFollowers
);
router.get("/search", auth, searchLimiter, userCtrl.searchUser);
router.get("/suggestionsUser", auth, userCtrl.suggestionsUser);
router.get("/user/:id", auth, validateObjectId("id"), userCtrl.getUser);

router.patch(
  "/user",
  auth,
  uploadFields,
  validate(userSchemas.updateProfile),
  userCtrl.updateUser
);

router.patch(
  "/privacy-settings",
  auth,
  validate(userSchemas.updatePrivacy),
  userCtrl.updatePrivacySettings
);
router.post(
  "/user/:id/block",
  auth,
  validateObjectId("id"),
  userCtrl.blockUser
);

router.delete(
  "/user/:id/unblock",
  auth,
  validateObjectId("id"),
  userCtrl.unblockUser
);
router.get("/blocked-users", auth, userCtrl.getBlockedUsers);
router.get(
  "/user/:id/check-blocked",
  auth,
  validateObjectId("id"),
  userCtrl.checkBlocked
);

router.patch(
  "/user/:id/follow",
  auth,
  validateObjectId("id"),
  followLimiter,
  userCtrl.follow
);
router.patch(
  "/user/:id/unfollow",
  auth,
  validateObjectId("id"),
  followLimiter,
  userCtrl.unfollow
);

router.post(
  "/user/:id/report",
  auth,
  validateObjectId("id"),
  userCtrl.reportUser
);

module.exports = router;
