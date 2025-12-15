const Posts = require("../models/postModel");
const logger = require("./logger");

const checkScheduledPosts = async () => {
  try {
    const now = new Date();

    const scheduledPosts = await Posts.find({
      status: 'scheduled',
      scheduledDate: { $lte: now }
    }).populate('user', 'followers');

    if (scheduledPosts.length === 0) {
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const post of scheduledPosts) {
      try {
        post.status = 'published';
        post.isDraft = false;
        post.publishedAt = now;
        await post.save();
        
        successCount++;
        logger.info('Published scheduled post', { 
          postId: post._id,
          userId: post.user._id,
          scheduledDate: post.scheduledDate
        });
      } catch (postError) {
        errorCount++;
        logger.error('Failed to publish scheduled post', postError, {
          postId: post._id,
          userId: post.user._id
        });
      }
    }

    if (successCount > 0) {
      logger.info(` Published ${successCount} scheduled post(s)`);
    }
    if (errorCount > 0) {
      logger.warn(`  Failed to publish ${errorCount} scheduled post(s)`);
    }
  } catch (error) {
    logger.error('Error in checkScheduledPosts', error);
  }
};

const startScheduler = () => {
  logger.info(' Post scheduler started');
  
  checkScheduledPosts();
  
  const schedulerInterval = setInterval(checkScheduledPosts, 60 * 1000);

  process.on('SIGTERM', () => {
    clearInterval(schedulerInterval);
    logger.info('Post scheduler stopped');
  });

  process.on('SIGINT', () => {
    clearInterval(schedulerInterval);
    logger.info('Post scheduler stopped');
  });
};

module.exports = { startScheduler, checkScheduledPosts };