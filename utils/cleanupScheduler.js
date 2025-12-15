const Stories = require("../models/storyModel");
const GroupMessages = require("../models/groupMessageModel");
const Groups = require("../models/groupModel");
const logger = require("./logger");

const cleanupExpiredStories = async () => {
  try {
    const now = new Date();
    
    const result = await Stories.deleteMany({
      isHighlight: false,
      expiresAt: { $lt: now },
      isActive: true
    });

    if (result.deletedCount > 0) {
      logger.info(`🧹 Cleaned up ${result.deletedCount} expired stories`);
    }
  } catch (error) {
    logger.error('Error cleaning up stories', error);
  }
};

const cleanupOldDeletedMessages = async () => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const result = await GroupMessages.deleteMany({
      isDeleted: true,
      updatedAt: { $lt: thirtyDaysAgo }
    });

    if (result.deletedCount > 0) {
      logger.info(`🧹 Cleaned up ${result.deletedCount} old deleted messages`);
    }
  } catch (error) {
    logger.error('Error cleaning up messages', error);
  }
};

const cleanupInactiveGroups = async () => {
  try {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    
    const result = await Groups.updateMany(
      {
        isActive: true,
        'lastMessage.timestamp': { $lt: ninetyDaysAgo },
        'members.2': { $exists: false }
      },
      {
        $set: { isActive: false }
      }
    );

    if (result.modifiedCount > 0) {
      logger.info(`🧹 Marked ${result.modifiedCount} groups as inactive`);
    }
  } catch (error) {
    logger.error('Error cleaning up groups', error);
  }
};

const startCleanupSchedulers = () => {
  logger.info('🧹 Starting cleanup schedulers...');

  const intervals = [];

  intervals.push(setInterval(cleanupExpiredStories, 60 * 60 * 1000));
  
  intervals.push(setInterval(cleanupOldDeletedMessages, 6 * 60 * 60 * 1000));
  
  intervals.push(setInterval(cleanupInactiveGroups, 24 * 60 * 60 * 1000));

  setTimeout(() => {
    cleanupExpiredStories();
    cleanupOldDeletedMessages();
    cleanupInactiveGroups();
  }, 5000);

  const cleanup = () => {
    intervals.forEach(interval => clearInterval(interval));
    logger.info('Cleanup schedulers stopped');
  };

  process.on('SIGTERM', cleanup);
  process.on('SIGINT', cleanup);
};

module.exports = {
  startCleanupSchedulers,
  cleanupExpiredStories,
  cleanupOldDeletedMessages,
  cleanupInactiveGroups
};