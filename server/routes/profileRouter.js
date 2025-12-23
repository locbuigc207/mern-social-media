// server/routes/profileRouter.js
const router = require("express").Router();
const auth = require("../middleware/auth").auth;
const profileCtrl = require("../controllers/profileCtrl");
const validateObjectId = require("../middleware/validateObjectId");
const { validatePagination } = require("../middleware/validation");

router.get(
  "/profile/:userId/photos",
  auth,
  validateObjectId("userId"),
  validatePagination,
  profileCtrl.getPhotos
);

router.get(
  "/profile/:userId/videos",
  auth,
  validateObjectId("userId"),
  validatePagination,
  profileCtrl.getVideos
);

router.get(
  "/profile/:userId/about",
  auth,
  validateObjectId("userId"),
  profileCtrl.getAbout
);

module.exports = router;