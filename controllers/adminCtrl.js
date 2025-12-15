const Posts = require("../models/postModel");
const Users = require("../models/userModel");
const Comments = require("../models/commentModel");
const Notifies = require("../models/notifyModel");
const logger = require("../utils/logger");

const adminCtrl = {
  
  getTotalUsers: async (req, res) => {
    try {
      const users = await Users.find({ role: "user" });
      const total_users = users.length;
      
      logger.info('Total users retrieved', { total_users, adminId: req.user._id });
      res.json({ total_users });
    } catch (err) {
      logger.error('Error getting total users', err, { adminId: req.user._id });
      return res.status(500).json({ msg: err.message });
    }
  },

  getTotalPosts: async (req, res) => {
    try {
      const posts = await Posts.find({ 
        status: 'published',
        isDraft: false 
      });
      const total_posts = posts.length;
      
      logger.info('Total posts retrieved', { total_posts, adminId: req.user._id });
      res.json({ total_posts });
    } catch (err) {
      logger.error('Error getting total posts', err, { adminId: req.user._id });
      return res.status(500).json({ msg: err.message });
    }
  },

  getTotalComments: async (req, res) => {
    try {
      const comments = await Comments.find();
      const total_comments = comments.length;
      
      logger.info('Total comments retrieved', { total_comments, adminId: req.user._id });
      res.json({ total_comments });
    } catch (err) {
      logger.error('Error getting total comments', err, { adminId: req.user._id });
      return res.status(500).json({ msg: err.message });
    }
  },

  getTotalLikes: async (req, res) => {
    try {
      const posts = await Posts.find({ 
        status: 'published',
        isDraft: false 
      });
      let total_likes = 0;
      posts.forEach((post) => (total_likes += post.likes.length));
      
      logger.info('Total likes retrieved', { total_likes, adminId: req.user._id });
      res.json({ total_likes });
    } catch (err) {
      logger.error('Error getting total likes', err, { adminId: req.user._id });
      return res.status(500).json({ msg: err.message });
    }
  },

  getTotalSpamPosts: async (req, res) => {
    try {
      const posts = await Posts.find({
        status: 'published',
        isDraft: false
      });
      
      const SPAM_THRESHOLD = parseInt(process.env.SPAM_THRESHOLD) || 2;
      const reportedPosts = posts.filter(post => post.reports.length > SPAM_THRESHOLD);
      const total_spam_posts = reportedPosts.length;
      
      logger.info('Total spam posts retrieved', { total_spam_posts, adminId: req.user._id });
      res.json({ total_spam_posts });
    } catch (err) {
      logger.error('Error getting total spam posts', err, { adminId: req.user._id });
      return res.status(500).json({ msg: err.message });
    }
  },

  getSpamPosts: async (req, res) => {
    try {
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
    } catch (err) {
      logger.error('Error getting spam posts', err, { adminId: req.user._id });
      return res.status(500).json({ msg: err.message });
    }
  },

  deleteSpamPost: async (req, res) => {
    try {
      const post = await Posts.findOneAndDelete({
        _id: req.params.id,
      });

      if (!post) {
        return res.status(404).json({ msg: "Post not found." });
      }

      await Comments.deleteMany({ _id: { $in: post.comments } });

      logger.audit('Spam post deleted', req.user._id, { 
        postId: req.params.id,
        postUserId: post.user 
      });
      
      res.json({ msg: "Post deleted successfully." });
    } catch (err) {
      logger.error('Error deleting spam post', err, { 
        adminId: req.user._id,
        postId: req.params.id 
      });
      return res.status(500).json({ msg: err.message });
    }
  },


  getNotifications: async (req, res) => {
    try {
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
    } catch (err) {
      logger.error('Error getting notifications', err, { adminId: req.user._id });
      return res.status(500).json({ msg: err.message });
    }
  },

  getNotificationDetail: async (req, res) => {
    try {
      const notification = await Notifies.findById(req.params.id)
        .populate('user', 'username avatar email fullname')
        .populate('recipients', 'username avatar email fullname');

      if (!notification) {
        return res.status(404).json({ msg: "Notification not found." });
      }

      logger.info('Notification detail retrieved', { 
        notificationId: req.params.id,
        adminId: req.user._id 
      });

      res.json({ notification });
    } catch (err) {
      logger.error('Error getting notification detail', err, { 
        adminId: req.user._id,
        notificationId: req.params.id 
      });
      return res.status(500).json({ msg: err.message });
    }
  },

  getUsers: async (req, res) => {
    try {
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
    } catch (err) {
      logger.error('Error getting users', err, { adminId: req.user._id });
      return res.status(500).json({ msg: err.message });
    }
  },

  getUserDetail: async (req, res) => {
    try {
      const user = await Users.findById(req.params.id)
        .select('-password')
        .populate('followers following', 'username avatar fullname')
        .populate('saved');

      if (!user) {
        return res.status(404).json({ msg: "User not found." });
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
    } catch (err) {
      logger.error('Error getting user detail', err, { 
        adminId: req.user._id,
        userId: req.params.id 
      });
      return res.status(500).json({ msg: err.message });
    }
  },

  blockUserAccount: async (req, res) => {
    try {
      const { reason } = req.body;
      
      if (!reason || !reason.trim()) {
        return res.status(400).json({ msg: "Block reason is required." });
      }

      const user = await Users.findById(req.params.id);

      if (!user) {
        return res.status(404).json({ msg: "User not found." });
      }

      if (user.role === 'admin') {
        return res.status(403).json({ msg: "Cannot block admin accounts." });
      }

      user.isBlocked = true;
      user.blockedReason = reason;
      user.blockedBy = req.user._id;
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
    } catch (err) {
      logger.error('Error blocking user', err, { 
        adminId: req.user._id,
        userId: req.params.id 
      });
      return res.status(500).json({ msg: err.message });
    }
  },

  unblockUserAccount: async (req, res) => {
    try {
      const user = await Users.findById(req.params.id);

      if (!user) {
        return res.status(404).json({ msg: "User not found." });
      }

      user.isBlocked = false;
      user.blockedReason = undefined;
      user.blockedBy = undefined;
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
    } catch (err) {
      logger.error('Error unblocking user', err, { 
        adminId: req.user._id,
        userId: req.params.id 
      });
      return res.status(500).json({ msg: err.message });
    }
  },

  getSpamPostDetail: async (req, res) => {
    try {
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
        return res.status(404).json({ msg: "Post not found." });
      }

      logger.info('Spam post detail retrieved', { 
        postId: req.params.id,
        adminId: req.user._id 
      });

      res.json({ post });
    } catch (err) {
      logger.error('Error getting spam post detail', err, { 
        adminId: req.user._id,
        postId: req.params.id 
      });
      return res.status(500).json({ msg: err.message });
    }
  },

  getSiteAnalytics: async (req, res) => {
    try {
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
    } catch (err) {
      logger.error('Error getting site analytics', err, { adminId: req.user._id });
      return res.status(500).json({ msg: err.message });
    }
  },

  getRecentActivities: async (req, res) => {
    try {
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
    } catch (err) {
      logger.error('Error getting recent activities', err, { adminId: req.user._id });
      return res.status(500).json({ msg: err.message });
    }
  }
};

module.exports = adminCtrl;