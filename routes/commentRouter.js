const commentRouter = require("express").Router();
const commentAuth = require("../middleware/auth");
const commentCtrl = require("../controllers/commentCtrl");
const {
  validateBody,
  validateObjectId
} = require("../middleware/validation");

commentRouter.post('/comment', commentAuth, commentCtrl.createComment);
commentRouter.patch('/comment/:id', commentAuth, commentCtrl.updateComment);
commentRouter.patch("/comment/:id/like", commentAuth, commentCtrl.likeComment);
commentRouter.patch("/comment/:id/unlike", commentAuth, commentCtrl.unLikeComment);
commentRouter.delete("/comment/:id", commentAuth, commentCtrl.deleteComment);

const reportCommentSchema = {
  reason: {
    type: 'string',
    required: true,
    custom: (value) => {
      const valid = ['spam', 'harassment', 'hate_speech', 'violence', 
                    'nudity', 'false_information', 'other'];
      if (!valid.includes(value)) return 'Invalid report reason';
    }
  },
  description: {
    type: 'string',
    required: false,
    maxLength: 500
  },
  priority: {
    type: 'string',
    required: false,
    custom: (value) => {
      const valid = ['low', 'medium', 'high'];
      if (value && !valid.includes(value)) return 'Invalid priority';
    }
  }
};

commentRouter.patch("/comment/:id/report", commentAuth, validateObjectId('id'), validateBody(reportCommentSchema), commentCtrl.reportComment);
commentRouter.patch("/comment/:id/hide", commentAuth, validateObjectId('id'), commentCtrl.hideComment);

module.exports = commentRouter;