// server/controllers/profileCtrl.js
const Users = require("../models/userModel");
const Posts = require("../models/postModel");
const { asyncHandler } = require("../middleware/errorHandler");
const { NotFoundError } = require("../utils/AppError");
const logger = require("../utils/logger");

const profileCtrl = {
  getPhotos: asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const user = await Users.findById(userId);
    if (!user) {
      throw new NotFoundError("User");
    }

    // Check privacy
    if (
      user.privacySettings.profileVisibility === "private" &&
      userId !== req.user._id.toString()
    ) {
      const isFollowing = user.followers.includes(req.user._id);
      if (!isFollowing) {
        return res.status(403).json({
          msg: "This profile is private.",
        });
      }
    }

    const posts = await Posts.find({
      user: userId,
      status: "published",
      isDraft: false,
      "images.type": { $in: ["image", null] },
      images: { $exists: true, $ne: [] },
    })
      .select("images createdAt likes comments")
      .sort("-createdAt")
      .skip(skip)
      .limit(limit);

    const photos = posts.flatMap((post) =>
      post.images
        .filter((img) => !img.type || img.type === "image")
        .map((img) => ({
          ...img,
          postId: post._id,
          createdAt: post.createdAt,
          likesCount: post.likes.length,
          commentsCount: post.comments.length,
        }))
    );

    const total = await Posts.countDocuments({
      user: userId,
      status: "published",
      isDraft: false,
      "images.type": { $in: ["image", null] },
      images: { $exists: true, $ne: [] },
    });

    res.json({
      photos,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  }),

  getVideos: asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const user = await Users.findById(userId);
    if (!user) {
      throw new NotFoundError("User");
    }

    // Check privacy
    if (
      user.privacySettings.profileVisibility === "private" &&
      userId !== req.user._id.toString()
    ) {
      const isFollowing = user.followers.includes(req.user._id);
      if (!isFollowing) {
        return res.status(403).json({
          msg: "This profile is private.",
        });
      }
    }

    const posts = await Posts.find({
      user: userId,
      status: "published",
      isDraft: false,
      "images.type": "video",
    })
      .select("images content createdAt likes comments")
      .sort("-createdAt")
      .skip(skip)
      .limit(limit);

    const videos = posts.flatMap((post) =>
      post.images
        .filter((img) => img.type === "video")
        .map((img) => ({
          ...img,
          postId: post._id,
          content: post.content,
          createdAt: post.createdAt,
          likesCount: post.likes.length,
          commentsCount: post.comments.length,
        }))
    );

    const total = await Posts.countDocuments({
      user: userId,
      status: "published",
      isDraft: false,
      "images.type": "video",
    });

    res.json({
      videos,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  }),

  getAbout: asyncHandler(async (req, res) => {
    const { userId } = req.params;

    const user = await Users.findById(userId)
      .select(
        "fullname username bio location website gender createdAt followers following"
      )
      .populate("followers following", "username avatar fullname");

    if (!user) {
      throw new NotFoundError("User");
    }

    // Check privacy
    if (
      user.privacySettings.profileVisibility === "private" &&
      userId !== req.user._id.toString()
    ) {
      const isFollowing = user.followers.some(
        (f) => f._id.toString() === req.user._id.toString()
      );
      if (!isFollowing) {
        return res.status(403).json({
          msg: "This profile is private.",
        });
      }
    }

    const postsCount = await Posts.countDocuments({
      user: userId,
      status: "published",
      isDraft: false,
    });

    res.json({
      user: {
        fullname: user.fullname,
        username: user.username,
        bio: user.bio,
        location: user.location,
        website: user.website,
        gender: user.gender,
        joinedAt: user.createdAt,
        followersCount: user.followers.length,
        followingCount: user.following.length,
        postsCount,
      },
    });
  }),
};

module.exports = profileCtrl;








