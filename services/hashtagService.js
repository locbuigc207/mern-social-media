const Hashtags = require('../models/hashtagModel');
const Posts = require('../models/postModel');

const extractHashtags = (text) => {
  if (!text) return [];
  
  const hashtagRegex = /#[\w\u0590-\u05ff]+/gi;
  const matches = text.match(hashtagRegex);
  
  if (!matches) return [];
  
  return [...new Set(matches.map(tag => tag.slice(1).toLowerCase()))];
};

// ✅ FIXED: Use bulkWrite to reduce database queries
const processHashtags = async (postId, content) => {
  try {
    const hashtags = extractHashtags(content);
    
    if (hashtags.length === 0) return [];

    // ✅ Use bulkWrite for efficiency (1 query instead of 2N queries)
    const operations = hashtags.map(tagName => ({
      updateOne: {
        filter: { name: tagName },
        update: {
          $addToSet: { posts: postId },
          $inc: { usageCount: 1 },
          $set: { lastUsed: new Date() }
        },
        upsert: true
      }
    }));

    await Hashtags.bulkWrite(operations);

    // ✅ Fetch updated hashtags in single query
    const processedTags = await Hashtags.find({ 
      name: { $in: hashtags } 
    });

    return processedTags;
  } catch (error) {
    console.error('Error processing hashtags:', error);
    return [];
  }
};

// ✅ FIXED: Use bulkWrite for removal
const removePostFromHashtags = async (postId, content) => {
  try {
    const hashtags = extractHashtags(content);
    
    if (hashtags.length === 0) return;

    // ✅ First, update all hashtags
    await Hashtags.updateMany(
      { name: { $in: hashtags } },
      {
        $pull: { posts: postId },
        $inc: { usageCount: -1 }
      }
    );

    // ✅ Then delete hashtags with no posts
    await Hashtags.deleteMany({
      name: { $in: hashtags },
      posts: { $size: 0 }
    });
    
  } catch (error) {
    console.error('Error removing post from hashtags:', error);
  }
};

const getPostsByHashtag = async (hashtagName, options = {}) => {
  try {
    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const hashtag = await Hashtags.findOne({ name: hashtagName.toLowerCase() })
      .populate({
        path: 'posts',
        options: {
          sort: '-createdAt',
          skip,
          limit
        },
        populate: {
          path: 'user',
          select: 'username avatar fullname'
        }
      });

    if (!hashtag) {
      return {
        hashtag: null,
        posts: [],
        total: 0
      };
    }

    return {
      hashtag: {
        name: hashtag.name,
        usageCount: hashtag.usageCount,
        trendingScore: hashtag.trendingScore
      },
      posts: hashtag.posts,
      total: hashtag.posts.length
    };
  } catch (error) {
    throw new Error(`Failed to get posts by hashtag: ${error.message}`);
  }
};

const getTrendingHashtags = async (limit = 20) => {
  try {
    const trending = await Hashtags.getTrending(limit);
    
    return trending.map(tag => ({
      name: tag.name,
      usageCount: tag.usageCount,
      trendingScore: tag.trendingScore,
      postsCount: tag.posts.length
    }));
  } catch (error) {
    throw new Error(`Failed to get trending hashtags: ${error.message}`);
  }
};

const searchHashtags = async (query, limit = 10) => {
  try {
    // ✅ Sanitize query
    const sanitizedQuery = query.replace(/[$.]/g, '').trim();
    
    const hashtags = await Hashtags.find({
      name: { $regex: sanitizedQuery, $options: 'i' }
    })
      .sort('-usageCount')
      .limit(limit)
      .select('name usageCount posts');

    return hashtags.map(tag => ({
      name: tag.name,
      usageCount: tag.usageCount,
      postsCount: tag.posts.length
    }));
  } catch (error) {
    throw new Error(`Failed to search hashtags: ${error.message}`);
  }
};

const getRelatedHashtags = async (hashtagName, limit = 10) => {
  try {
    const hashtag = await Hashtags.findOne({ name: hashtagName.toLowerCase() })
      .populate('posts');

    if (!hashtag) return [];

    const postIds = hashtag.posts.map(p => p._id);
    
    const relatedTags = await Hashtags.find({
      name: { $ne: hashtagName.toLowerCase() },
      posts: { $in: postIds }
    })
      .sort('-usageCount')
      .limit(limit)
      .select('name usageCount');

    return relatedTags.map(tag => ({
      name: tag.name,
      usageCount: tag.usageCount
    }));
  } catch (error) {
    throw new Error(`Failed to get related hashtags: ${error.message}`);
  }
};

const cleanupUnusedHashtags = async (daysOld = 30) => {
  try {
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
    
    const result = await Hashtags.deleteMany({
      lastUsed: { $lt: cutoffDate },
      usageCount: { $lt: 5 }
    });

    return {
      deleted: result.deletedCount,
      cutoffDate
    };
  } catch (error) {
    throw new Error(`Failed to cleanup hashtags: ${error.message}`);
  }
};

module.exports = {
  extractHashtags,
  processHashtags,
  removePostFromHashtags,
  getPostsByHashtag,
  getTrendingHashtags,
  searchHashtags,
  getRelatedHashtags,
  cleanupUnusedHashtags
};