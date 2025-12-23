// server/services/discoveryService.js
const Posts = require("../models/postModel");
const Users = require("../models/userModel");
const logger = require("../utils/logger");

class DiscoveryService {
  async getPersonalizedFeed(userId, options = {}) {
    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    try {
      const user = await Users.findById(userId).select(
        "following blockedUsers blockedBy"
      );

      const excludedUserIds = [
        ...user.blockedUsers,
        ...user.blockedBy,
      ];

      // Get user's interests based on engagement
      const userEngagement = await this.getUserEngagement(userId);

      // Calculate scores for posts
      const posts = await Posts.aggregate([
        {
          $match: {
            status: "published",
            isDraft: false,
            moderationStatus: { $ne: "removed" },
            user: { $nin: excludedUserIds },
            createdAt: {
              $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
            },
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "user",
            foreignField: "_id",
            as: "userInfo",
          },
        },
        {
          $unwind: "$userInfo",
        },
        {
          $addFields: {
            // Calculate engagement score
            engagementScore: {
              $add: [
                { $multiply: [{ $size: "$likes" }, 1] },
                { $multiply: [{ $size: "$comments" }, 3] },
                { $multiply: ["$shareCount", 5] },
              ],
            },
            // Recency score (newer = higher)
            recencyScore: {
              $divide: [
                {
                  $subtract: [
                    new Date(),
                    "$createdAt",
                  ],
                },
                1000 * 60 * 60, // Convert to hours
              ],
            },
            // Following bonus
            followingBonus: {
              $cond: [
                { $in: ["$user", user.following] },
                50,
                0,
              ],
            },
          },
        },
        {
          $addFields: {
            // Final discovery score
            discoveryScore: {
              $add: [
                "$engagementScore",
                { $multiply: [{ $subtract: [168, "$recencyScore"] }, 0.5] }, // 168 hours = 7 days
                "$followingBonus",
              ],
            },
          },
        },
        {
          $sort: { discoveryScore: -1 },
        },
        {
          $skip: skip,
        },
        {
          $limit: limit,
        },
        {
          $lookup: {
            from: "comments",
            localField: "_id",
            foreignField: "postId",
            as: "commentDetails",
          },
        },
        {
          $project: {
            _id: 1,
            content: 1,
            images: 1,
            user: "$userInfo._id",
            username: "$userInfo.username",
            avatar: "$userInfo.avatar",
            fullname: "$userInfo.fullname",
            likes: 1,
            comments: "$commentDetails",
            shareCount: 1,
            createdAt: 1,
            discoveryScore: 1,
          },
        },
      ]);

      logger.info("Personalized feed generated", {
        userId,
        postsCount: posts.length,
        page,
      });

      return posts;
    } catch (error) {
      logger.error("Error generating personalized feed", error);
      throw error;
    }
  }

  async getUserEngagement(userId) {
    // Get user's recent likes, comments, shares
    const recentActivity = await Posts.aggregate([
      {
        $match: {
          $or: [
            { likes: userId },
            { "comments.user": userId },
          ],
          createdAt: {
            $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          },
        },
      },
      {
        $group: {
          _id: null,
          totalLikes: {
            $sum: {
              $cond: [{ $in: [userId, "$likes"] }, 1, 0],
            },
          },
          totalComments: {
            $sum: {
              $size: {
                $filter: {
                  input: "$comments",
                  as: "comment",
                  cond: { $eq: ["$$comment.user", userId] },
                },
              },
            },
          },
        },
      },
    ]);

    return recentActivity[0] || { totalLikes: 0, totalComments: 0 };
  }

  async getTrendingPosts(options = {}) {
    const { limit = 20, timeRange = 24 } = options;

    const cutoffTime = new Date(
      Date.now() - timeRange * 60 * 60 * 1000
    );

    const trendingPosts = await Posts.aggregate([
      {
        $match: {
          status: "published",
          isDraft: false,
          moderationStatus: { $ne: "removed" },
          createdAt: { $gte: cutoffTime },
        },
      },
      {
        $addFields: {
          trendingScore: {
            $add: [
              { $multiply: [{ $size: "$likes" }, 1] },
              { $multiply: [{ $size: "$comments" }, 2] },
              { $multiply: ["$shareCount", 3] },
            ],
          },
        },
      },
      {
        $sort: { trendingScore: -1 },
      },
      {
        $limit: limit,
      },
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "userInfo",
        },
      },
      {
        $unwind: "$userInfo",
      },
      {
        $project: {
          _id: 1,
          content: 1,
          images: 1,
          user: "$userInfo._id",
          username: "$userInfo.username",
          avatar: "$userInfo.avatar",
          fullname: "$userInfo.fullname",
          likes: 1,
          comments: 1,
          shareCount: 1,
          createdAt: 1,
          trendingScore: 1,
        },
      },
    ]);

    return trendingPosts;
  }
}

const discoveryService = new DiscoveryService();
module.exports = discoveryService;
