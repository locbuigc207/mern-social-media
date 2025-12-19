const commentRouter = require("express").Router();
const commentAuth = require("../middleware/auth");
const commentCtrl = require("../controllers/commentCtrl");
const { validate } = require("../middleware/validate");
const commentSchemas = require("../schemas/commentSchema");
const validateObjectId = require("../middleware/validateObjectId");
const { rateLimitByUser } = require("../middleware/validation");

commentRouter.post('/comment', 
  commentAuth, 
  rateLimitByUser(30, 60 * 1000), 
  validate(commentSchemas.create), 
  commentCtrl.createComment
);

commentRouter.patch('/comment/:id', 
  commentAuth, 
  validateObjectId('id'), 
  validate(commentSchemas.update), 
  commentCtrl.updateComment
);

commentRouter.delete("/comment/:id", 
  commentAuth, 
  validateObjectId('id'), 
  commentCtrl.deleteComment
);

commentRouter.patch("/comment/:id/like", 
  commentAuth, 
  validateObjectId('id'), 
  commentCtrl.likeComment
);

commentRouter.patch("/comment/:id/unlike", 
  commentAuth, 
  validateObjectId('id'), 
  commentCtrl.unLikeComment
);

commentRouter.patch("/comment/:id/report", 
  commentAuth, 
  validateObjectId('id'), 
  rateLimitByUser(10, 60 * 60 * 1000), 
  validate(commentSchemas.report), 
  commentCtrl.reportComment
);

commentRouter.patch("/comment/:id/hide", 
  commentAuth, 
  validateObjectId('id'), 
  commentCtrl.hideComment
);

module.exports = commentRouter;