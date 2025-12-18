const Posts = require("../models/postModel");
const logger = require("./logger");

class PostScheduler {
  constructor() {
    this.intervalId = null;
    this.io = null;
  }

  start(socketIO) {
    if (this.intervalId) {
      logger.warn('Scheduler already running');
      return;
    }

    this.io = socketIO;
    logger.info('📅 Post scheduler started');

    this.checkScheduledPosts();

    this.intervalId = setInterval(() => {
      this.checkScheduledPosts();
    }, 60 * 1000);

    process.on('SIGTERM', () => this.stop());
    process.on('SIGINT', () => this.stop());
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('Post scheduler stopped');
    }
  }

  async checkScheduledPosts() {
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
          post.scheduledDate = null;
          await post.save();

          successCount++;

          if (this.io && post.user.followers) {
            this.io.emit('scheduledPostPublished', {
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
        logger.info(`✅ Published ${successCount} scheduled post(s)`);
      }
      if (errorCount > 0) {
        logger.warn(`⚠️ Failed to publish ${errorCount} scheduled post(s)`);
      }
    } catch (error) {
      logger.error('Error in checkScheduledPosts', error);
    }
  }
}

const scheduler = new PostScheduler();

module.exports = {
  startPostScheduler: (io) => scheduler.start(io),
  stopScheduler: () => scheduler.stop()
};