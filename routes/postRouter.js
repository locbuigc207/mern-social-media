const router = require("express").Router();
const auth = require("../middleware/auth");
const postCtrl = require("../controllers/postCtrl");
const { uploadMultiple } = require("../middleware/upload");
const {
  createPostLimiter,
  commentLimiter,
  generalLimiter
} = require("../middleware/rateLimiter");
const {
  validateBody,
  validateObjectId,
  validatePagination
} = require("../middleware/validation");

const createPostSchema = {
  content: {
    type: 'string',
    required: false,
    maxLength: 5000
  },
  status: {
    type: 'string',
    required: false,
    custom: (value) => {
      const validStatuses = ['published', 'draft', 'scheduled'];
      if (value && !validStatuses.includes(value)) {
        return 'Invalid status';
      }
    }
  }
};

router.post(   "/posts",   auth,   createPostLimiter,   uploadMultiple,    validateBody(createPostSchema),   postCtrl.createPost );
router.get(   "/posts",   auth,   validatePagination,   generalLimiter,   postCtrl.getPosts );
router.get( "/drafts", auth, validatePagination, postCtrl.getDraftPosts);
router.post(   "/draft",   auth,   uploadMultiple,   validateBody(createPostSchema),   postCtrl.saveDraft );
router.patch(   "/draft/:id",   auth,   validateObjectId('id'),   uploadMultiple,   postCtrl.updateDraft );
router.delete(   "/draft/:id",   auth,   validateObjectId('id'),   postCtrl.deleteDraft );
router.post(   "/draft/:id/publish",   auth,   validateObjectId('id'),   postCtrl.publishDraft );
router.get(   "/scheduled-posts",   auth,   validatePagination,   postCtrl.getScheduledPosts );
router.post(   "/schedule-post",   auth,   createPostLimiter,   uploadMultiple,   validateBody(createPostSchema),   postCtrl.schedulePost );
router.patch(   "/scheduled-post/:id",   auth,   validateObjectId('id'),   uploadMultiple,   postCtrl.updateScheduledPost );
router.post(   "/scheduled-post/:id/cancel",   auth,   validateObjectId('id'),   postCtrl.cancelScheduledPost );
router.patch(   "/post/:id",   auth,   validateObjectId('id'),   uploadMultiple,   postCtrl.updatePost );
router.get(   "/post/:id",   auth,   validateObjectId('id'),   generalLimiter,   postCtrl.getPost );
router.delete(   "/post/:id",   auth,   validateObjectId('id'),   postCtrl.deletePost );
router.patch(   "/post/:id/like",   auth,   validateObjectId('id'),   generalLimiter,   postCtrl.likePost );
router.patch(   "/post/:id/unlike",   auth,   validateObjectId('id'),   generalLimiter,   postCtrl.unLikePost );
router.patch(   "/post/:id/report",   auth,   validateObjectId('id'),   postCtrl.reportPost );
router.get(   "/user_posts/:id",   auth,   validateObjectId('id'),   validatePagination,   generalLimiter,   postCtrl.getUserPosts );
router.get(   "/post_discover",   auth,   generalLimiter,   postCtrl.getPostDiscover );
router.patch(   "/savePost/:id",   auth,   validateObjectId('id'),   postCtrl.savePost );
router.patch(   "/unSavePost/:id",   auth,   validateObjectId('id'),   postCtrl.unSavePost );
router.get(   "/getSavePosts",   auth,   validatePagination,   postCtrl.getSavePost );

module.exports = router;