const Stories = require("../models/storyModel");
const Users = require("../models/userModel");
const notificationService = require("../services/notificationService");
const { asyncHandler } = require("../middleware/errorHandler");
const { NotFoundError, ValidationError } = require("../utils/AppError");

const storyCtrl = {
  createStory: asyncHandler(async (req, res) => {
    const { media, caption, privacy, allowedViewers } = req.body;

    if (!media || !media.url) {
      throw new ValidationError("Media is required.");
    }

    const newStory = new Stories({
      user: req.user._id,
      media,
      caption,
      privacy: privacy || "public",
      allowedViewers: allowedViewers || [],
    });

    await newStory.save();

    const populatedStory = await Stories.findById(newStory._id).populate(
      "user",
      "username avatar fullname"
    );

    res.json({
      msg: "Story created successfully!",
      story: populatedStory,
    });
  }),

  getStoriesFeed: asyncHandler(async (req, res) => {
    const followingIds = [...req.user.following, req.user._id];
    const now = new Date();

    const stories = await Stories.find({
      user: { $in: followingIds },
      isActive: true,
      expiresAt: { $gt: now },
      $or: [
        { privacy: "public" },
        {
          privacy: "friends",
          user: { $in: req.user.following },
        },
        {
          privacy: "close_friends",
          allowedViewers: req.user._id,
        },
        { user: req.user._id },
      ],
      blockedViewers: { $ne: req.user._id },
    })
      .populate("user", "username avatar fullname")
      .sort("-createdAt");

    const groupedStories = stories.reduce((acc, story) => {
      const userId = story.user._id.toString();
      if (!acc[userId]) {
        acc[userId] = {
          user: story.user,
          stories: [],
          hasUnviewed: false,
          lastStoryTime: story.createdAt,
        };
      }
      acc[userId].stories.push(story);

      const hasViewed = story.views.some(
        (view) => view.user.toString() === req.user._id.toString()
      );
      if (!hasViewed) {
        acc[userId].hasUnviewed = true;
      }

      return acc;
    }, {});

    const storiesFeed = Object.values(groupedStories).sort((a, b) => {
      if (a.hasUnviewed && !b.hasUnviewed) return -1;
      if (!a.hasUnviewed && b.hasUnviewed) return 1;
      return new Date(b.lastStoryTime) - new Date(a.lastStoryTime);
    });

    res.json({
      storiesFeed,
      totalUsers: storiesFeed.length,
    });
  }),

  getUserStories: asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const now = new Date();

    const stories = await Stories.find({
      user: userId,
      isActive: true,
      expiresAt: { $gt: now },
      blockedViewers: { $ne: req.user._id },
    })
      .populate("user", "username avatar fullname")
      .populate("views.user", "username avatar")
      .populate("replies.user", "username avatar")
      .sort("-createdAt");

    const storyUser = await Users.findById(userId);
    const isFollowing = storyUser.followers.some(
      (f) => f.toString() === req.user._id.toString()
    );

    const filteredStories = stories.filter((story) => {
      if (story.user._id.toString() === req.user._id.toString()) return true;
      if (story.privacy === "public") return true;
      if (story.privacy === "friends" && isFollowing) return true;
      if (
        story.privacy === "close_friends" &&
        story.allowedViewers.includes(req.user._id)
      )
        return true;
      return false;
    });

    res.json({
      stories: filteredStories,
      totalStories: filteredStories.length,
    });
  }),

  viewStory: asyncHandler(async (req, res) => {
    const { storyId } = req.params;

    const story = await Stories.findOneAndUpdate(
      {
        _id: storyId,
        "views.user": { $ne: req.user._id },
      },
      {
        $push: {
          views: {
            user: req.user._id,
            viewedAt: new Date(),
          },
        },
      },
      { new: true }
    ).populate("user", "username avatar fullname");

    if (!story) {
      const existingStory = await Stories.findById(storyId);

      if (!existingStory) {
        throw new NotFoundError("Story");
      }

      return res.json({
        msg: "Story already viewed",
        viewsCount: existingStory.views.length,
      });
    }

    await notificationService.notifyStoryView(story, req.user);

    res.json({
      msg: "Story viewed",
      viewsCount: story.views.length,
    });
  }),

  replyToStory: asyncHandler(async (req, res) => {
    const { storyId } = req.params;
    const { text } = req.body;

    if (!text || !text.trim()) {
      throw new ValidationError("Reply text is required.");
    }

    const story = await Stories.findById(storyId).populate(
      "user",
      "username avatar fullname"
    );

    if (!story) {
      throw new NotFoundError("Story");
    }

    const reply = {
      user: req.user._id,
      text: text.trim(),
      createdAt: new Date(),
    };

    story.replies.push(reply);
    await story.save();

    const populatedReply = {
      ...reply,
      user: {
        _id: req.user._id,
        username: req.user.username,
        avatar: req.user.avatar,
      },
    };

    await notificationService.notifyStoryReply(story, reply, req.user);

    res.json({
      msg: "Reply sent successfully",
      reply: populatedReply,
    });
  }),

  deleteStory: asyncHandler(async (req, res) => {
    const { storyId } = req.params;

    const story = await Stories.findOneAndDelete({
      _id: storyId,
      user: req.user._id,
    });

    if (!story) {
      throw new NotFoundError("Story");
    }

    res.json({ msg: "Story deleted successfully." });
  }),

  addToHighlight: asyncHandler(async (req, res) => {
    const { storyId } = req.params;
    const { highlightName } = req.body;

    const story = await Stories.findOne({
      _id: storyId,
      user: req.user._id,
    });

    if (!story) {
      throw new NotFoundError("Story");
    }

    story.isHighlight = true;
    story.highlightName = highlightName || "Highlights";
    story.expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    await story.save();

    res.json({
      msg: "Added to highlights successfully.",
      story,
    });
  }),

  getHighlights: asyncHandler(async (req, res) => {
    const { userId } = req.params;

    const highlights = await Stories.find({
      user: userId,
      isHighlight: true,
      isActive: true,
    })
      .populate("user", "username avatar fullname")
      .sort("-createdAt");

    const groupedHighlights = highlights.reduce((acc, story) => {
      const name = story.highlightName || "Highlights";
      if (!acc[name]) {
        acc[name] = {
          name,
          stories: [],
          cover: story.media.url,
        };
      }
      acc[name].stories.push(story);
      return acc;
    }, {});

    res.json({
      highlights: Object.values(groupedHighlights),
    });
  }),

  getStoryViews: asyncHandler(async (req, res) => {
    const { storyId } = req.params;

    const story = await Stories.findOne({
      _id: storyId,
      user: req.user._id,
    }).populate("views.user", "username avatar fullname");

    if (!story) {
      throw new NotFoundError("Story");
    }

    res.json({
      views: story.views,
      totalViews: story.views.length,
    });
  }),
};

module.exports = storyCtrl;