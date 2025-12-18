const router = require("express").Router();
const auth = require("../middleware/auth");
const postCtrl = require("../controllers/postCtrl");
const { uploadMultiple } = require("../middleware/upload");
const { 
  createPostLimiter, 
  generalLimiter,
  reportLimiter,      // ✅ NEW
  interactionLimiter  // ✅ NEW
} = require("../middleware/rateLimiter");
const { validate } = require('../middleware/validate');
const postSchemas = require('../schemas/postSchema');
const validateObjectId = require('../middleware/validateObjectId');
const { validatePagination } = require("../middleware/validation");

// Create post
router.post("/posts", 
  auth, 
  createPostLimiter, 
  uploadMultiple, 
  validate(postSchemas.create), 
  postCtrl.createPost
);

// Get posts feed
router.get("/posts", 
  auth, 
  validatePagination, 
  generalLimiter, 
  postCtrl.getPosts
);

// Update post
router.patch("/post/:id", 
  auth, 
  validateObjectId('id'), 
  uploadMultiple, 
  validate(postSchemas.update), 
  postCtrl.updatePost
);

// Get single post
router.get("/post/:id", 
  auth, 
  validateObjectId('id'), 
  generalLimiter, 
  postCtrl.getPost
);

// Delete post
router.delete("/post/:id", 
  auth, 
  validateObjectId('id'), 
  postCtrl.deletePost
);

// === DRAFTS ===
router.get("/drafts", 
  auth, 
  validatePagination, 
  postCtrl.getDraftPosts
);

router.post("/draft", 
  auth, 
  uploadMultiple, 
  validate(postSchemas.create), 
  postCtrl.saveDraft
);

router.patch("/draft/:id", 
  auth, 
  validateObjectId('id'), 
  uploadMultiple, 
  validate(postSchemas.update), 
  postCtrl.updateDraft
);

router.delete("/draft/:id", 
  auth, 
  validateObjectId('id'), 
  postCtrl.deleteDraft
);

router.post("/draft/:id/publish", 
  auth, 
  validateObjectId('id'), 
  postCtrl.publishDraft
);

// === SCHEDULED POSTS ===
router.get("/scheduled-posts", 
  auth, 
  validatePagination, 
  postCtrl.getScheduledPosts
);

router.post("/schedule-post", 
  auth, 
  createPostLimiter, 
  uploadMultiple, 
  validate(postSchemas.schedule), 
  postCtrl.schedulePost
);

router.patch("/scheduled-post/:id", 
  auth, 
  validateObjectId('id'), 
  uploadMultiple, 
  postCtrl.updateScheduledPost
);

router.post("/scheduled-post/:id/cancel", 
  auth, 
  validateObjectId('id'), 
  postCtrl.cancelScheduledPost
);

// === INTERACTIONS ===

// ✅ FIXED: Add rate limiter
router.patch("/post/:id/like", 
  auth, 
  validateObjectId('id'), 
  interactionLimiter,  // ✅ NEW
  postCtrl.likePost
);

// ✅ FIXED: Add rate limiter
router.patch("/post/:id/unlike", 
  auth, 
  validateObjectId('id'), 
  interactionLimiter,  // ✅ NEW
  postCtrl.unLikePost
);

// ✅ FIXED: Add rate limiter
router.patch("/post/:id/report", 
  auth, 
  validateObjectId('id'), 
  reportLimiter,  // ✅ NEW - Prevent spam reporting
  validate(postSchemas.report), 
  postCtrl.reportPost
);

router.patch("/post/:id/hide", 
  auth, 
  validateObjectId('id'), 
  validate(postSchemas.hide), 
  postCtrl.hidePost
);

router.patch("/post/:id/unhide", 
  auth, 
  validateObjectId('id'), 
  postCtrl.unhidePost
);

router.get("/hidden-posts", 
  auth, 
  validatePagination, 
  postCtrl.getHiddenPosts
);

router.post("/unhide-all-posts", 
  auth, 
  postCtrl.unhideAllPosts
);

// === USER POSTS & DISCOVERY ===
router.get("/user_posts/:id", 
  auth, 
  validateObjectId('id'), 
  validatePagination, 
  generalLimiter, 
  postCtrl.getUserPosts
);

router.get("/post_discover", 
  auth, 
  generalLimiter, 
  postCtrl.getPostDiscover
);

// === SAVED POSTS ===
router.patch("/savePost/:id", 
  auth, 
  validateObjectId('id'), 
  postCtrl.savePost
);

router.patch("/unSavePost/:id", 
  auth, 
  validateObjectId('id'), 
  postCtrl.unSavePost
);

router.get("/getSavePosts", 
  auth, 
  validatePagination, 
  postCtrl.getSavePost
);

module.exports = router;