const Posts = require("../models/postModel");
const Users = require("../models/userModel");
const Comments = require("../models/commentModel");
const Reports = require("../models/reportModel");
const Notifies = require("../models/notifyModel");
const logger = require("../utils/logger");
const { asyncHandler } = require("../middleware/errorHandler");
const { NotFoundError, ValidationError, AuthorizationError } = require("../utils/AppError");

const adminCtrl = {
  getTotalUsers: asyncHandler(async (req, res) => {
    const users = await Users.find({ role: "user" });
    const total_users = users.length;

    logger.info('Total users retrieved', { total_users, adminId: req.user._id });
    res.json({ total_users });
  }),

  getTotalPosts: asyncHandler(async (req, res) => {
    const posts = await Posts.find({
      status: 'published',
      isDraft: false
    });
    const total_posts = posts.length;

    logger.info('Total posts retrieved', { total_posts, adminId: req.user._id });
    res.json({ total_posts });
  }),

  getTotalComments: asyncHandler(async (req, res) => {
    const comments = await Comments.find();
    const total_comments = comments.length;

    logger.info('Total comments retrieved', { total_comments, adminId: req.user._id });
    res.json({ total_comments });
  }),

  getTotalLikes: asyncHandler(async (req, res) => {
    const posts = await Posts.find({
      status: 'published',
      isDraft: false
    });
    let total_likes = 0;
    posts.forEach((post) => (total_likes += post.likes.length));

    logger.info('Total likes retrieved', { total_likes, adminId: req.user._id });
    res.json({ total_likes });
  }),

  getTotalSpamPosts: asyncHandler(async (req, res) => {
    const posts = await Posts.find({
      status: 'published',
      isDraft: false
    });

    const SPAM_THRESHOLD = parseInt(process.env.SPAM_THRESHOLD) || 2;
    const reportedPosts = posts.filter(post => post.reports.length > SPAM_THRESHOLD);
    const total_spam_posts = reportedPosts.length;

    logger.info('Total spam posts retrieved', { total_spam_posts, adminId: req.user._id });
    res.json({ total_spam_posts });
  }),

  getSpamPosts: asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const SPAM_THRESHOLD = parseInt(process.env.SPAM_THRESHOLD) || 2;

    const posts = await Posts.find({
      status: 'published',
      isDraft: false
    })
      .select("user createdAt reports content images")
      .populate({
        path: "user",
        select: "username avatar email fullname"
      })
      .sort('-reports');

    const spamPosts = posts.filter((post) => post.reports.length > SPAM_THRESHOLD);
    const paginatedPosts = spamPosts.slice(skip, skip + limit);

    logger.info('Spam posts retrieved', {
      total: spamPosts.length,
      page,
      adminId: req.user._id
    });

    res.json({
      spamPosts: paginatedPosts,
      total: spamPosts.length,
      page,
      totalPages: Math.ceil(spamPosts.length / limit)
    });
  }),

  getSpamPostDetail: asyncHandler(async (req, res) => {
    const post = await Posts.findById(req.params.id)
      .populate('user', 'username avatar email fullname')
      .populate('reports', 'username avatar email fullname')
      .populate({
        path: 'comments',
        populate: {
          path: 'user',
          select: 'username avatar'
        }
      });

    if (!post) {
      throw new NotFoundError("Post");
    }

    logger.info('Spam post detail retrieved', {
      postId: req.params.id,
      adminId: req.user._id
    });

    res.json({ post });
  }),

  deleteSpamPost: asyncHandler(async (req, res) => {
    const post = await Posts.findOneAndDelete({
      _id: req.params.id,
    });

    if (!post) {
      throw new NotFoundError("Post");
    }

    await Comments.deleteMany({ _id: { $in: post.comments } });

    logger.audit('Spam post deleted', req.user._id, {
      postId: req.params.id,
      postUserId: post.user
    });

    res.json({ msg: "Post deleted successfully." });
  }),

  getUsers: asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const role = req.query.role || 'user';
    const isVerified = req.query.isVerified;

    let query = { role };

    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { fullname: { $regex: search, $options: 'i' } }
      ];
    }

    if (isVerified !== undefined) {
      query.isVerified = isVerified === 'true';
    }

    const users = await Users.find(query)
      .select('-password')
      .populate('followers following', 'username avatar')
      .sort('-createdAt')
      .skip(skip)
      .limit(limit);

    const total = await Users.countDocuments(query);

    logger.info('Users list retrieved by admin', {
      total,
      page,
      search,
      adminId: req.user._id
    });

    res.json({
      users,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  }),

  getUserDetail: asyncHandler(async (req, res) => {
    const user = await Users.findById(req.params.id)
      .select('-password')
      .populate('followers following', 'username avatar fullname')
      .populate('saved');

    if (!user) {
      throw new NotFoundError("User");
    }

    const userPosts = await Posts.countDocuments({
      user: req.params.id,
      status: 'published'
    });

    const userComments = await Comments.countDocuments({
      user: req.params.id
    });

    logger.info('User detail retrieved by admin', {
      userId: req.params.id,
      adminId: req.user._id
    });

    res.json({
      user,
      statistics: {
        totalPosts: userPosts,
        totalComments: userComments,
        totalFollowers: user.followers.length,
        totalFollowing: user.following.length
      }
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

    if (user.role === 'admin') {
      throw new AuthorizationError("Cannot block admin accounts.");
    }

    user.isBlocked = true;
    user.blockedReason = reason;
    user.blockedByAdmin = req.user._id;
    user.blockedAt = new Date();
    await user.save();

    logger.audit('User account blocked', req.user._id, {
      blockedUserId: req.params.id,
      reason
    });

    res.json({
      msg: "User account blocked successfully.",
      user: {
        _id: user._id,
        username: user.username,
        isBlocked: user.isBlocked
      }
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

    logger.audit('User account unblocked', req.user._id, {
      unblockedUserId: req.params.id
    });

    res.json({
      msg: "User account unblocked successfully.",
      user: {
        _id: user._id,
        username: user.username,
        isBlocked: user.isBlocked
      }
    });
  }),

  getSiteAnalytics: asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const userGrowth = await Users.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          role: 'user'
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const postActivity = await Posts.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          status: 'published'
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const engagement = await Posts.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          status: 'published'
        }
      },
      {
        $project: {
          date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          likes: { $size: "$likes" },
          comments: { $size: "$comments" }
        }
      },
      {
        $group: {
          _id: "$date",
          totalLikes: { $sum: "$likes" },
          totalComments: { $sum: "$comments" }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    logger.info('Site analytics retrieved', {
      startDate: start,
      endDate: end,
      adminId: req.user._id
    });

    res.json({
      userGrowth,
      postActivity,
      engagement,
      dateRange: { start, end }
    });
  }),

  getRecentActivities: asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit) || 20;

    const recentUsers = await Users.find({ role: 'user' })
      .select('username avatar email createdAt')
      .sort('-createdAt')
      .limit(limit);

    const recentPosts = await Posts.find({
      status: 'published',
      isDraft: false
    })
      .select('content images user createdAt')
      .populate('user', 'username avatar')
      .sort('-createdAt')
      .limit(limit);

    const recentComments = await Comments.find()
      .select('content user postId createdAt')
      .populate('user', 'username avatar')
      .sort('-createdAt')
      .limit(limit);

    logger.info('Recent activities retrieved', {
      limit,
      adminId: req.user._id
    });

    res.json({
      recentUsers,
      recentPosts,
      recentComments
    });
  }),

  getNotifications: asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const notifications = await Notifies.find()
      .populate('user', 'username avatar email')
      .sort('-createdAt')
      .skip(skip)
      .limit(limit);

    const total = await Notifies.countDocuments();

    logger.info('Notifications retrieved by admin', {
      total,
      page,
      adminId: req.user._id
    });

    res.json({
      notifications,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  }),

  getNotificationDetail: asyncHandler(async (req, res) => {
    const notification = await Notifies.findById(req.params.id)
      .populate('user', 'username avatar email fullname')
      .populate('recipients', 'username avatar email fullname');

    if (!notification) {
      throw new NotFoundError("Notification");
    }

    logger.info('Notification detail retrieved', {
      notificationId: req.params.id,
      adminId: req.user._id
    });

    res.json({ notification });
  }),

  getReportedUsers: asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const status = req.query.status || 'pending';
    const priority = req.query.priority;

    const query = {
      reportType: 'user',
      status: status
    };

    if (priority) {
      query.priority = priority;
    }

    const reports = await Reports.find(query)
      .populate('reportedBy', 'username avatar email')
      .populate('targetId', 'username avatar email fullname isBlocked')
      .populate('reviewedBy', 'username avatar')
      .sort('-priority -createdAt')
      .skip(skip)
      .limit(limit);

    const total = await Reports.countDocuments(query);

    const userReportsMap = new Map();

    reports.forEach(report => {
      const userId = report.targetId._id.toString();
      if (!userReportsMap.has(userId)) {
        userReportsMap.set(userId, {
          user: report.targetId,
          reports: [],
          totalReports: 0,
          highestPriority: 'low'
        });
      }

      const userReport = userReportsMap.get(userId);
      userReport.reports.push(report);
      userReport.totalReports += 1;

      const priorities = ['low', 'medium', 'high', 'critical'];
      if (priorities.indexOf(report.priority) > priorities.indexOf(userReport.highestPriority)) {
        userReport.highestPriority = report.priority;
      }
    });

    const reportedUsers = Array.from(userReportsMap.values());

    logger.info('Reported users retrieved', {
      total: reportedUsers.length,
      status,
      priority,
      adminId: req.user._id
    });

    res.json({
      reportedUsers,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      pendingCount: await Reports.countDocuments({
        reportType: 'user',
        status: 'pending'
      })
    });
  }),

  acceptReport: asyncHandler(async (req, res) => {
    const { reportId } = req.params;
    const { actionTaken, adminNote, blockUser, removeContent } = req.body;

    if (!actionTaken) {
      throw new ValidationError("Action taken is required.");
    }

    const report = await Reports.findById(reportId)
      .populate('targetId')
      .populate('reportedBy', 'username email');

    if (!report) {
      throw new NotFoundError("Report");
    }

    if (report.status !== 'pending' && report.status !== 'reviewing') {
      return res.status(400).json({ msg: "This report has already been processed." });
    }

    await report.accept(req.user._id, actionTaken, adminNote);

    if (report.reportType === 'post' && removeContent) {
      const post = await Posts.findById(report.targetId);
      if (post) {
        post.moderationStatus = 'removed';
        post.moderatedBy = req.user._id;
        post.moderatedAt = new Date();
        post.moderationNote = adminNote;
        await post.save();

        if (actionTaken === 'content_removed') {
          await Posts.findByIdAndDelete(report.targetId);
          await Comments.deleteMany({ postId: report.targetId });
        }
      }
    }

    if (report.reportType === 'comment' && removeContent) {
      const comment = await Comments.findById(report.targetId);
      if (comment) {
        comment.moderationStatus = 'removed';
        await comment.save();

        if (actionTaken === 'content_removed') {
          await Comments.findByIdAndDelete(report.targetId);
        }
      }
    }

    if (report.reportType === 'user' && blockUser) {
      const user = await Users.findById(report.targetId);
      if (user) {
        user.isBlocked = true;
        user.blockedReason = adminNote || 'Multiple reports received';
        user.blockedByAdmin = req.user._id;
        user.blockedAt = new Date();
        await user.save();
      }
    }

    if (report.reportType !== 'message') {
      await Reports.updateMany(
        {
          targetId: report.targetId,
          reportType: report.reportType,
          status: 'pending'
        },
        {
          $set: {
            status: 'resolved',
            reviewedBy: req.user._id,
            reviewedAt: new Date(),
            adminNote: `Bulk resolved: ${adminNote}`,
            isResolved: true
          }
        }
      );
    }

    logger.audit('Report accepted', req.user._id, {
      reportId,
      reportType: report.reportType,
      targetId: report.targetId,
      actionTaken
    });

    res.json({
      msg: "Report accepted successfully.",
      report,
      actionTaken
    });
  }),

  declineReport: asyncHandler(async (req, res) => {
    const { reportId } = req.params;
    const { adminNote } = req.body;

    if (!adminNote || !adminNote.trim()) {
      throw new ValidationError("Admin note is required when declining a report.");
    }

    const report = await Reports.findById(reportId)
      .populate('reportedBy', 'username email');

    if (!report) {
      throw new NotFoundError("Report");
    }

    if (report.status !== 'pending' && report.status !== 'reviewing') {
      return res.status(400).json({ msg: "This report has already been processed." });
    }

    await report.decline(req.user._id, adminNote);

    logger.audit('Report declined', req.user._id, {
      reportId,
      reportType: report.reportType,
      targetId: report.targetId
    });

    res.json({
      msg: "Report declined successfully.",
      report
    });
  }),

  getAllReports: asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const status = req.query.status || 'pending';
    const reportType = req.query.reportType;
    const priority = req.query.priority;

    const query = { status };

    if (reportType) {
      query.reportType = reportType;
    }

    if (priority) {
      query.priority = priority;
    }

    const reports = await Reports.find(query)
      .populate('reportedBy', 'username avatar email')
      .populate('reviewedBy', 'username avatar')
      .populate({
        path: 'targetId',
        select: 'content username email avatar images user'
      })
      .sort('-priority -createdAt')
      .skip(skip)
      .limit(limit);

    const total = await Reports.countDocuments(query);

    const statistics = {
      totalPending: await Reports.countDocuments({ status: 'pending' }),
      totalReviewing: await Reports.countDocuments({ status: 'reviewing' }),
      totalAccepted: await Reports.countDocuments({ status: 'accepted' }),
      totalDeclined: await Reports.countDocuments({ status: 'declined' }),
      byType: {
        post: await Reports.countDocuments({ reportType: 'post', status: 'pending' }),
        comment: await Reports.countDocuments({ reportType: 'comment', status: 'pending' }),
        user: await Reports.countDocuments({ reportType: 'user', status: 'pending' })
      },
      byPriority: {
        critical: await Reports.countDocuments({ priority: 'critical', status: 'pending' }),
        high: await Reports.countDocuments({ priority: 'high', status: 'pending' }),
        medium: await Reports.countDocuments({ priority: 'medium', status: 'pending' }),
        low: await Reports.countDocuments({ priority: 'low', status: 'pending' })
      }
    };

    logger.info('All reports retrieved', {
      total,
      status,
      reportType,
      adminId: req.user._id
    });

    res.json({
      reports,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      statistics
    });
  }),

  getReportDetails: asyncHandler(async (req, res) => {
    const { reportId } = req.params;

    const report = await Reports.findById(reportId)
      .populate('reportedBy', 'username avatar email fullname')
      .populate('reviewedBy', 'username avatar email')
      .populate({
        path: 'targetId',
        populate: {
          path: 'user',
          select: 'username avatar email fullname'
        }
      });

    if (!report) {
      throw new NotFoundError("Report");
    }

    const relatedReports = await Reports.find({
      targetId: report.targetId,
      reportType: report.reportType,
      _id: { $ne: reportId }
    })
      .populate('reportedBy', 'username avatar')
      .sort('-createdAt')
      .limit(10);

    const reporterHistory = await Reports.find({
      reportedBy: report.reportedBy._id
    })
      .select('reportType status createdAt')
      .sort('-createdAt')
      .limit(5);

    logger.info('Report details retrieved', {
      reportId,
      adminId: req.user._id
    });

    res.json({
      report,
      relatedReports,
      reporterHistory,
      statistics: {
        totalRelatedReports: relatedReports.length,
        reporterTotalReports: reporterHistory.length
      }
    });
  }),

  markReportAsReviewing: asyncHandler(async (req, res) => {
    const { reportId } = req.params;

    const report = await Reports.findById(reportId);

    if (!report) {
      throw new NotFoundError("Report");
    }

    if (report.status !== 'pending') {
      return res.status(400).json({ msg: "Only pending reports can be marked as reviewing." });
    }

    await report.markAsReviewing(req.user._id);

    logger.audit('Report marked as reviewing', req.user._id, { reportId });

    res.json({
      msg: "Report marked as reviewing.",
      report
    });
  })
};

module.exports = adminCtrl;