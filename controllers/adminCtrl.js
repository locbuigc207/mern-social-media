const Posts = require("../models/postModel");
const Users = require("../models/userModel");
const Comments = require("../models/commentModel");
const Reports = require("../models/reportModel");
const Notifies = require("../models/notifyModel");
const logger = require("../utils/logger");
const { asyncHandler } = require("../middleware/errorHandler");
const mongoose = require("mongoose");
const {
  NotFoundError,
  ValidationError,
  AuthorizationError,
} = require("../utils/AppError");
const notificationService = require("../services/notificationService");

const adminCtrl = {
  getTotalUsers: asyncHandler(async (req, res) => {
    const users = await Users.find({ role: "user" });
    const total_users = users.length;

    logger.info("Total users retrieved", {
      total_users,
      adminId: req.user._id,
    });
    res.json({ total_users });
  }),

  getTotalPosts: asyncHandler(async (req, res) => {
    const posts = await Posts.find({
      status: "published",
      isDraft: false,
    });
    const total_posts = posts.length;

    logger.info("Total posts retrieved", {
      total_posts,
      adminId: req.user._id,
    });
    res.json({ total_posts });
  }),

  getTotalComments: asyncHandler(async (req, res) => {
    const comments = await Comments.find();
    const total_comments = comments.length;

    logger.info("Total comments retrieved", {
      total_comments,
      adminId: req.user._id,
    });
    res.json({ total_comments });
  }),

  getTotalLikes: asyncHandler(async (req, res) => {
    const posts = await Posts.find({
      status: "published",
      isDraft: false,
    });
    let total_likes = 0;
    posts.forEach((post) => (total_likes += post.likes.length));

    logger.info("Total likes retrieved", {
      total_likes,
      adminId: req.user._id,
    });
    res.json({ total_likes });
  }),

  getTotalSpamPosts: asyncHandler(async (req, res) => {
    const uniqueReportedPosts = await Reports.distinct("targetId", {
      reportType: "post",
      status: "pending",
    });

    const total_spam_posts = uniqueReportedPosts.length;

    logger.info("Total spam posts retrieved via Reports", {
      total_spam_posts,
      adminId: req.user._id,
    });
    res.json({ total_spam_posts });
  }),

  getSpamPosts: asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const reportedPostsData = await Reports.aggregate([
      { $match: { reportType: "post", status: "pending" } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$targetId",
          count: { $sum: 1 },
          latestReport: { $max: "$createdAt" },
          detailedReports: {
            $push: {
              reason: "$reason",
              description: "$description",
              reportedBy: "$reportedBy",
              createdAt: "$createdAt",
            },
          },
        },
      },
      { $match: { count: { $gt: 0 } } },
      { $sort: { count: -1, latestReport: -1 } },
      { $skip: skip },
      { $limit: limit },
    ]);

    const postIds = reportedPostsData.map((item) => item._id);

    const posts = await Posts.find({ _id: { $in: postIds } })
      .select("user createdAt content images reports")
      .populate("user", "username avatar email fullname");

    const finalPosts = await Promise.all(
      posts.map(async (post) => {
        const reportGroup = reportedPostsData.find(
          (r) => r._id.toString() === post._id.toString()
        );
        const postObj = post.toObject();

        if (reportGroup) {
          postObj.reportCountReal = reportGroup.count;

          const reporterIds = reportGroup.detailedReports.map(
            (d) => d.reportedBy
          );

          const usersInfo = await Users.find({
            _id: { $in: reporterIds },
          }).select("username avatar email");

          postObj.detailedReports = reportGroup.detailedReports.map(
            (detail) => {
              const user = usersInfo.find(
                (u) => u._id.toString() === detail.reportedBy.toString()
              );
              return {
                ...detail,
                reporter: user || { username: "Người dùng ẩn", avatar: "" },
              };
            }
          );

          postObj.reportReasons = [
            ...new Set(postObj.detailedReports.map((d) => d.reason)),
          ];
          postObj.reporters = usersInfo;
        } else {
          postObj.reportCountReal = 0;
          postObj.detailedReports = [];
          postObj.reportReasons = [];
          postObj.reporters = [];
        }

        return postObj;
      })
    );

    const total = await Reports.distinct("targetId", {
      reportType: "post",
      status: "pending",
    });

    res.json({
      spamPosts: finalPosts,
      total: total.length,
      page,
      totalPages: Math.ceil(total.length / limit),
    });
  }),

  getSpamPostDetail: asyncHandler(async (req, res) => {
    const post = await Posts.findById(req.params.id)
      .populate("user", "username avatar email fullname")
      .populate("reports", "username avatar email fullname")
      .populate({
        path: "comments",
        populate: {
          path: "user",
          select: "username avatar",
        },
      });

    if (!post) {
      throw new NotFoundError("Post");
    }

    logger.info("Spam post detail retrieved", {
      postId: req.params.id,
      adminId: req.user._id,
    });

    res.json({ post });
  }),

  deleteSpamPost: asyncHandler(async (req, res) => {
    const post = await Posts.findOneAndDelete({
      _id: req.params.id,
    }).populate("user", "username email fullname");

    if (!post) {
      throw new NotFoundError("Post");
    }

    await Comments.deleteMany({ _id: { $in: post.comments } });

    await notificationService.notifySpamPostDeleted(
      post,
      req.user._id,
      `Bài viết của bạn đã nhận được ${post.reportCount || 0} báo cáo vi phạm`
    );

    const io = notificationService.getIO();
    if (io) {
      io.to(post.user._id.toString()).emit("postDeleted", {
        postId: post._id,
        reason: "spam",
        deletedAt: new Date(),
      });
    }

    logger.audit("Spam post deleted", req.user._id, {
      postId: req.params.id,
      postUserId: post.user._id,
      reportCount: post.reportCount,
    });

    res.json({
      msg: "Post deleted successfully.",
      notificationSent: true,
    });
  }),

  getUsers: asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search || "";
    const role = req.query.role || "user";
    const isVerified = req.query.isVerified;

    let query = { role };

    if (search) {
      query.$or = [
        { username: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { fullname: { $regex: search, $options: "i" } },
      ];
    }

    if (isVerified !== undefined) {
      query.isVerified = isVerified === "true";
    }

    const users = await Users.find(query)
      .select("-password")
      .populate("followers following", "username avatar")
      .sort("-createdAt")
      .skip(skip)
      .limit(limit);

    const total = await Users.countDocuments(query);

    logger.info("Users list retrieved by admin", {
      total,
      page,
      search,
      adminId: req.user._id,
    });

    res.json({
      users,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  }),

  getUserDetail: asyncHandler(async (req, res) => {
    const user = await Users.findById(req.params.id)
      .select("-password")
      .populate("followers following", "username avatar fullname")
      .populate("saved");

    if (!user) {
      throw new NotFoundError("User");
    }

    const userPosts = await Posts.countDocuments({
      user: req.params.id,
      status: "published",
    });

    const userComments = await Comments.countDocuments({
      user: req.params.id,
    });

    logger.info("User detail retrieved by admin", {
      userId: req.params.id,
      adminId: req.user._id,
    });

    res.json({
      user,
      statistics: {
        totalPosts: userPosts,
        totalComments: userComments,
        totalFollowers: user.followers.length,
        totalFollowing: user.following.length,
      },
    });
  }),

  blockUserAccount: asyncHandler(async (req, res) => {
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      throw new ValidationError("Block reason is required.");
    }

    const user = await Users.findById(req.params.id);

    if (!user) {
      throw new NotFoundError("User");
    }

    if (user.role === "admin") {
      throw new AuthorizationError("Cannot block admin accounts.");
    }

    user.isBlocked = true;
    user.blockedReason = reason;
    user.blockedByAdmin = req.user._id;
    user.blockedAt = new Date();
    await user.save();

    await notificationService.notifyAccountBlocked(
      req.params.id,
      req.user._id,
      reason,
      "admin_block"
    );

    const io = notificationService.getIO();
    if (io) {
      io.to(req.params.id).emit("accountBlocked", {
        reason,
        actionTaken: "account_blocked",
        blockedAt: user.blockedAt,
        message: "Your account has been blocked by admin.",
      });

      const sockets = await io.in(req.params.id).fetchSockets();
      for (const socket of sockets) {
        socket.emit("forceLogout", {
          reason: "account_blocked",
          message: "Your account has been blocked.",
        });
        socket.disconnect(true);
      }
    }

    logger.audit("User account blocked", req.user._id, {
      blockedUserId: req.params.id,
      reason,
    });

    res.json({
      msg: "User account blocked successfully.",
      notificationSent: true,
      user: {
        _id: user._id,
        username: user.username,
        isBlocked: user.isBlocked,
      },
    });
  }),

  unblockUserAccount: asyncHandler(async (req, res) => {
    const user = await Users.findById(req.params.id);

    if (!user) {
      throw new NotFoundError("User");
    }

    user.isBlocked = false;
    user.blockedReason = undefined;
    user.blockedByAdmin = undefined;
    user.blockedAt = undefined;
    await user.save();

    await notificationService.notifyAccountUnblocked(
      req.params.id,
      req.user._id,
      "Your account has been unblocked. Welcome back!"
    );

    const io = notificationService.getIO();
    if (io) {
      io.to(req.params.id).emit("accountUnblocked", {
        message: "Your account has been unblocked.",
        unblockedAt: new Date(),
      });
    }

    logger.audit("User account unblocked", req.user._id, {
      unblockedUserId: req.params.id,
    });

    res.json({
      msg: "User account unblocked successfully.",
      notificationSent: true,
      user: {
        _id: user._id,
        username: user.username,
        isBlocked: user.isBlocked,
      },
    });
  }),

  getSiteAnalytics: asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;

    const start = startDate
      ? new Date(startDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const userGrowth = await Users.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          role: "user",
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const postActivity = await Posts.aggregate([
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
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const engagement = await Posts.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          status: "published",
        },
      },
      {
        $project: {
          date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          likes: { $size: "$likes" },
          comments: { $size: "$comments" },
        },
      },
      {
        $group: {
          _id: "$date",
          totalLikes: { $sum: "$likes" },
          totalComments: { $sum: "$comments" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    logger.info("Site analytics retrieved", {
      startDate: start,
      endDate: end,
      adminId: req.user._id,
    });

    res.json({
      userGrowth,
      postActivity,
      engagement,
      dateRange: { start, end },
    });
  }),

  getRecentActivities: asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit) || 20;

    const recentUsers = await Users.find({ role: "user" })
      .select("username avatar email createdAt")
      .sort("-createdAt")
      .limit(limit);

    const recentPosts = await Posts.find({
      status: "published",
      isDraft: false,
    })
      .select("content images user createdAt")
      .populate("user", "username avatar")
      .sort("-createdAt")
      .limit(limit);

    const recentComments = await Comments.find()
      .select("content user postId createdAt")
      .populate("user", "username avatar")
      .sort("-createdAt")
      .limit(limit);

    logger.info("Recent activities retrieved", {
      limit,
      adminId: req.user._id,
    });

    res.json({
      recentUsers,
      recentPosts,
      recentComments,
    });
  }),

  getNotifications: asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const notifications = await Notifies.find()
      .populate("user", "username avatar email")
      .sort("-createdAt")
      .skip(skip)
      .limit(limit);

    const total = await Notifies.countDocuments();

    logger.info("Notifications retrieved by admin", {
      total,
      page,
      adminId: req.user._id,
    });

    res.json({
      notifications,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  }),

  getNotificationDetail: asyncHandler(async (req, res) => {
    const notification = await Notifies.findById(req.params.id)
      .populate("user", "username avatar email fullname")
      .populate("recipients", "username avatar email fullname");

    if (!notification) {
      throw new NotFoundError("Notification");
    }

    logger.info("Notification detail retrieved", {
      notificationId: req.params.id,
      adminId: req.user._id,
    });

    res.json({ notification });
  }),

  getReportedUsers: asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const status = req.query.status || "pending";
    const priority = req.query.priority;

    const query = {
      reportType: "user",
      status: status,
    };

    if (priority) {
      query.priority = priority;
    }

    const reports = await Reports.find(query)
      .populate("reportedBy", "username avatar email")
      .populate("targetId", "username avatar email fullname isBlocked")
      .populate("reviewedBy", "username avatar")
      .sort("-priority -createdAt")
      .skip(skip)
      .limit(limit);

    const total = await Reports.countDocuments(query);

    const userReportsMap = new Map();

    reports.forEach((report) => {
      const userId = report.targetId._id.toString();
      if (!userReportsMap.has(userId)) {
        userReportsMap.set(userId, {
          user: report.targetId,
          reports: [],
          totalReports: 0,
          highestPriority: "low",
        });
      }

      const userReport = userReportsMap.get(userId);
      userReport.reports.push(report);
      userReport.totalReports += 1;

      const priorities = ["low", "medium", "high", "critical"];
      if (
        priorities.indexOf(report.priority) >
        priorities.indexOf(userReport.highestPriority)
      ) {
        userReport.highestPriority = report.priority;
      }
    });

    const reportedUsers = Array.from(userReportsMap.values());

    logger.info("Reported users retrieved", {
      total: reportedUsers.length,
      status,
      priority,
      adminId: req.user._id,
    });

    res.json({
      reportedUsers,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      pendingCount: await Reports.countDocuments({
        reportType: "user",
        status: "pending",
      }),
    });
  }),

  acceptReport: asyncHandler(async (req, res) => {
    const { reportId } = req.params;
    const { actionTaken, adminNote, blockUser, removeContent } = req.body;

    if (!actionTaken) {
      throw new ValidationError("Action taken is required.");
    }

    const validActions = [
      "none",
      "warning",
      "content_removed",
      "account_suspended",
      "account_banned",
    ];

    if (!validActions.includes(actionTaken)) {
      throw new ValidationError(`Invalid action. Must be one of: ${validActions.join(", ")}`);
    }

    if ((actionTaken === "account_suspended" || actionTaken === "account_banned") && blockUser === false) {
      throw new ValidationError(`Action "${actionTaken}" requires blockUser to be true.`);
    }

    const report = await Reports.findById(reportId)
      .populate("targetId")
      .populate("reportedBy", "username email");

    if (!report) {
      throw new NotFoundError("Report");
    }

    if (report.status !== "pending" && report.status !== "reviewing") {
      return res.status(400).json({
        msg: "This report has already been processed.",
        currentStatus: report.status
      });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      await report.accept(req.user._id, actionTaken, adminNote);

      if (report.reportType === "post" && removeContent) {
        const post = await Posts.findById(report.targetId).session(session);
        if (post) {
          post.moderationStatus = "removed";
          post.moderatedBy = req.user._id;
          post.moderatedAt = new Date();
          post.moderationNote = adminNote;
          await post.save({ session });

          if (actionTaken === "content_removed") {
            await Posts.findByIdAndDelete(report.targetId, { session });
            await Comments.deleteMany({ postId: report.targetId }, { session });
          }

          if (post.user.toString() !== req.user._id.toString()) {
            await notificationService.notifyContentRemoved(
              "post",
              report.targetId,
              post.user,
              report.reason,
              adminNote
            );
          }
        }
      }

      if (report.reportType === "comment" && removeContent) {
        const comment = await Comments.findById(report.targetId).session(session);
        if (comment) {
          comment.moderationStatus = "removed";
          await comment.save({ session });

          if (actionTaken === "content_removed") {
            await Comments.findByIdAndDelete(report.targetId, { session });
          }

          if (comment.user.toString() !== req.user._id.toString()) {
            await notificationService.notifyContentRemoved(
              "comment",
              report.targetId,
              comment.user,
              report.reason,
              adminNote
            );
          }
        }
      }

      if (report.reportType === "user") {
        const user = await Users.findById(report.targetId).session(session);
        if (!user) {
          throw new NotFoundError("Target user not found");
        }

        const shouldBlock =
          blockUser === true ||
          actionTaken === "account_suspended" ||
          actionTaken === "account_banned";

        if (shouldBlock) {
          user.isBlocked = true;
          user.blockedReason = adminNote || `Admin action: ${actionTaken}`;
          user.blockedByAdmin = req.user._id;
          user.blockedAt = new Date();
          user.tokenVersion = (user.tokenVersion || 0) + 1;
          await user.save({ session });

          const blockType = actionTaken === "account_banned" 
            ? "permanent_ban" 
            : "admin_block";
          
          await notificationService.notifyAccountBlocked(
            user._id,
            req.user._id,
            user.blockedReason,
            blockType
          );

          const io = notificationService.getIO();
          if (io) {
            io.to(user._id.toString()).emit("accountBlocked", {
              reason: user.blockedReason,
              actionTaken,
              blockedAt: user.blockedAt,
              adminNote: adminNote || "Your account has been blocked due to policy violations.",
            });

            const sockets = await io.in(user._id.toString()).fetchSockets();
            for (const socket of sockets) {
              socket.emit("forceLogout", {
                reason: "account_blocked",
                message: "Your account has been blocked.",
              });
              socket.disconnect(true);
            }
          }
        } else if (actionTaken === "warning") {
          await notificationService.notifyWarning(
            user._id,
            req.user._id,
            adminNote || report.reason,
            report._id
          );
        }
      }

      if (report.reportType !== "message") {
        const bulkResolved = await Reports.updateMany(
          {
            targetId: report.targetId,
            reportType: report.reportType,
            status: "pending",
            _id: { $ne: reportId },
          },
          {
            $set: {
              status: "resolved",
              reviewedBy: req.user._id,
              reviewedAt: new Date(),
              adminNote: `Bulk resolved: ${adminNote || "Related to accepted report"}`,
              isResolved: true,
            },
          },
          { session }
        );

        if (bulkResolved.modifiedCount > 0) {
          const resolvedReports = await Reports.find({
            targetId: report.targetId,
            reportType: report.reportType,
            status: "resolved",
            _id: { $ne: reportId },
          }).select("reportedBy");

          const uniqueReporters = [...new Set(resolvedReports.map(r => r.reportedBy.toString()))];
          
          for (const reporterId of uniqueReporters) {
            await notificationService.notifyReportResolved(
              report._id,
              reporterId,
              req.user._id,
              "Your report has been resolved along with related reports."
            );
          }
        }
      }

      await notificationService.notifyReportAccepted(
        report,
        actionTaken,
        adminNote
      );

      await session.commitTransaction();
      res.json({
        msg: "Report accepted successfully.",
        notificationsSent: true,
        report,
        actionTaken,
        affectedReports: report.reportType !== "message" ? "Multiple" : "Single",
      });

    } catch (error) {
      await session.abortTransaction();
      logger.error("Error accepting report", error, { reportId, adminId: req.user._id });
      throw error;
    } finally {
      session.endSession();
    }
  }),

  declineReport: asyncHandler(async (req, res) => {
    const { reportId } = req.params;
    const { adminNote } = req.body;

    if (!adminNote || !adminNote.trim()) {
      throw new ValidationError("Admin note is required when declining a report.");
    }

    const report = await Reports.findById(reportId).populate("reportedBy", "username email");

    if (!report) {
      throw new NotFoundError("Report");
    }

    if (report.status !== "pending" && report.status !== "reviewing") {
      return res.status(400).json({
        msg: "This report has already been processed.",
        currentStatus: report.status
      });
    }

    await report.decline(req.user._id, adminNote);

    await notificationService.notifyReportDeclined(
      report,
      adminNote
    );

    logger.audit("Report declined", req.user._id, {
      reportId,
      reportType: report.reportType,
      targetId: report.targetId,
    });

    res.json({
      msg: "Report declined successfully.",
      notificationSent: true,
      report,
    });
  }),

  getAllReports: asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const status = req.query.status || "pending";
    const reportType = req.query.reportType;
    const priority = req.query.priority;

    const query = { status };

    if (reportType) {
      query.reportType = reportType;
    }

    if (priority) {
      query.priority = priority;
    }

    let targetPopulateOption = {
      path: "targetId",
      select: "content username email avatar images user fullname isBlocked",
    };

    if (reportType === "post" || reportType === "comment") {
      targetPopulateOption.populate = {
        path: "user",
        select: "username avatar email fullname",
      };
    } else if (!reportType) {
      targetPopulateOption.populate = {
        path: "user",
        select: "username avatar email fullname",
        strictPopulate: false,
      };
    }

    const reports = await Reports.find(query)
      .populate("reportedBy", "username avatar email")
      .populate("reviewedBy", "username avatar")
      .populate(targetPopulateOption)
      .sort("-priority -createdAt")
      .skip(skip)
      .limit(limit);

    const total = await Reports.countDocuments(query);

    const statistics = {
      totalPending: await Reports.countDocuments({ status: "pending" }),
      totalReviewing: await Reports.countDocuments({ status: "reviewing" }),
      totalAccepted: await Reports.countDocuments({ status: "accepted" }),
      totalDeclined: await Reports.countDocuments({ status: "declined" }),
      byType: {
        post: await Reports.countDocuments({ reportType: "post", status: "pending" }),
        comment: await Reports.countDocuments({ reportType: "comment", status: "pending" }),
        user: await Reports.countDocuments({ reportType: "user", status: "pending" }),
      },
      byPriority: {
        critical: await Reports.countDocuments({ priority: "critical", status: "pending" }),
        high: await Reports.countDocuments({ priority: "high", status: "pending" }),
        medium: await Reports.countDocuments({ priority: "medium", status: "pending" }),
        low: await Reports.countDocuments({ priority: "low", status: "pending" }),
      },
    };

    logger.info("All reports retrieved", {
      total,
      status,
      reportType,
      adminId: req.user._id,
    });

    res.json({
      reports,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      statistics,
    });
  }),

  getReportDetails: asyncHandler(async (req, res) => {
    const { reportId } = req.params;

    let report = await Reports.findById(reportId)
      .populate("reportedBy", "username avatar email fullname")
      .populate("reviewedBy", "username avatar email");

    if (!report) {
      throw new NotFoundError("Report");
    }

    if (report.targetModel === "post" || report.targetModel === "comment") {
      await report.populate({
        path: "targetId",
        populate: {
          path: "user",
          select: "username avatar email fullname",
        },
      });
    } else if (report.targetModel === "user") {
      await report.populate({
        path: "targetId",
        select: "username avatar email fullname isBlocked",
      });
    } else if (report.targetModel === "message") {
      await report.populate({
        path: "targetId",
        populate: {
          path: "sender",
          select: "username avatar email",
        },
      });
    }

    const relatedReports = await Reports.find({
      targetId: report.targetId._id,
      reportType: report.reportType,
      _id: { $ne: reportId },
    })
      .populate("reportedBy", "username avatar")
      .sort("-createdAt")
      .limit(10);

    let reporterHistory = [];
    if (report.reportedBy && report.reportedBy._id) {
      reporterHistory = await Reports.find({
        reportedBy: report.reportedBy._id,
      })
        .select("reportType status createdAt description reason")
        .sort("-createdAt")
        .limit(5);
    }

    logger.info("Report details retrieved", {
      reportId,
      adminId: req.user._id,
    });

    res.json({
      report,
      relatedReports,
      reporterHistory,
      statistics: {
        totalRelatedReports: relatedReports.length,
        reporterTotalReports: reporterHistory.length,
      },
    });
  }),

  markReportAsReviewing: asyncHandler(async (req, res) => {
    const { reportId } = req.params;
    const report = await Reports.findById(reportId);

    if (!report) {
      throw new NotFoundError("Report");
    }

    if (report.status !== "pending") {
      return res.status(400).json({
        msg: "Only pending reports can be marked as reviewing.",
        currentStatus: report.status
      });
    }

    await report.markAsReviewing(req.user._id);

    logger.audit("Report marked as reviewing", req.user._id, { reportId });

    res.json({
      msg: "Report marked as reviewing.",
      report,
    });
  }),

  getUserBlockHistory: asyncHandler(async (req, res) => {
    const { userId } = req.params;

    const user = await Users.findById(userId)
      .select("username email blockHistory warnings warningCount")
      .populate("blockHistory.blockedBy", "username email")
      .populate("blockHistory.unblockedBy", "username email")
      .populate("blockHistory.reportId", "reason description")
      .populate("warnings.warnedBy", "username email")
      .populate("warnings.reportId", "reason");

    if (!user) {
      throw new NotFoundError("User");
    }

    res.json({
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
      },
      blockHistory: user.blockHistory,
      warnings: user.warnings,
      warningCount: user.warningCount,
      totalBlocks: user.blockHistory.length,
    });
  }),

  unblockUser: asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { note } = req.body;

    const user = await Users.findById(userId);

    if (!user) {
      throw new NotFoundError("User");
    }

    const blockStatus = user.getBlockStatus();
    
    if (!blockStatus.isBlocked) {
      return res.status(400).json({
        msg: "User is not blocked.",
      });
    }

    await user.unblockUser(req.user._id);

    await Reports.updateMany(
      {
        targetId: userId,
        reportType: "user",
        status: { $in: ["pending", "accepted"] },
      },
      {
        $set: {
          status: "resolved",
          reviewedBy: req.user._id,
          reviewedAt: new Date(),
          adminNote: note || "User unblocked by admin",
        },
      }
    );

    await notificationService.notifyAccountUnblocked(
      userId,
      req.user._id,
      note || "Your account access has been restored."
    );

    const io = notificationService.getIO();
    if (io) {
      io.to(userId).emit("accountUnblocked", {
        message: "Your account has been unblocked.",
        unblockedAt: new Date(),
        note: note,
      });
    }

    logger.audit("User unblocked by admin", req.user._id, {
      targetUserId: userId,
      note,
      previousBlockType: blockStatus.type,
    });

    res.json({
      msg: "User unblocked successfully.",
      notificationSent: true,
      user: {
        _id: user._id,
        username: user.username,
        isBlocked: user.isBlocked,
      },
    });
  }),

  getBlockedUsers: asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const blockType = req.query.blockType;

    let query = { isBlocked: true };

    if (blockType === "banned") {
      query.isBanned = true;
    } else if (blockType === "suspended") {
      query.suspendedUntil = { $exists: true, $gt: new Date() };
    }

    const users = await Users.find(query)
      .select("username email fullname avatar isBlocked isBanned blockedReason blockedAt blockedByAdmin suspendedUntil warningCount")
      .populate("blockedByAdmin", "username email")
      .sort("-blockedAt")
      .skip(skip)
      .limit(limit);

    const total = await Users.countDocuments(query);

    const statistics = {
      totalBlocked: await Users.countDocuments({ isBlocked: true }),
      permanentlyBanned: await Users.countDocuments({ isBanned: true }),
      temporarilySuspended: await Users.countDocuments({
        isBlocked: true,
        suspendedUntil: { $exists: true, $gt: new Date() },
      }),
      expiredSuspensions: await Users.countDocuments({
        isBlocked: true,
        suspendedUntil: { $exists: true, $lt: new Date() },
      }),
    };

    res.json({
      users,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      statistics,
    });
  }),

  getPendingAutoUnblock: asyncHandler(async (req, res) => {
    const users = await Users.find({
      isBlocked: true,
      suspendedUntil: { $exists: true, $lt: new Date() },
    })
      .select("username email blockedReason blockedAt suspendedUntil")
      .sort("suspendedUntil")
      .limit(50);

    res.json({
      users,
      count: users.length,
      message: "These users should be auto-unblocked on next check",
    });
  }),

  triggerAutoUnblockCheck: asyncHandler(async (req, res) => {
    const users = await Users.find({
      isBlocked: true,
      suspendedUntil: { $exists: true, $lt: new Date() },
    });

    let unblockedCount = 0;

    for (const user of users) {
      const wasUnblocked = await user.checkAndUnblockIfExpired();
      if (wasUnblocked) {
        unblockedCount++;
        
        const newNotify = new Notifies({
          recipients: [user._id],
          user: req.user._id,
          type: "follow",
          text: "Your suspension has ended",
          content: "Your account access has been automatically restored.",
          url: "/",
          isRead: false,
        });
        await newNotify.save();
      }
    }

    logger.audit("Manual auto-unblock check triggered", req.user._id, {
      totalChecked: users.length,
      unblockedCount,
    });

    res.json({
      msg: `Auto-unblock check completed. ${unblockedCount} users unblocked.`,
      totalChecked: users.length,
      unblockedCount,
    });
  }),

  updateBlockStatus: asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { action, reason, duration } = req.body;

    const validActions = ["block", "ban", "suspend", "unblock"];
    if (!validActions.includes(action)) {
      throw new ValidationError(`Invalid action. Must be one of: ${validActions.join(", ")}`);
    }

    const user = await Users.findById(userId);
    if (!user) {
      throw new NotFoundError("User");
    }

    if (user.role === "admin") {
      throw new AuthorizationError("Cannot modify admin account status.");
    }

    let actionMessage = "";
    let blockType = "";
    let expiresAt = null;

    switch (action) {
      case "block":
        await user.blockUser(req.user._id, reason, "account_suspended", null);
        actionMessage = "User blocked successfully.";
        blockType = "admin_block";
        break;

      case "ban":
        await user.blockUser(req.user._id, reason, "account_banned", null);
        actionMessage = "User permanently banned.";
        blockType = "permanent_ban";
        break;

      case "suspend":
        if (!duration || duration <= 0) {
          throw new ValidationError("Suspension duration is required (in hours).");
        }
        const durationMs = duration * 60 * 60 * 1000;
        expiresAt = new Date(Date.now() + durationMs);
        await user.blockUser(req.user._id, reason, "account_suspended", null, durationMs);
        actionMessage = `User suspended for ${duration} hours.`;
        blockType = "temporary_suspension";
        break;

      case "unblock":
        await user.unblockUser(req.user._id);
        actionMessage = "User unblocked successfully.";
        
        await notificationService.notifyAccountUnblocked(
          userId,
          req.user._id,
          reason || "Your account has been unblocked."
        );
        break;
    }

    const io = notificationService.getIO();
    
    if (io && action !== "unblock") {
      io.to(userId).emit("accountBlocked", {
        reason: reason,
        actionTaken: action,
        blockedAt: user.blockedAt,
        expiresAt: user.suspendedUntil,
      });

      const sockets = await io.in(userId).fetchSockets();
      for (const socket of sockets) {
        socket.disconnect(true);
      }

      await notificationService.notifyAccountBlocked(
        userId,
        req.user._id,
        reason,
        blockType,
        expiresAt
      );
    }

    logger.audit(`User ${action} action`, req.user._id, {
      targetUserId: userId,
      action,
      reason,
      duration,
    });

    res.json({
      msg: actionMessage,
      notificationSent: action !== "unblock",
      user: {
        _id: user._id,
        username: user.username,
        isBlocked: user.isBlocked,
        isBanned: user.isBanned,
        suspendedUntil: user.suspendedUntil,
      },
    });
  }),
};

module.exports = adminCtrl;