const router = require("express").Router();
const auth = require("../middleware/auth").auth;
const commentCtrl = require("../controllers/commentCtrl");
const { validate } = require("../middleware/validate");
const commentSchemas = require("../schemas/commentSchema");
const validateObjectId = require("../middleware/validateObjectId");
const { rateLimitByUser } = require("../middleware/validation");

router.post('/comment', 
  auth, 
  rateLimitByUser(30, 60 * 1000), 
  validate(commentSchemas.create), 
  commentCtrl.createComment
);

router.patch('/comment/:id', 
  auth, 
  validateObjectId('id'), 
  validate(commentSchemas.update), 
  commentCtrl.updateComment
);

router.delete("/comment/:id", 
  auth, 
  validateObjectId('id'), 
  commentCtrl.deleteComment
);

router.patch("/comment/:id/like", 
  auth, 
  validateObjectId('id'), 
  commentCtrl.likeComment
);

router.patch("/comment/:id/unlike", 
  auth, 
  validateObjectId('id'), 
  commentCtrl.unLikeComment
);

router.patch("/comment/:id/report", 
  auth, 
  validateObjectId('id'), 
  rateLimitByUser(10, 60 * 60 * 1000), 
  validate(commentSchemas.report), 
  commentCtrl.reportComment
);

router.patch("/comment/:id/hide", 
  auth, 
  validateObjectId('id'), 
  commentCtrl.hideComment
);

module.exports = router;