// server/routes/searchRouter.js
const router = require("express").Router();
const auth = require("../middleware/auth").auth;
const searchCtrl = require("../controllers/searchCtrl");
const { searchLimiter } = require("../middleware/rateLimiter");
const { validatePagination } = require("../middleware/validation");

// Global search
router.get(
  "/search",
  auth,
  searchLimiter,
  validatePagination,
  searchCtrl.globalSearch
);

// Search posts
router.get(
  "/search/posts",
  auth,
  searchLimiter,
  validatePagination,
  searchCtrl.searchPosts
);

// Search users
router.get(
  "/search/users",
  auth,
  searchLimiter,
  validatePagination,
  searchCtrl.searchUsers
);

// Recent searches
router.get("/search/recent", auth, searchCtrl.recentSearches);

// Clear search history
router.delete("/search/history", auth, searchCtrl.clearSearchHistory);

module.exports = router;