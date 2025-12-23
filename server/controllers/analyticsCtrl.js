// server/controllers/analyticsCtrl.js
const Users = require("../models/userModel");
const Posts = require("../models/postModel");
const Comments = require("../models/commentModel");
const Reports = require("../models/reportModel");
const { asyncHandler } = require("../middleware/errorHandler");
const logger = require("../utils/logger");

const analyticsCtrl = {
  getDashboardStats: asyncHandler(async (req, res) => {
    const [
      totalUsers,
      activeUsers,
      totalPosts,
      totalComments,
      pendingReports,
      blockedUsers,
    ] = await Promise.all([
      Users.countDocuments({ role: "user" }),
      Users.countDocuments({
        role: "user",
        lastActive: {
          $gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      }),
      Posts.countDocuments({ status: "published", isDraft: false }),
      Comments.countDocuments(),
      Reports.countDocuments({ status: "pending" }),
      Users.countDocuments({ isBlocked: true }),
    ]);

    res.json({
      totalUsers,
      activeUsers,
      totalPosts,
      totalComments,
      pendingReports,
      blockedUsers,
      timestamp: new Date(),
    });
  }),

  getUserGrowth: asyncHandler(async (req, res) => {
    const { period } = req.query; // day, week, month, year

    let groupBy;
    let startDate = new Date();

    switch (period) {
      case "day":
        startDate.setDate(startDate.getDate() - 30);
        groupBy = {
          $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
        };
        break;
      case "week":
        startDate.setDate(startDate.getDate() - 90);
        groupBy = {
          $dateToString: { format: "%Y-W%V", date: "$createdAt" },
        };
        break;
      case "month":
        startDate.setFullYear(startDate.getFullYear() - 1);
        groupBy = {
          $dateToString: { format: "%Y-%m", date: "$createdAt" },
        };
        break;
      case "year":
        startDate.setFullYear(startDate.getFullYear() - 5);
        groupBy = {
          $dateToString: { format: "%Y", date: "$createdAt" },
        };
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
        groupBy = {
          $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
        };
    }

    const growth = await Users.aggregate([
      {
        $match: {
          role: "user",
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: groupBy,
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    res.json({
      period: period || "day",
      growth,
    });
  }),

  getEngagementMetrics: asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;

    const start = startDate
      ? new Date(startDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const [postEngagement, commentEngagement, userActivity] =
      await Promise.all([
        Posts.aggregate([
          {
            $match: {
              createdAt: { $gte: start, $lte: end },
              status: "published",
            },
          },
          {
            $group: {
              _id: {
                $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
              },
              totalPosts: { $sum: 1 },
              totalLikes: { $sum: { $size: "$likes" } },
              totalComments: { $sum: { $size: "$comments" } },
              totalShares: { $sum: "$shareCount" },
            },
          },
          {
            $sort: { _id: 1 },
          },
        ]),

        Comments.aggregate([
          {
            $match: {
              createdAt: { $gte: start, $lte: end },
            },
          },
          {
            $group: {
              _id: {
                $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
              },
              totalComments: { $sum: 1 },
              totalLikes: { $sum: { $size: "$likes" } },
            },
          },
          {
            $sort: { _id: 1 },
          },
        ]),

        Users.aggregate([
          {
            $match: {
              lastActive: { $gte: start, $lte: end },
              role: "user",
            },
          },
          {
            $group: {
              _id: {
                $dateToString: { format: "%Y-%m-%d", date: "$lastActive" },
              },
              activeUsers: { $sum: 1 },
            },
          },
          {
            $sort: { _id: 1 },
          },
        ]),
      ]);

    res.json({
      dateRange: { start, end },
      postEngagement,
      commentEngagement,
      userActivity,
    });
  }),

  getContentMetrics: asyncHandler(async (req, res) => {
    const [
      postsByType,
      topHashtags,
      mostEngagedPosts,
      contentModeration,
    ] = await Promise.all([
      Posts.aggregate([
        {
          $match: {
            status: "published",
            isDraft: false,
          },
        },
        {
          $group: {
            _id: {
              $cond: [
                { $eq: [{ $size: "$images" }, 0] },
                "text",
                {
                  $cond: [
                    { $eq: [{ $arrayElemAt: ["$images.type", 0] }, "video"] },
                    "video",
                    "image",
                  ],
                },
              ],
            },
            count: { $sum: 1 },
          },
        },
      ]),

      require("../models/hashtagModel")
        .find()
        .sort("-usageCount")
        .limit(10)
        .select("name usageCount"),

      Posts.aggregate([
        {
          $match: {
            status: "published",
            isDraft: false,
          },
        },
        {
          $addFields: {
            engagementScore: {
              $add: [
                { $size: "$likes" },
                { $multiply: [{ $size: "$comments" }, 2] },
                { $multiply: ["$shareCount", 3] },
              ],
            },
          },
        },
        {
          $sort: { engagementScore: -1 },
        },
        {
          $limit: 10,
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
          $project: {
            _id: 1,
            content: { $substr: ["$content", 0, 100] },
            username: { $arrayElemAt: ["$userInfo.username", 0] },
            engagementScore: 1,
            likes: { $size: "$likes" },
            comments: { $size: "$comments" },
            shares: "$shareCount",
          },
        },
      ]),

      Posts.aggregate([
        {
          $group: {
            _id: "$moderationStatus",
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    res.json({
      postsByType,
      topHashtags,
      mostEngagedPosts,
      contentModeration,
    });
  }),

  getReportAnalytics: asyncHandler(async (req, res) => {
    const [reportsByReason, reportsByStatus, reportsOverTime] =
      await Promise.all([
        Reports.aggregate([
          {
            $group: {
              _id: "$reason",
              count: { $sum: 1 },
            },
          },
          {
            $sort: { count: -1 },
          },
        ]),

        Reports.aggregate([
          {
            $group: {
              _id: "$status",
              count: { $sum: 1 },
            },
          },
        ]),

        Reports.aggregate([
          {
            $match: {
              createdAt: {
                $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
              },
            },
          },
          {
            $group: {
              _id: {
                $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
              },
              count: { $sum: 1 },
              critical: {
                $sum: {
                  $cond: [{ $eq: ["$priority", "critical"] }, 1, 0],
                },
              },
              high: {
                $sum: {
                  $cond: [{ $eq: ["$priority", "high"] }, 1, 0],
                },
              },
            },
          },
          {
            $sort: { _id: 1 },
          },
        ]),
      ]);

    const avgResolutionTime = await Reports.aggregate([
      {
        $match: {
          status: { $in: ["accepted", "declined"] },
          reviewedAt: { $exists: true },
        },
      },
      {
        $project: {
          resolutionTime: {
            $subtract: ["$reviewedAt", "$createdAt"],
          },
        },
      },
      {
        $group: {
          _id: null,
          avgTime: { $avg: "$resolutionTime" },
        },
      },
    ]);

    res.json({
      reportsByReason,
      reportsByStatus,
      reportsOverTime,
      avgResolutionTimeHours: avgResolutionTime[0]
        ? (avgResolutionTime[0].avgTime / (1000 * 60 * 60)).toFixed(2)
        : 0,
    });
  }),

  getUserRetention: asyncHandler(async (req, res) => {
    const cohorts = await Users.aggregate([
      {
        $match: {
          role: "user",
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m", date: "$createdAt" },
          },
          totalUsers: { $sum: 1 },
          activeUsers: {
            $sum: {
              $cond: [
                {
                  $gte: [
                    "$lastActive",
                    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $project: {
          _id: 1,
          totalUsers: 1,
          activeUsers: 1,
          retentionRate: {
            $multiply: [
              { $divide: ["$activeUsers", "$totalUsers"] },
              100,
            ],
          },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    res.json({ cohorts });
  }),

  exportAnalytics: asyncHandler(async (req, res) => {
    const { type } = req.query; // users, posts, reports

    let data;
    let filename;

    switch (type) {
      case "users":
        data = await Users.find({ role: "user" })
          .select("-password")
          .lean();
        filename = `users_export_${Date.now()}.json`;
        break;

      case "posts":
        data = await Posts.find()
          .populate("user", "username email")
          .lean();
        filename = `posts_export_${Date.now()}.json`;
        break;

      case "reports":
        data = await Reports.find()
          .populate("reportedBy", "username email")
          .populate("reviewedBy", "username email")
          .lean();
        filename = `reports_export_${Date.now()}.json`;
        break;

      default:
        data = {
          users: await Users.countDocuments({ role: "user" }),
          posts: await Posts.countDocuments({ status: "published" }),
          reports: await Reports.countDocuments(),
          exportedAt: new Date(),
        };
        filename = `analytics_summary_${Date.now()}.json`;
    }

    const fs = require("fs").promises;
    const path = require("path");
    const filepath = path.join(__dirname, "../temp", filename);

    await fs.mkdir(path.dirname(filepath), { recursive: true });
    await fs.writeFile(filepath, JSON.stringify(data, null, 2));

    logger.audit("Analytics exported", req.user._id, { type });

    res.download(filepath, filename, async (err) => {
      if (!err) {
        try {
          await fs.unlink(filepath);
        } catch (unlinkErr) {}
      }
    });
  }),
};

module.exports = analyticsCtrl;