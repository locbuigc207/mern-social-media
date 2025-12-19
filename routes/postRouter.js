const router = require("express").Router();
const auth = require("../middleware/auth");
const postCtrl = require("../controllers/postCtrl");
const { uploadMultiple } = require("../middleware/upload");
const { 
  createPostLimiter, 
  generalLimiter,
  reportLimiter,      
  interactionLimiter  
} = require("../middleware/rateLimiter");
const { validate } = require('../middleware/validate');
const postSchemas = require('../schemas/postSchema');
const validateObjectId = require('../middleware/validateObjectId');
const { validatePagination } = require("../middleware/validation");

router.post("/posts", 
  auth, 
  createPostLimiter, 
  uploadMultiple, 
  validate(postSchemas.create), 
  postCtrl.createPost
);

router.get("/posts", 
  auth, 
  validatePagination, 
  generalLimiter, 
  postCtrl.getPosts
);

router.patch("/post/:id", 
  auth, 
  validateObjectId('id'), 
  uploadMultiple, 
  validate(postSchemas.update), 
  postCtrl.updatePost
);

router.get("/post/:id", 
  auth, 
  validateObjectId('id'), 
  generalLimiter, 
  postCtrl.getPost
);

router.delete("/post/:id", 
  auth, 
  validateObjectId('id'), 
  postCtrl.deletePost
);

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


router.patch("/post/:id/like", 
  auth, 
  validateObjectId('id'), 
  interactionLimiter,  
  postCtrl.likePost
);

router.patch("/post/:id/unlike", 
  auth, 
  validateObjectId('id'), 
  interactionLimiter,  
  postCtrl.unLikePost
);

router.patch("/post/:id/report", 
  auth, 
  validateObjectId('id'), 
  reportLimiter, 
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