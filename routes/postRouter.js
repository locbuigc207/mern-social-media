const router = require("express").Router();
const auth = require("../middleware/auth");
const postCtrl = require("../controllers/postCtrl");
const { uploadMultiple } = require("../middleware/upload");
const { createPostLimiter, commentLimiter, generalLimiter } = require("../middleware/rateLimiter");
const { validateBody, validateObjectId, validatePagination, rateLimitByUser } = require("../middleware/validation");

const createPostSchema = {
  content: { type: 'string', required: false, maxLength: 5000 },
  status: {
    type: 'string',
    required: false,
    custom: (value) => {
      const validStatuses = ['published', 'draft', 'scheduled'];
      if (value && !validStatuses.includes(value)) return 'Invalid status';
    }
  }
};

const reportPostSchema = {
  reason: {
    type: 'string',
    required: true,
    custom: (value) => {
      const valid = ['spam', 'harassment', 'hate_speech', 'violence', 'nudity', 'false_information', 'scam', 'copyright', 'self_harm', 'terrorism', 'child_exploitation', 'other'];
      if (!valid.includes(value)) return 'Invalid report reason';
    }
  },
  description: { type: 'string', required: true, minLength: 10, maxLength: 500 },
  priority: {
    type: 'string',
    required: false,
    custom: (value) => {
      const valid = ['low', 'medium', 'high', 'critical'];
      if (value && !valid.includes(value)) return 'Invalid priority';
    }
  }
};

const hidePostSchema = {
  reason: { type: 'string', required: false, maxLength: 200 }
};


router.post("/posts", auth, createPostLimiter, uploadMultiple, validateBody(createPostSchema), postCtrl.createPost);
router.get("/posts", auth, validatePagination, generalLimiter, postCtrl.getPosts);
router.patch("/post/:id", auth, validateObjectId('id'), uploadMultiple, postCtrl.updatePost);
router.get("/post/:id", auth, validateObjectId('id'), generalLimiter, postCtrl.getPost);
router.delete("/post/:id", auth, validateObjectId('id'), postCtrl.deletePost);

router.get("/drafts", auth, validatePagination, postCtrl.getDraftPosts);
router.post("/draft", auth, uploadMultiple, validateBody(createPostSchema), postCtrl.saveDraft);
router.patch("/draft/:id", auth, validateObjectId('id'), uploadMultiple, postCtrl.updateDraft);
router.delete("/draft/:id", auth, validateObjectId('id'), postCtrl.deleteDraft);
router.post("/draft/:id/publish", auth, validateObjectId('id'), postCtrl.publishDraft);

router.get("/scheduled-posts", auth, validatePagination, postCtrl.getScheduledPosts);
router.post("/schedule-post", auth, createPostLimiter, uploadMultiple, validateBody(createPostSchema), postCtrl.schedulePost);
router.patch("/scheduled-post/:id", auth, validateObjectId('id'), uploadMultiple, postCtrl.updateScheduledPost);
router.post("/scheduled-post/:id/cancel", auth, validateObjectId('id'), postCtrl.cancelScheduledPost);

router.patch("/post/:id/like", auth, validateObjectId('id'), generalLimiter, postCtrl.likePost);
router.patch("/post/:id/unlike", auth, validateObjectId('id'), generalLimiter, postCtrl.unLikePost);

router.patch("/post/:id/report", auth, validateObjectId('id'), rateLimitByUser(10, 60 * 60 * 1000), validateBody(reportPostSchema), postCtrl.reportPost);
router.patch("/post/:id/hide", auth, validateObjectId('id'), validateBody(hidePostSchema), postCtrl.hidePost);
router.patch("/post/:id/unhide", auth, validateObjectId('id'), postCtrl.unhidePost);
router.get("/hidden-posts", auth, validatePagination, postCtrl.getHiddenPosts);
router.post("/unhide-all-posts", auth, postCtrl.unhideAllPosts);

router.get("/user_posts/:id", auth, validateObjectId('id'), validatePagination, generalLimiter, postCtrl.getUserPosts);
router.get("/post_discover", auth, generalLimiter, postCtrl.getPostDiscover);

router.patch("/savePost/:id", auth, validateObjectId('id'), postCtrl.savePost);
router.patch("/unSavePost/:id", auth, validateObjectId('id'), postCtrl.unSavePost);
router.get("/getSavePosts", auth, validatePagination, postCtrl.getSavePost);

module.exports = router;