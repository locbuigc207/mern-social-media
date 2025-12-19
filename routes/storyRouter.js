const router = require("express").Router();
const auth = require("../middleware/auth");
const storyCtrl = require("../controllers/storyCtrl");
const { validate } = require("../middleware/validate");
const storySchemas = require("../schemas/storySchema");
const validateObjectId = require("../middleware/validateObjectId");
const { rateLimitByUser, validateFileUpload } = require("../middleware/validation");

const storyRateLimit = rateLimitByUser(30, 60 * 60 * 1000);

router.post("/story", 
  auth, 
  storyRateLimit,
  validateFileUpload(10 * 1024 * 1024),
  validate(storySchemas.create),
  storyCtrl.createStory
);

router.get("/stories/feed", 
  auth, 
  storyCtrl.getStoriesFeed
);

router.get("/stories/user/:userId", 
  auth,
  validateObjectId('userId'),
  storyCtrl.getUserStories
);

router.post("/story/:storyId/view", 
  auth,
  validateObjectId('storyId'),
  storyCtrl.viewStory
);

router.post("/story/:storyId/reply", 
  auth,
  validateObjectId('storyId'),
  rateLimitByUser(60, 60 * 1000),
  validate(storySchemas.reply),
  storyCtrl.replyToStory
);

router.delete("/story/:storyId", 
  auth,
  validateObjectId('storyId'),
  storyCtrl.deleteStory
);

router.post("/story/:storyId/highlight", 
  auth,
  validateObjectId('storyId'),
  validate(storySchemas.highlight),
  storyCtrl.addToHighlight
);

router.get("/stories/highlights/:userId", 
  auth,
  validateObjectId('userId'),
  storyCtrl.getHighlights
);

router.get("/story/:storyId/views", 
  auth,
  validateObjectId('storyId'),
  storyCtrl.getStoryViews
);

module.exports = router;