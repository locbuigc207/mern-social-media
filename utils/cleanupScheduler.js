const cron = require("node-cron");
const Story = require("../models/storyModel");
const Message = require("../models/messageModel");
const Group = require("../models/groupModel");
const logger = require("./logger");

const intervals = [];

// Clean up expired stories (run every hour)
const cleanupExpiredStories = cron.schedule("0 * * * *", async () => {
  try {
    logger.info("Starting expired stories cleanup...");

    const result = await Story.deleteMany({
      expiresAt: { $lt: new Date() },
      isActive: true,
    });

    if (result.deletedCount > 0) {
      logger.info(`Cleaned up ${result.deletedCount} expired stories`);
    }
  } catch (error) {
    logger.error("Error cleaning up expired stories:", error);
  }
});

// Clean up old deleted messages (run daily at 2 AM)
const cleanupOldDeletedMessages = cron.schedule("0 2 * * *", async () => {
  try {
    logger.info("Starting old deleted messages cleanup...");

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Delete messages that have been soft-deleted by both users for more than 30 days
    const result = await Message.deleteMany({
      $expr: { $gte: [{ $size: "$deletedFor" }, 2] },
      updatedAt: { $lt: thirtyDaysAgo }
    });

    if (result.deletedCount > 0) {
      logger.info(`Cleaned up ${result.deletedCount} old deleted messages`);
    }
  } catch (error) {
    logger.error("Error cleaning up old deleted messages:", error);
  }
});

// Clean up inactive groups (run weekly on Sunday at 3 AM)
const cleanupInactiveGroups = cron.schedule("0 3 * * 0", async () => {
  try {
    logger.info("Starting inactive groups cleanup...");

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // Find groups with no activity for 6 months
    const result = await Group.updateMany(
      {
        updatedAt: { $lt: sixMonthsAgo },
        isActive: true,
      },
      {
        $set: { isActive: false }
      }
    );

    if (result.modifiedCount > 0) {
      logger.info(`Marked ${result.modifiedCount} groups as inactive`);
    }
  } catch (error) {
    logger.error("Error cleaning up inactive groups:", error);
  }
});

// Clean up old notifications (run daily at 3 AM)
const cleanupOldNotifications = cron.schedule("0 3 * * *", async () => {
  try {
    logger.info("Starting old notifications cleanup...");

    const Notify = require("../models/notifyModel");
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const result = await Notify.deleteMany({
      createdAt: { $lt: ninetyDaysAgo },
      isRead: true
    });

    if (result.deletedCount > 0) {
      logger.info(`Cleaned up ${result.deletedCount} old notifications`);
    }
  } catch (error) {
    logger.error("Error cleaning up old notifications:", error);
  }
});

// Clean up expired password reset tokens (run every 6 hours)
const cleanupExpiredTokens = cron.schedule("0 */6 * * *", async () => {
  try {
    logger.info("Starting expired tokens cleanup...");

    const User = require("../models/userModel");
    
    const result = await User.updateMany(
      {
        resetPasswordExpires: { $lt: new Date() },
        resetPasswordToken: { $exists: true, $ne: null }
      },
      {
        $unset: {
          resetPasswordToken: "",
          resetPasswordExpires: "",
          resetAttempts: ""
        }
      }
    );

    if (result.modifiedCount > 0) {
      logger.info(`Cleaned up ${result.modifiedCount} expired tokens`);
    }
  } catch (error) {
    logger.error("Error cleaning up expired tokens:", error);
  }
});

// Clean up old reports (run weekly on Monday at 4 AM)
const cleanupOldReports = cron.schedule("0 4 * * 1", async () => {
  try {
    logger.info("Starting old reports cleanup...");

    const Report = require("../models/reportModel");
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    // Archive old resolved/declined reports
    const result = await Report.deleteMany({
      createdAt: { $lt: oneYearAgo },
      status: { $in: ['resolved', 'declined'] }
    });

    if (result.deletedCount > 0) {
      logger.info(`Cleaned up ${result.deletedCount} old reports`);
    }
  } catch (error) {
    logger.error("Error cleaning up old reports:", error);
  }
});

// Clean up orphaned comments (run daily at 4 AM)
const cleanupOrphanedComments = cron.schedule("0 4 * * *", async () => {
  try {
    logger.info("Starting orphaned comments cleanup...");

    const Comment = require("../models/commentModel");
    const Post = require("../models/postModel");

    // Find all comments
    const comments = await Comment.find().select('postId');
    const commentPostIds = comments.map(c => c.postId.toString());

    // Find all posts
    const posts = await Post.find().select('_id');
    const postIds = new Set(posts.map(p => p._id.toString()));

    // Find orphaned comments (comments for posts that don't exist)
    const orphanedCommentIds = comments
      .filter(c => !postIds.has(c.postId.toString()))
      .map(c => c._id);

    if (orphanedCommentIds.length > 0) {
      const result = await Comment.deleteMany({
        _id: { $in: orphanedCommentIds }
      });

      logger.info(`Cleaned up ${result.deletedCount} orphaned comments`);
    }
  } catch (error) {
    logger.error("Error cleaning up orphaned comments:", error);
  }
});

