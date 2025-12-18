const commentRouter = require("express").Router();
const commentAuth = require("../middleware/auth");
const commentCtrl = require("../controllers/commentCtrl");
const {
  validateBody,
  validateObjectId,
  rateLimitByUser
} = require("../middleware/validation");

const reportCommentSchema = {
  reason: {
    type: 'string',
    required: true,
    custom: (value) => {
      const valid = ['spam', 'harassment', 'hate_speech', 'violence', 'nudity', 'false_information', 'bullying', 'threats', 'self_harm', 'other'];
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

const createCommentSchema = {
  postId: {
    type: 'string',
    required: true,
    custom: (value) => { if (!value.match(/^[0-9a-fA-F]{24}$/)) return 'Invalid post ID'; }
  },
  content: { type: 'string', required: true, minLength: 1, maxLength: 2000 },
  reply: {
    type: 'string',
    required: false,
    custom: (value) => { if (value && !value.match(/^[0-9a-fA-F]{24}$/)) return 'Invalid comment ID'; }
  }
};

const updateCommentSchema = {
  content: { type: 'string', required: true, minLength: 1, maxLength: 2000 }
};

commentRouter.post('/comment', commentAuth, rateLimitByUser(30, 60 * 1000), validateBody(createCommentSchema), commentCtrl.createComment);
commentRouter.patch('/comment/:id', commentAuth, validateObjectId('id'), validateBody(updateCommentSchema), commentCtrl.updateComment);
commentRouter.delete("/comment/:id", commentAuth, validateObjectId('id'), commentCtrl.deleteComment);

commentRouter.patch("/comment/:id/like", commentAuth, validateObjectId('id'), commentCtrl.likeComment);
commentRouter.patch("/comment/:id/unlike", commentAuth, validateObjectId('id'), commentCtrl.unLikeComment);

commentRouter.patch("/comment/:id/report", commentAuth, validateObjectId('id'), rateLimitByUser(10, 60 * 60 * 1000), validateBody(reportCommentSchema), commentCtrl.reportComment);
commentRouter.patch("/comment/:id/hide", commentAuth, validateObjectId('id'), commentCtrl.hideComment);

module.exports = commentRouter;