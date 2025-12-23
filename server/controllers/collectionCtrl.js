// server/controllers/collectionCtrl.js
const Collections = require("../models/collectionModel");
const Posts = require("../models/postModel");
const { asyncHandler } = require("../middleware/errorHandler");
const {
  ValidationError,
  NotFoundError,
  AuthorizationError,
  ConflictError,
} = require("../utils/AppError");
const logger = require("../utils/logger");

const collectionCtrl = {
  createCollection: asyncHandler(async (req, res) => {
    const { name, description, isPrivate } = req.body;

    // Check if collection with same name exists
    const existingCollection = await Collections.findOne({
      user: req.user._id,
      name: name.trim(),
    });

    if (existingCollection) {
      throw new ConflictError("Collection with this name already exists.");
    }

    const newCollection = new Collections({
      user: req.user._id,
      name: name.trim(),
      description: description?.trim() || "",
      isPrivate: isPrivate || false,
    });

    await newCollection.save();

    logger.info("Collection created", {
      collectionId: newCollection._id,
      userId: req.user._id,
    });

    res.json({
      msg: "Collection created successfully.",
      collection: newCollection,
    });
  }),

  getCollections: asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const collections = await Collections.find({ user: req.user._id })
      .sort("-updatedAt")
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Collections.countDocuments({ user: req.user._id });

    res.json({
      collections,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  }),

  getCollection: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const collection = await Collections.findById(id);

    if (!collection) {
      throw new NotFoundError("Collection");
    }

    // Check access
    if (
      collection.user.toString() !== req.user._id.toString() &&
      collection.isPrivate
    ) {
      throw new AuthorizationError("This collection is private.");
    }

    // Populate posts
    const populatedCollection = await Collections.findById(id)
      .populate({
        path: "posts",
        options: {
          skip,
          limit,
          sort: "-createdAt",
        },
        populate: {
          path: "user",
          select: "username avatar fullname",
        },
      })
      .populate("user", "username avatar fullname");

    const totalPosts = collection.posts.length;

    res.json({
      collection: {
        ...populatedCollection.toObject(),
        totalPosts,
        page,
        totalPages: Math.ceil(totalPosts / limit),
      },
    });
  }),

  updateCollection: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, description, isPrivate } = req.body;

    const collection = await Collections.findById(id);

    if (!collection) {
      throw new NotFoundError("Collection");
    }

    if (collection.user.toString() !== req.user._id.toString()) {
      throw new AuthorizationError("Unauthorized.");
    }

    if (name) {
      // Check if new name conflicts with existing collection
      const existingCollection = await Collections.findOne({
        user: req.user._id,
        name: name.trim(),
        _id: { $ne: id },
      });

      if (existingCollection) {
        throw new ConflictError("Collection with this name already exists.");
      }

      collection.name = name.trim();
    }

    if (description !== undefined) {
      collection.description = description.trim();
    }

    if (typeof isPrivate !== "undefined") {
      collection.isPrivate = isPrivate;
    }

    await collection.save();

    logger.info("Collection updated", {
      collectionId: id,
      userId: req.user._id,
    });

    res.json({
      msg: "Collection updated successfully.",
      collection,
    });
  }),

  deleteCollection: asyncHandler(async (req, res) => {
    const { id } = req.params;

    const collection = await Collections.findById(id);

    if (!collection) {
      throw new NotFoundError("Collection");
    }

    if (collection.user.toString() !== req.user._id.toString()) {
      throw new AuthorizationError("Unauthorized.");
    }

    await Collections.findByIdAndDelete(id);

    logger.audit("Collection deleted", req.user._id, {
      collectionId: id,
      postsCount: collection.posts.length,
    });

    res.json({
      msg: "Collection deleted successfully.",
    });
  }),

  addPostToCollection: asyncHandler(async (req, res) => {
    const { id, postId } = req.params;

    const collection = await Collections.findById(id);

    if (!collection) {
      throw new NotFoundError("Collection");
    }

    if (collection.user.toString() !== req.user._id.toString()) {
      throw new AuthorizationError("Unauthorized.");
    }

    const post = await Posts.findById(postId);

    if (!post) {
      throw new NotFoundError("Post");
    }

    // Check if post already in collection
    if (collection.posts.includes(postId)) {
      throw new ConflictError("Post already in collection.");
    }

    collection.posts.push(postId);
    await collection.save();

    logger.info("Post added to collection", {
      collectionId: id,
      postId,
      userId: req.user._id,
    });

    res.json({
      msg: "Post added to collection.",
      collection,
    });
  }),

  removePostFromCollection: asyncHandler(async (req, res) => {
    const { id, postId } = req.params;

    const collection = await Collections.findById(id);

    if (!collection) {
      throw new NotFoundError("Collection");
    }

    if (collection.user.toString() !== req.user._id.toString()) {
      throw new AuthorizationError("Unauthorized.");
    }

    if (!collection.posts.includes(postId)) {
      throw new ValidationError("Post not in collection.");
    }

    collection.posts = collection.posts.filter(
      (p) => p.toString() !== postId
    );
    await collection.save();

    logger.info("Post removed from collection", {
      collectionId: id,
      postId,
      userId: req.user._id,
    });

    res.json({
      msg: "Post removed from collection.",
      collection,
    });
  }),
};

module.exports = collectionCtrl;