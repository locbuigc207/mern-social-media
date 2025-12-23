// server/controllers/searchCtrl.js
const Users = require("../models/userModel");
const Posts = require("../models/postModel");
const Comments = require("../models/commentModel");
const Hashtags = require("../models/hashtagModel");
const { asyncHandler } = require("../middleware/errorHandler");
const { ValidationError } = require("../utils/AppError");
const logger = require("../utils/logger");

const searchCtrl = {
  globalSearch: asyncHandler(async (req, res) => {
    const { query, type } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    if (!query || query.trim().length < 2) {
      throw new ValidationError("Search query must be at least 2 characters.");
    }

    const sanitizedQuery = query.trim().replace(/[$.]/g, "");
    const currentUser = await Users.findById(req.user._id).select(
      "blockedUsers blockedBy"
    );

    const excludedUserIds = [
      ...currentUser.blockedUsers,
      ...currentUser.blockedBy,
    ];

    let results = {
      users: [],
      posts: [],
      hashtags: [],
      comments: [],
    };

    // Search users
    if (!type || type === "users") {
      const users = await Users.find({
        $or: [
          { username: { $regex: sanitizedQuery, $options: "i" } },
          { fullname: { $regex: sanitizedQuery, $options: "i" } },
        ],
        role: "user",
        isBlocked: false,
        _id: { $nin: [...excludedUserIds, req.user._id] },
      })
        .select("username avatar fullname bio")
        .limit(type ? limit : 5)
        .skip(type ? skip : 0);

      results.users = users;
    }

    // Search posts
    if (!type || type === "posts") {
      const posts = await Posts.find({
        content: { $regex: sanitizedQuery, $options: "i" },
        status: "published",
        isDraft: false,
        moderationStatus: { $ne: "removed" },
        user: { $nin: excludedUserIds },
      })
        .populate("user", "username avatar fullname")
        .select("content images user createdAt likes comments")
        .sort("-createdAt")
        .limit(type ? limit : 5)
        .skip(type ? skip : 0);

      results.posts = posts;
    }

    // Search hashtags
    if (!type || type === "hashtags") {
      const hashtags = await Hashtags.find({
        name: { $regex: sanitizedQuery, $options: "i" },
      })
        .select("name usageCount posts")
        .sort("-usageCount")
        .limit(type ? limit : 5)
        .skip(type ? skip : 0);

      results.hashtags = hashtags.map((tag) => ({
        name: tag.name,
        usageCount: tag.usageCount,
        postsCount: tag.posts.length,
      }));
    }

    // Search comments
    if (!type || type === "comments") {
      const comments = await Comments.find({
        content: { $regex: sanitizedQuery, $options: "i" },
        moderationStatus: { $ne: "removed" },
        user: { $nin: excludedUserIds },
      })
        .populate("user", "username avatar fullname")
        .populate("postId", "content images")
        .select("content user postId createdAt")
        .sort("-createdAt")
        .limit(type ? limit : 5)
        .skip(type ? skip : 0);

      results.comments = comments;
    }

    logger.info("Search performed", {
      query: sanitizedQuery,
      type: type || "all",
      userId: req.user._id,
      resultsCount: {
        users: results.users.length,
        posts: results.posts.length,
        hashtags: results.hashtags.length,
        comments: results.comments.length,
      },
    });

    res.json({
      query: sanitizedQuery,
      type: type || "all",
      results,
      page: type ? page : 1,
    });
  }),

  searchPosts: asyncHandler(async (req, res) => {
    const { query, filter } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    if (!query || query.trim().length < 2) {
      throw new ValidationError("Search query must be at least 2 characters.");
    }

    const sanitizedQuery = query.trim().replace(/[$.]/g, "");

    const currentUser = await Users.findById(req.user._id).select(
      "blockedUsers blockedBy"
    );

    const excludedUserIds = [
      ...currentUser.blockedUsers,
      ...currentUser.blockedBy,
    ];

    let searchQuery = {
      content: { $regex: sanitizedQuery, $options: "i" },
      status: "published",
      isDraft: false,
      moderationStatus: { $ne: "removed" },
      user: { $nin: excludedUserIds },
    };

    // Apply filters
    if (filter === "images") {
      searchQuery.images = { $exists: true, $ne: [] };
    } else if (filter === "videos") {
      searchQuery["images.type"] = "video";
    }

    const posts = await Posts.find(searchQuery)
      .populate("user", "username avatar fullname")
      .sort("-createdAt")
      .skip(skip)
      .limit(limit);

    const total = await Posts.countDocuments(searchQuery);

    res.json({
      query: sanitizedQuery,
      filter: filter || "all",
      posts,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  }),

  searchUsers: asyncHandler(async (req, res) => {
    const { query } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    if (!query || query.trim().length < 2) {
      throw new ValidationError("Search query must be at least 2 characters.");
    }

    const sanitizedQuery = query.trim().replace(/[$.]/g, "");

    const currentUser = await Users.findById(req.user._id).select(
      "blockedUsers blockedBy"
    );

    const excludedUserIds = [
      req.user._id,
      ...currentUser.blockedUsers,
      ...currentUser.blockedBy,
    ];

    const users = await Users.find({
      $or: [
        { username: { $regex: sanitizedQuery, $options: "i" } },
        { fullname: { $regex: sanitizedQuery, $options: "i" } },
      ],
      role: "user",
      isBlocked: false,
      _id: { $nin: excludedUserIds },
    })
      .select("username avatar fullname bio followers")
      .skip(skip)
      .limit(limit);

    const total = await Users.countDocuments({
      $or: [
        { username: { $regex: sanitizedQuery, $options: "i" } },
        { fullname: { $regex: sanitizedQuery, $options: "i" } },
      ],
      role: "user",
      isBlocked: false,
      _id: { $nin: excludedUserIds },
    });

    res.json({
      query: sanitizedQuery,
      users,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  }),

  recentSearches: asyncHandler(async (req, res) => {
    const Users = require("../models/userModel");
    
    const user = await Users.findById(req.user._id).select("searchHistory");

    const recentSearches = user.searchHistory || [];

    res.json({
      searches: recentSearches.slice(-10).reverse(),
    });
  }),

  clearSearchHistory: asyncHandler(async (req, res) => {
    await Users.findByIdAndUpdate(req.user._id, {
      $set: { searchHistory: [] },
    });

    logger.info("Search history cleared", { userId: req.user._id });

    res.json({ msg: "Search history cleared." });
  }),
};

module.exports = searchCtrl;

