const Stories = require("../models/storyModel");
const GroupMessages = require("../models/groupMessageModel");

// Cleanup expired stories (backup to TTL index)
const cleanupExpiredStories = async () => {
  try {
    const now = new Date();
    
    const result = await Stories.deleteMany({
      isHighlight: false,
      expiresAt: { $lt: now },
      isActive: true
    });

    if (result.deletedCount > 0) {
      console.log(`🧹 Cleaned up ${result.deletedCount} expired stories`);
    }
  } catch (error) {
    console.error('Error cleaning up stories:', error);
  }
};

// Cleanup old deleted messages (after 30 days)
const cleanupOldDeletedMessages = async () => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const result = await GroupMessages.deleteMany({
      isDeleted: true,
      updatedAt: { $lt: thirtyDaysAgo }
    });

    if (result.deletedCount > 0) {
      console.log(`🧹 Cleaned up ${result.deletedCount} old deleted messages`);
    }
  } catch (error) {
    console.error('Error cleaning up messages:', error);
  }
};

// Cleanup inactive groups (no messages for 90 days)
const cleanupInactiveGroups = async () => {
  try {
    const Groups = require("../models/groupModel");
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    
    const result = await Groups.updateMany(
      {
        isActive: true,
        'lastMessage.timestamp': { $lt: ninetyDaysAgo },
        'members.2': { $exists: false } // Less than 2 members
      },
      {
        $set: { isActive: false }
      }
    );

    if (result.modifiedCount > 0) {
      console.log(`🧹 Marked ${result.modifiedCount} groups as inactive`);
    }
  } catch (error) {
    console.error('Error cleaning up groups:', error);
  }
};

// Start all cleanup schedulers
const startCleanupSchedulers = () => {
  console.log('🧹 Starting cleanup schedulers...');

  // Run cleanup every hour
  setInterval(cleanupExpiredStories, 60 * 60 * 1000);
  
  // Run cleanup every 6 hours
  setInterval(cleanupOldDeletedMessages, 6 * 60 * 60 * 1000);
  
  // Run cleanup every 24 hours
  setInterval(cleanupInactiveGroups, 24 * 60 * 60 * 1000);

  // Run immediately on startup
  setTimeout(() => {
    cleanupExpiredStories();
    cleanupOldDeletedMessages();
    cleanupInactiveGroups();
  }, 5000); // 5 seconds after startup
};

module.exports = {
  startCleanupSchedulers,
  cleanupExpiredStories,
  cleanupOldDeletedMessages,
  cleanupInactiveGroups
};