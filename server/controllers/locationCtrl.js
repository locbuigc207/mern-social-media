// server/controllers/locationCtrl.js
const Posts = require("../models/postModel");
const Users = require("../models/userModel");
const { asyncHandler } = require("../middleware/errorHandler");
const { ValidationError } = require("../utils/AppError");
const logger = require("../utils/logger");

const locationCtrl = {
  getNearbyPosts: asyncHandler(async (req, res) => {
    const { longitude, latitude, maxDistance } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    if (!longitude || !latitude) {
      throw new ValidationError("Longitude and latitude are required.");
    }

    const lon = parseFloat(longitude);
    const lat = parseFloat(latitude);

    if (isNaN(lon) || isNaN(lat)) {
      throw new ValidationError("Invalid coordinates.");
    }

    const maxDist = maxDistance ? parseInt(maxDistance) : 5000; // 5km default

    const posts = await Posts.find({
      "location.coordinates": {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [lon, lat],
          },
          $maxDistance: maxDist,
        },
      },
      status: "published",
      isDraft: false,
    })
      .populate("user", "username avatar fullname")
      .skip(skip)
      .limit(limit);

    logger.info("Nearby posts retrieved", {
      latitude: lat,
      longitude: lon,
      maxDistance: maxDist,
      resultsCount: posts.length,
      userId: req.user._id,
    });

    res.json({
      posts,
      center: { latitude: lat, longitude: lon },
      maxDistance: maxDist,
      count: posts.length,
    });
  }),

  getNearbyUsers: asyncHandler(async (req, res) => {
    const { longitude, latitude, maxDistance } = req.query;
    const limit = parseInt(req.query.limit) || 20;

    if (!longitude || !latitude) {
      throw new ValidationError("Longitude and latitude are required.");
    }

    const lon = parseFloat(longitude);
    const lat = parseFloat(latitude);
    const maxDist = maxDistance ? parseInt(maxDistance) : 10000; // 10km default

    const users = await Users.find({
      _id: { $ne: req.user._id },
      "location.coordinates": {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [lon, lat],
          },
          $maxDistance: maxDist,
        },
      },
    })
      .select("username avatar fullname location.name")
      .limit(limit);

    res.json({
      users,
      count: users.length,
    });
  }),

  getPostsByLocation: asyncHandler(async (req, res) => {
    const { locationName } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    if (!locationName || locationName.trim().length < 2) {
      throw new ValidationError("Location name is required.");
    }

    const posts = await Posts.find({
      "location.name": { $regex: locationName, $options: "i" },
      status: "published",
      isDraft: false,
    })
      .populate("user", "username avatar fullname")
      .sort("-createdAt")
      .skip(skip)
      .limit(limit);

    const total = await Posts.countDocuments({
      "location.name": { $regex: locationName, $options: "i" },
      status: "published",
      isDraft: false,
    });

    res.json({
      posts,
      locationName,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  }),
};

module.exports = locationCtrl;
