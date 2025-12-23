// server/routes/locationRouter.js
const router = require("express").Router();
const auth = require("../middleware/auth").auth;
const locationCtrl = require("../controllers/locationCtrl");
const { searchLimiter } = require("../middleware/rateLimiter");
const { validatePagination } = require("../middleware/validation");

// Get nearby posts
router.get(
  "/location/nearby/posts",
  auth,
  searchLimiter,
  validatePagination,
  locationCtrl.getNearbyPosts
);

// Get nearby users
router.get(
  "/location/nearby/users",
  auth,
  searchLimiter,
  locationCtrl.getNearbyUsers
);

// Get posts by location name
router.get(
  "/location/posts",
  auth,
  validatePagination,
  locationCtrl.getPostsByLocation
);

module.exports = router;