const commentRouter = require("express").Router();
const commentAuth = require("../middleware/auth");
const commentCtrl = require("../controllers/commentCtrl");
const { validate } = require("../middleware/validate");
const commentSchemas = require("../schemas/commentSchema");
const validateObjectId = require("../middleware/validateObjectId");
const { rateLimitByUser } = require("../middleware/validation");

// Create comment
commentRouter.post('/comment', 
  commentAuth, 
  rateLimitByUser(30, 60 * 1000), 
  validate(commentSchemas.create), 
  commentCtrl.createComment
);

// Update comment
commentRouter.patch('/comment/:id', 
  commentAuth, 
  validateObjectId('id'), 
  validate(commentSchemas.update), 
  commentCtrl.updateComment
);

// Delete comment
commentRouter.delete("/comment/:id", 
  commentAuth, 
  validateObjectId('id'), 
  commentCtrl.deleteComment
);

// Like comment
commentRouter.patch("/comment/:id/like", 
  commentAuth, 
  validateObjectId('id'), 
  commentCtrl.likeComment
);

// Unlike comment
commentRouter.patch("/comment/:id/unlike", 
  commentAuth, 
  validateObjectId('id'), 
  commentCtrl.unLikeComment
);

// Report comment
commentRouter.patch("/comment/:id/report", 
  commentAuth, 
  validateObjectId('id'), 
  rateLimitByUser(10, 60 * 60 * 1000), 
  validate(commentSchemas.report), 
  commentCtrl.reportComment
);

// Hide comment
commentRouter.patch("/comment/:id/hide", 
  commentAuth, 
  validateObjectId('id'), 
  commentCtrl.hideComment
);

module.exports = commentRouter;