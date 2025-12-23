const router = require("express").Router();
const auth = require("../middleware/auth").auth;
const storyCtrl = require("../controllers/storyCtrl");
const { validate } = require("../middleware/validate");
const storySchemas = require("../schemas/storySchema");
const validateObjectId = require("../middleware/validateObjectId");
const {
  rateLimitByUser,
  validateFileUpload,
} = require("../middleware/validation");
const { uploadSingle } = require("../middleware/upload");

const storyRateLimit = rateLimitByUser(30, 60 * 60 * 1000);

// Validation schemas
const createStorySchema = {
  caption: {
    type: "string",
    maxLength: 500,
    required: false,
  },
  privacy: {
    type: "string",
    required: false,
    custom: (value) => {
      const validPrivacy = ["public", "friends", "close_friends", "custom"];
      if (value && !validPrivacy.includes(value)) {
        return "Invalid privacy setting";
      }
    },
  },
};

const replySchema = {
  text: {
    type: "string",
    required: true,
    minLength: 1,
    maxLength: 500,
  },
};

const highlightSchema = {
  highlightName: {
    type: "string",
    required: false,
    maxLength: 50,
  },
};

// Create story
router.post(
  "/story",
  auth,
  storyRateLimit,
  uploadSingle,
  validateFileUpload(10 * 1024 * 1024), // 10MB max
  //validateBody(createStorySchema),
  storyCtrl.createStory
);

router.get("/stories/feed", auth, storyCtrl.getStoriesFeed);

router.get(
  "/stories/user/:userId",
  auth,
  validateObjectId("userId"),
  storyCtrl.getUserStories
);

router.post(
  "/story/:storyId/view",
  auth,
  validateObjectId("storyId"),
  storyCtrl.viewStory
);

router.post(
  "/story/:storyId/reply",
  auth,
  validateObjectId("storyId"),
  rateLimitByUser(60, 60 * 1000),
  validate(storySchemas.reply),
  storyCtrl.replyToStory
);

router.delete(
  "/story/:storyId",
  auth,
  validateObjectId("storyId"),
  storyCtrl.deleteStory
);

router.post(
  "/story/:storyId/highlight",
  auth,
  validateObjectId("storyId"),
  validate(storySchemas.highlight),
  storyCtrl.addToHighlight
);

router.get(
  "/stories/highlights/:userId",
  auth,
  validateObjectId("userId"),
  storyCtrl.getHighlights
);
router.get(
  "/story/:storyId/views",
  auth,
  validateObjectId("storyId"),
  storyCtrl.getStoryViews
);
// Like/Unlike story
router.post(
  "/story/:storyId/like",
  auth,
  validateObjectId("storyId"),
  storyCtrl.likeStory
);

// Get story likes (owner only)
router.get(
  "/story/:storyId/likes",
  auth,
  validateObjectId("storyId"),
  storyCtrl.getStoryLikes
);

module.exports = router;
