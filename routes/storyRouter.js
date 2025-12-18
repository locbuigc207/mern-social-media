const router = require("express").Router();
const auth = require("../middleware/auth");
const storyCtrl = require("../controllers/storyCtrl");
const { validate } = require("../middleware/validate");
const storySchemas = require("../schemas/storySchema");
const validateObjectId = require("../middleware/validateObjectId");
const { rateLimitByUser, validateFileUpload } = require("../middleware/validation");

// Rate limiting: 30 stories per hour
const storyRateLimit = rateLimitByUser(30, 60 * 60 * 1000);

// Create story
router.post("/story", 
  auth, 
  storyRateLimit,
  validateFileUpload(10 * 1024 * 1024),
  validate(storySchemas.create),
  storyCtrl.createStory
);

// Get stories feed
router.get("/stories/feed", 
  auth, 
  storyCtrl.getStoriesFeed
);

// Get user stories
router.get("/stories/user/:userId", 
  auth,
  validateObjectId('userId'),
  storyCtrl.getUserStories
);

// View story
router.post("/story/:storyId/view", 
  auth,
  validateObjectId('storyId'),
  storyCtrl.viewStory
);

// Reply to story
router.post("/story/:storyId/reply", 
  auth,
  validateObjectId('storyId'),
  rateLimitByUser(60, 60 * 1000),
  validate(storySchemas.reply),
  storyCtrl.replyToStory
);

// Delete story
router.delete("/story/:storyId", 
  auth,
  validateObjectId('storyId'),
  storyCtrl.deleteStory
);

// Add to highlights
router.post("/story/:storyId/highlight", 
  auth,
  validateObjectId('storyId'),
  validate(storySchemas.highlight),
  storyCtrl.addToHighlight
);

// Get highlights
router.get("/stories/highlights/:userId", 
  auth,
  validateObjectId('userId'),
  storyCtrl.getHighlights
);

// Get story views
router.get("/story/:storyId/views", 
  auth,
  validateObjectId('storyId'),
  storyCtrl.getStoryViews
);

module.exports = router;