const {
  getPostsByHashtag,
  getTrendingHashtags,
  searchHashtags,
  getRelatedHashtags
} = require('../services/hashtagService');
const logger = require('../utils/logger');

const hashtagCtrl = {
  getHashtagPosts: async (req, res) => {
    try {
      const { hashtag } = req.params;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;

      const result = await getPostsByHashtag(hashtag, { page, limit });

      if (!result.hashtag) {
        return res.status(404).json({ msg: 'Hashtag not found.' });
      }

      logger.info('Hashtag posts retrieved', {
        hashtag,
        postsCount: result.posts.length,
        userId: req.user._id
      });

      res.json({
        hashtag: result.hashtag,
        posts: result.posts,
        total: result.total,
        page,
        totalPages: Math.ceil(result.total / limit)
      });
    } catch (err) {
      logger.error('Get hashtag posts failed', err, {
        hashtag: req.params.hashtag,
        userId: req.user._id
      });
      return res.status(500).json({ msg: err.message });
    }
  },

  getTrending: async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 20;

      const trending = await getTrendingHashtags(limit);

      logger.info('Trending hashtags retrieved', {
        count: trending.length,
        userId: req.user._id
      });

      res.json({
        trending,
        count: trending.length
      });
    } catch (err) {
      logger.error('Get trending hashtags failed', err, {
        userId: req.user._id
      });
      return res.status(500).json({ msg: err.message });
    }
  },

  searchHashtags: async (req, res) => {
    try {
      const { query } = req.query;
      const limit = parseInt(req.query.limit) || 10;

      if (!query || query.trim().length === 0) {
        return res.status(400).json({ msg: 'Search query is required.' });
      }

      const results = await searchHashtags(query, limit);

      logger.info('Hashtags searched', {
        query,
        resultsCount: results.length,
        userId: req.user._id
      });

      res.json({
        results,
        count: results.length,
        query
      });
    } catch (err) {
      logger.error('Search hashtags failed', err, {
        query: req.query.query,
        userId: req.user._id
      });
      return res.status(500).json({ msg: err.message });
    }
  },

  getRelated: async (req, res) => {
    try {
      const { hashtag } = req.params;
      const limit = parseInt(req.query.limit) || 10;

      const related = await getRelatedHashtags(hashtag, limit);

      logger.info('Related hashtags retrieved', {
        hashtag,
        relatedCount: related.length,
        userId: req.user._id
      });

      res.json({
        hashtag,
        related,
        count: related.length
      });
    } catch (err) {
      logger.error('Get related hashtags failed', err, {
        hashtag: req.params.hashtag,
        userId: req.user._id
      });
      return res.status(500).json({ msg: err.message });
    }
  }
};
