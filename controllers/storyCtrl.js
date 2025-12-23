const Stories = require("../models/storyModel");
const Users = require("../models/userModel");
const { uploadToCloudinary } = require("../services/cloudinaryService");

const storyCtrl = {
  // Create Story
  createStory: async (req, res) => {
  try {
    const { caption, privacy, allowedViewers } = req.body;

    // XỬ LÝ FILE UPLOAD LÊN CLOUDINARY
    let media = null;
    if (req.file) {
      console.log(`Processing story file:`, req.file.filename);

      try {
        // Xác định loại file
        const isVideo = req.file.mimetype.startsWith("video/");
        const resourceType = isVideo ? "video" : "image";
        
        // Upload lên Cloudinary
        const uploadResult = await uploadToCloudinary(
          req.file.path,
          { 
            folder: 'campus-connect/stories',
            resourceType: resourceType
          }
        );

        media = {
          url: uploadResult.url,
          publicId: uploadResult.publicId,
          type: isVideo ? "video" : "image",
        };

        console.log('Story uploaded to Cloudinary:', media.url);
      } catch (uploadErr) {
        console.error("Story upload error:", uploadErr);
        return res.status(500).json({ msg: "Failed to upload story media" });
      }
    }

    if (!media) {
      return res.status(400).json({ msg: "Media is required." });
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const newStory = new Stories({
      user: req.user._id,
      media,
      caption: caption || "",
      privacy: privacy || "public",
      allowedViewers: allowedViewers || [],
      expiresAt,
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
  } catch (err) {
    console.error("Create story error:", err);
    return res.status(500).json({ msg: err.message });
  }
},
  // Get Stories Feed (Following + Own)
  getStoriesFeed: async (req, res) => {
    try {
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

      // Group stories by user
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

        // Check if user has viewed this story
        const hasViewed = story.views.some(
          (view) => view.user.toString() === req.user._id.toString()
        );
        if (!hasViewed) {
          acc[userId].hasUnviewed = true;
        }

        return acc;
      }, {});

      // Convert to array and sort
      const storiesFeed = Object.values(groupedStories).sort((a, b) => {
        // Unviewed stories first
        if (a.hasUnviewed && !b.hasUnviewed) return -1;
        if (!a.hasUnviewed && b.hasUnviewed) return 1;
        // Then by most recent
        return new Date(b.lastStoryTime) - new Date(a.lastStoryTime);
      });

      res.json({
        storiesFeed,
        totalUsers: storiesFeed.length,
      });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },

  // Get User Stories
  getUserStories: async (req, res) => {
    try {
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

      // Check privacy
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
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },

  // View Story
  viewStory: async (req, res) => {
    try {
      const { storyId } = req.params;

      // Use atomic operation to prevent race condition
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
      );

      if (!story) {
        // Story not found or already viewed
        const existingStory = await Stories.findById(storyId);
        if (!existingStory) {
          return res.status(404).json({ msg: "Story not found." });
        }
        // Already viewed
        return res.json({
          msg: "Story already viewed",
          viewsCount: existingStory.views.length,
        });
      }

      res.json({
        msg: "Story viewed",
        viewsCount: story.views.length,
      });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },

  // Reply to Story
  replyToStory: async (req, res) => {
    try {
      const { storyId } = req.params;
      const { text } = req.body;

      if (!text || !text.trim()) {
        return res.status(400).json({ msg: "Reply text is required." });
      }

      const story = await Stories.findById(storyId).populate(
        "user",
        "username avatar"
      );

      if (!story) {
        return res.status(404).json({ msg: "Story not found." });
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

      res.json({
        msg: "Reply sent successfully",
        reply: populatedReply,
      });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },
  // Like/Unlike Story
  likeStory: async (req, res) => {
    try {
      const { storyId } = req.params;

      const story = await Stories.findById(storyId);

      if (!story) {
        return res.status(404).json({ msg: "Story not found." });
      }

      // Check if already liked
      const likeIndex = story.likes.findIndex(
        (like) => like.user.toString() === req.user._id.toString()
      );

      if (likeIndex !== -1) {
        // Unlike
        story.likes.splice(likeIndex, 1);
        await story.save();

        return res.json({
          msg: "Story unliked",
          liked: false,
          likesCount: story.likes.length,
        });
      } else {
        // Like
        story.likes.push({
          user: req.user._id,
          likedAt: new Date(),
        });
        await story.save();

        return res.json({
          msg: "Story liked",
          liked: true,
          likesCount: story.likes.length,
        });
      }
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },

  // Get Story Likes (cho owner xem)
  getStoryLikes: async (req, res) => {
    try {
      const { storyId } = req.params;

      const story = await Stories.findOne({
        _id: storyId,
        user: req.user._id, // Only owner can see likes
      }).populate("likes.user", "username avatar fullname");

      if (!story) {
        return res.status(404).json({ msg: "Story not found." });
      }

      res.json({
        likes: story.likes,
        totalLikes: story.likes.length,
      });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },

  // Delete Story
  deleteStory: async (req, res) => {
    try {
      const { storyId } = req.params;

      const story = await Stories.findOneAndDelete({
        _id: storyId,
        user: req.user._id,
      });

      if (!story) {
        return res.status(404).json({ msg: "Story not found." });
      }

      res.json({ msg: "Story deleted successfully." });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },

  // Add to Highlights
  addToHighlight: async (req, res) => {
    try {
      const { storyId } = req.params;
      const { highlightName } = req.body;

      const story = await Stories.findOne({
        _id: storyId,
        user: req.user._id,
      });

      if (!story) {
        return res.status(404).json({ msg: "Story not found." });
      }

      story.isHighlight = true;
      story.highlightName = highlightName || "Highlights";
      story.expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      await story.save();

      res.json({
        msg: "Added to highlights successfully.",
        story,
      });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },

  // Get Highlights
  getHighlights: async (req, res) => {
    try {
      const { userId } = req.params;

      const highlights = await Stories.find({
        user: userId,
        isHighlight: true,
        isActive: true,
      })
        .populate("user", "username avatar fullname")
        .sort("-createdAt");

      // Group by highlight name
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
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },

  // Get Story Views
  getStoryViews: async (req, res) => {
    try {
      const { storyId } = req.params;

      const story = await Stories.findOne({
        _id: storyId,
        user: req.user._id,
      }).populate("views.user", "username avatar fullname");

      if (!story) {
        return res.status(404).json({ msg: "Story not found." });
      }

      res.json({
        views: story.views,
        totalViews: story.views.length,
      });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },
};

module.exports = storyCtrl;
