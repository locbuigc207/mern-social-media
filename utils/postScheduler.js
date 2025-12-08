const Posts = require("../models/postModel");
const Users = require("../models/userModel");

const checkScheduledPosts = async () => {
  try {
    const now = new Date();

    const scheduledPosts = await Posts.find({
      status: 'scheduled',
      scheduledDate: { $lte: now }
    }).populate('user', 'followers');

    for (const post of scheduledPosts) {
      post.status = 'published';
      post.isDraft = false;
      post.publishedAt = now;
      await post.save();

      console.log(`Published scheduled post: ${post._id}`);


    }

    if (scheduledPosts.length > 0) {
      console.log(`✅ Published ${scheduledPosts.length} scheduled post(s)`);
    }
  } catch (error) {
    console.error('Error checking scheduled posts:', error);
  }
};

const startScheduler = () => {
  console.log('📅 Post scheduler started');
  
  checkScheduledPosts();
  
  setInterval(checkScheduledPosts, 60 * 1000);
};

module.exports = { startScheduler, checkScheduledPosts };