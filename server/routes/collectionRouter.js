// server/routes/collectionRouter.js
const router = require("express").Router();
const auth = require("../middleware/auth").auth;
const collectionCtrl = require("../controllers/collectionCtrl");
const { validate } = require("../middleware/validate");
const collectionSchemas = require("../schemas/collectionSchema");
const validateObjectId = require("../middleware/validateObjectId");
const { validatePagination } = require("../middleware/validation");

// Create collection
router.post(
  "/collection",
  auth,
  validate(collectionSchemas.create),
  collectionCtrl.createCollection
);

// Get user's collections
router.get("/collections", auth, validatePagination, collectionCtrl.getCollections);

// Get collection by ID
router.get(
  "/collection/:id",
  auth,
  validateObjectId("id"),
  validatePagination,
  collectionCtrl.getCollection
);

// Update collection
router.patch(
  "/collection/:id",
  auth,
  validateObjectId("id"),
  validate(collectionSchemas.update),
  collectionCtrl.updateCollection
);

// Delete collection
router.delete(
  "/collection/:id",
  auth,
  validateObjectId("id"),
  collectionCtrl.deleteCollection
);

// Add post to collection
router.post(
  "/collection/:id/post/:postId",
  auth,
  validateObjectId("id"),
  validateObjectId("postId"),
  collectionCtrl.addPostToCollection
);

// Remove post from collection
router.delete(
  "/collection/:id/post/:postId",
  auth,
  validateObjectId("id"),
  validateObjectId("postId"),
  collectionCtrl.removePostFromCollection
);

module.exports = router;