// Clean up temporary files (run daily at 5 AM)
const cleanupTempFiles = cron.schedule("0 5 * * *", async () => {
  try {
    logger.info("Starting temporary files cleanup...");

    const fs = require('fs').promises;
    const path = require('path');
    const tempDir = path.join(__dirname, '..', 'temp');

    try {
      const files = await fs.readdir(tempDir);
      const now = Date.now();
      const oneDay = 24 * 60 * 60 * 1000;
      let deletedCount = 0;

      for (const file of files) {
        const filePath = path.join(tempDir, file);
        const stats = await fs.stat(filePath);

        // Delete files older than 1 day
        if (now - stats.mtimeMs > oneDay) {
          await fs.unlink(filePath);
          deletedCount++;
        }
      }

      if (deletedCount > 0) {
        logger.info(`Cleaned up ${deletedCount} temporary files`);
      }
    } catch (err) {
      if (err.code !== 'ENOENT') {
        throw err;
      }
    }
  } catch (error) {
    logger.error("Error cleaning up temporary files:", error);
  }
});

// Clean up database sessions (run every 12 hours)
const cleanupDatabaseSessions = cron.schedule("0 */12 * * *", async () => {
  try {
    logger.info("Starting database sessions cleanup...");

    const mongoose = require('mongoose');
    
    // Kill long-running queries (optional, be careful with this)
    if (process.env.CLEANUP_LONG_QUERIES === 'true') {
      const admin = mongoose.connection.db.admin();
      const currentOps = await admin.command({ currentOp: 1 });
      
      let killedCount = 0;
      for (const op of currentOps.inprog) {
        if (op.secs_running > 300) { // 5 minutes
          try {
            await admin.command({ killOp: 1, op: op.opid });
            killedCount++;
          } catch (err) {
            logger.error('Error killing operation:', err);
          }
        }
      }

      if (killedCount > 0) {
        logger.info(`Killed ${killedCount} long-running queries`);
      }
    }
  } catch (error) {
    logger.error("Error cleaning up database sessions:", error);
  }
});

// Database optimization (run weekly on Sunday at 5 AM)
const optimizeDatabase = cron.schedule("0 5 * * 0", async () => {
  try {
    logger.info("Starting database optimization...");

    const mongoose = require('mongoose');
    const collections = await mongoose.connection.db.listCollections().toArray();

    for (const collection of collections) {
      try {
        await mongoose.connection.db.command({
          compact: collection.name,
          force: true
        });
        logger.info(`Optimized collection: ${collection.name}`);
      } catch (err) {
        // Some collections might not support compact
        logger.debug(`Could not compact ${collection.name}:`, err.message);
      }
    }

    logger.info("Database optimization completed");
  } catch (error) {
    logger.error("Error optimizing database:", error);
  }
});

// Start all cleanup schedulers
const startCleanupSchedulers = () => {
  try {
    cleanupExpiredStories.start();
    cleanupOldDeletedMessages.start();
    cleanupInactiveGroups.start();
    cleanupOldNotifications.start();
    cleanupExpiredTokens.start();
    cleanupOldReports.start();
    cleanupOrphanedComments.start();
    cleanupTempFiles.start();
    cleanupDatabaseSessions.start();
    
    if (process.env.ENABLE_DB_OPTIMIZATION === 'true') {
      optimizeDatabase.start();
    }

    logger.info("All cleanup schedulers started successfully");
  } catch (error) {
    logger.error("Error starting cleanup schedulers:", error);
  }
};

// Stop all cleanup schedulers
const stopCleanupSchedulers = () => {
  try {
    cleanupExpiredStories.stop();
    cleanupOldDeletedMessages.stop();
    cleanupInactiveGroups.stop();
    cleanupOldNotifications.stop();
    cleanupExpiredTokens.stop();
    cleanupOldReports.stop();
    cleanupOrphanedComments.stop();
    cleanupTempFiles.stop();
    cleanupDatabaseSessions.stop();
    optimizeDatabase.stop();

    logger.info("All cleanup schedulers stopped");
  } catch (error) {
    logger.error("Error stopping cleanup schedulers:", error);
  }
};

// Get scheduler status
const getSchedulerStatus = () => {
  return {
    expiredStories: cleanupExpiredStories.getStatus(),
    oldDeletedMessages: cleanupOldDeletedMessages.getStatus(),
    inactiveGroups: cleanupInactiveGroups.getStatus(),
    oldNotifications: cleanupOldNotifications.getStatus(),
    expiredTokens: cleanupExpiredTokens.getStatus(),
    oldReports: cleanupOldReports.getStatus(),
    orphanedComments: cleanupOrphanedComments.getStatus(),
    tempFiles: cleanupTempFiles.getStatus(),
    databaseSessions: cleanupDatabaseSessions.getStatus(),
    databaseOptimization: optimizeDatabase.getStatus()
  };
};

module.exports = {
  startCleanupSchedulers,
  stopCleanupSchedulers,
  getSchedulerStatus,
  cleanupExpiredStories,
  cleanupOldDeletedMessages,
  cleanupInactiveGroups,
  cleanupOldNotifications,
  cleanupExpiredTokens,
  cleanupOldReports,
  cleanupOrphanedComments,
  cleanupTempFiles,
  cleanupDatabaseSessions,
  optimizeDatabase
};