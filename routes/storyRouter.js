const router = require("express").Router();
const auth = require("../middleware/auth");
const storyCtrl = require("../controllers/storyCtrl");
const { 
  validateBody, 
  validateObjectId, 
  rateLimitByUser,
  validateFileUpload 
} = require("../middleware/validation");

// Rate limiting: 30 stories per hour
const storyRateLimit = rateLimitByUser(30, 60 * 60 * 1000);

// Validation schemas
const createStorySchema = {
  caption: {
    type: 'string',
    maxLength: 500,
    required: false
  },
  privacy: {
    type: 'string',
    required: false,
    custom: (value) => {
      const validPrivacy = ['public', 'friends', 'close_friends', 'custom'];
      if (value && !validPrivacy.includes(value)) {
        return 'Invalid privacy setting';
      }
    }
  }
};

const replySchema = {
  text: {
    type: 'string',
    required: true,
    minLength: 1,
    maxLength: 500
  }
};

const highlightSchema = {
  highlightName: {
    type: 'string',
    required: false,
    maxLength: 50
  }
};

// Create story
router.post(
  "/story", 
  auth, 
  storyRateLimit,
  validateFileUpload(10 * 1024 * 1024), // 10MB max
  validateBody(createStorySchema),
  storyCtrl.createStory
);

// Get stories feed
router.get("/stories/feed", auth, storyCtrl.getStoriesFeed);

// Get user stories
router.get(
  "/stories/user/:userId", 
  auth,
  validateObjectId('userId'),
  storyCtrl.getUserStories
);

// View story
router.post(
  "/story/:storyId/view", 
  auth,
  validateObjectId('storyId'),
  storyCtrl.viewStory
);

// Reply to story
router.post(
  "/story/:storyId/reply", 
  auth,
  validateObjectId('storyId'),
  rateLimitByUser(60, 60 * 1000), // 60 replies per minute
  validateBody(replySchema),
  storyCtrl.replyToStory
);

// Delete story
router.delete(
  "/story/:storyId", 
  auth,
  validateObjectId('storyId'),
  storyCtrl.deleteStory
);

// Highlights
router.post(
  "/story/:storyId/highlight", 
  auth,
  validateObjectId('storyId'),
  validateBody(highlightSchema),
  storyCtrl.addToHighlight
);

router.get(
  "/stories/highlights/:userId", 
  auth,
  validateObjectId('userId'),
  storyCtrl.getHighlights
);

// Get story views
router.get(
  "/story/:storyId/views", 
  auth,
  validateObjectId('storyId'),
  storyCtrl.getStoryViews
);

module.exports = router;