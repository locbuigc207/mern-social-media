const router = require("express").Router();
const auth = require("../middleware/auth");
const postCtrl = require("../controllers/postCtrl");
const { uploadMultiple } = require("../middleware/upload");
const { createPostLimiter, generalLimiter } = require("../middleware/rateLimiter");
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

// Get drafts
router.get("/drafts", 
  auth, 
  validatePagination, 
  postCtrl.getDraftPosts
);

// Save draft
router.post("/draft", 
  auth, 
  uploadMultiple, 
  validate(postSchemas.create), 
  postCtrl.saveDraft
);

// Update draft
router.patch("/draft/:id", 
  auth, 
  validateObjectId('id'), 
  uploadMultiple, 
  validate(postSchemas.update), 
  postCtrl.updateDraft
);

// Delete draft
router.delete("/draft/:id", 
  auth, 
  validateObjectId('id'), 
  postCtrl.deleteDraft
);

// Publish draft
router.post("/draft/:id/publish", 
  auth, 
  validateObjectId('id'), 
  postCtrl.publishDraft
);

// === SCHEDULED POSTS ===

// Get scheduled posts
router.get("/scheduled-posts", 
  auth, 
  validatePagination, 
  postCtrl.getScheduledPosts
);

// Schedule post
router.post("/schedule-post", 
  auth, 
  createPostLimiter, 
  uploadMultiple, 
  validate(postSchemas.schedule), 
  postCtrl.schedulePost
);

// Update scheduled post
router.patch("/scheduled-post/:id", 
  auth, 
  validateObjectId('id'), 
  uploadMultiple, 
  postCtrl.updateScheduledPost
);

// Cancel scheduled post
router.post("/scheduled-post/:id/cancel", 
  auth, 
  validateObjectId('id'), 
  postCtrl.cancelScheduledPost
);

// === INTERACTIONS ===

// Like post
router.patch("/post/:id/like", 
  auth, 
  validateObjectId('id'), 
  generalLimiter, 
  postCtrl.likePost
);

// Unlike post
router.patch("/post/:id/unlike", 
  auth, 
  validateObjectId('id'), 
  generalLimiter, 
  postCtrl.unLikePost
);

// Report post
router.patch("/post/:id/report", 
  auth, 
  validateObjectId('id'), 
  validate(postSchemas.report), 
  postCtrl.reportPost
);

// Hide post
router.patch("/post/:id/hide", 
  auth, 
  validateObjectId('id'), 
  validate(postSchemas.hide), 
  postCtrl.hidePost
);

// Unhide post
router.patch("/post/:id/unhide", 
  auth, 
  validateObjectId('id'), 
  postCtrl.unhidePost
);

// Get hidden posts
router.get("/hidden-posts", 
  auth, 
  validatePagination, 
  postCtrl.getHiddenPosts
);

// Unhide all posts
router.post("/unhide-all-posts", 
  auth, 
  postCtrl.unhideAllPosts
);

// === USER POSTS & DISCOVERY ===

// Get user posts
router.get("/user_posts/:id", 
  auth, 
  validateObjectId('id'), 
  validatePagination, 
  generalLimiter, 
  postCtrl.getUserPosts
);

// Get discover posts
router.get("/post_discover", 
  auth, 
  generalLimiter, 
  postCtrl.getPostDiscover
);

// === SAVED POSTS ===

// Save post
router.patch("/savePost/:id", 
  auth, 
  validateObjectId('id'), 
  postCtrl.savePost
);

// Unsave post
router.patch("/unSavePost/:id", 
  auth, 
  validateObjectId('id'), 
  postCtrl.unSavePost
);

// Get saved posts
router.get("/getSavePosts", 
  auth, 
  validatePagination, 
  postCtrl.getSavePost
);

module.exports = router;