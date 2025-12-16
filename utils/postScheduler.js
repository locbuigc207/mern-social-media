const Posts = require("../models/postModel");
const logger = require("./logger");

let io = null;

const setSocketIO = (socketIO) => {
  io = socketIO;
};

const checkScheduledPosts = async () => {
  try {
    const now = new Date();

    const scheduledPosts = await Posts.find({
      status: 'scheduled',
      scheduledDate: { $lte: now }
    }).populate('user', 'followers username avatar');

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

        if (io && post.user.followers) {
          io.emit('scheduledPostPublished', {
            post: {
              _id: post._id,
              user: {
                _id: post.user._id,
                username: post.user.username,
                avatar: post.user.avatar,
                followers: post.user.followers
              },
              content: post.content,
              images: post.images,
              publishedAt: post.publishedAt
            }
          });
        }

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
      logger.warn(`⚠️ Failed to publish ${errorCount} scheduled post(s)`);
    }
  } catch (error) {
    logger.error('Error in checkScheduledPosts', error);
  }
};

const startScheduler = (socketIO) => {
  if (socketIO) {
    setSocketIO(socketIO);
  }

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

module.exports = { startScheduler, checkScheduledPosts, setSocketIO };