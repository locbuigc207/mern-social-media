const Posts = require("../models/postModel");
const logger = require("./logger");

class PostScheduler {
  constructor() {
    this.intervalId = null;
    this.io = null;
  }

  start(socketIO) {
    if (this.intervalId) return logger.warn('⚠️ Scheduler already running');
    this.io = socketIO;
    logger.info(' Post scheduler started');
    this.checkScheduledPosts();
    this.intervalId = setInterval(() => this.checkScheduledPosts(), 60000);
    process.on('SIGTERM', () => this.stop());
    process.on('SIGINT', () => this.stop());
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info(' Post scheduler stopped');
    }
  }

  async checkScheduledPosts() {
    try {
      const now = new Date();
      const scheduledPosts = await Posts.find({
        status: 'scheduled',
        scheduledDate: { $lte: now }
      }).populate('user', 'followers username avatar');

      for (const post of scheduledPosts) {
        try {
          if (!post.user) {
            logger.warn('Scheduled post has no user', { postId: post._id });
            continue;
          }

          post.status = 'published';
          post.isDraft = false;
          post.publishedAt = now;
          post.scheduledDate = null;
          await post.save();

          if (this.io) {
            const followers = Array.isArray(post.user.followers) ? post.user.followers : [];
            this.io.emit('scheduledPostPublished', {
              post: {
                _id: post._id,
                user: { _id: post.user._id, username: post.user.username, avatar: post.user.avatar, followers },
                content: post.content,
                images: post.images,
                publishedAt: post.publishedAt
              }
            });
          }
          logger.info(' Published scheduled post', { postId: post._id });
        } catch (postError) {
          logger.error(' Failed to publish post', postError, { postId: post._id });
        }
      }
    } catch (error) {
      logger.error(' Error in checkScheduledPosts', error);
    }
  }
}

const scheduler = new PostScheduler();
module.exports = {
  startPostScheduler: (io) => scheduler.start(io),
  stopScheduler: () => scheduler.stop(),
  scheduler
};