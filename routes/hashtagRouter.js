const router = require('express').Router();
const auth = require('../middleware/auth');
const hashtagCtrl = require('../controllers/hashtagCtrl');
const {
  searchLimiter,
  generalLimiter
} = require('../middleware/rateLimiter');
const { validatePagination } = require('../middleware/validation');

router.get(   '/hashtags/trending',   auth,   generalLimiter,   hashtagCtrl.getTrending );
router.get(   '/hashtags/search',   auth,   searchLimiter,   hashtagCtrl.searchHashtags );
router.get(   '/hashtag/:hashtag/posts',   auth,   validatePagination,   generalLimiter,   hashtagCtrl.getHashtagPosts );
router.get(   '/hashtag/:hashtag/related',   auth,   generalLimiter,   hashtagCtrl.getRelated );

module.exports = router;