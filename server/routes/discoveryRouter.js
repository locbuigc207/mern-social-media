// server/routes/discoveryRouter.js
const router = require("express").Router();
const auth = require("../middleware/auth").auth;
const discoveryService = require("../services/discoveryService");
const { asyncHandler } = require("../middleware/errorHandler");
const { validatePagination } = require("../middleware/validation");

router.get(
  "/discover/feed",
  auth,
  validatePagination,
  asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const posts = await discoveryService.getPersonalizedFeed(req.user._id, {
      page,
      limit,
    });

    res.json({
      posts,
      page,
      algorithm: "personalized",
    });
  })
);

router.get(
  "/discover/trending",
  auth,
  asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit) || 20;
    const timeRange = parseInt(req.query.timeRange) || 24; // hours

    const posts = await discoveryService.getTrendingPosts({ limit, timeRange });

    res.json({
      posts,
      timeRange,
      algorithm: "trending",
    });
  })
);

module.exports = router;