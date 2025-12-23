// server/controllers/friendCtrl.js
const Users = require("../models/userModel");
const mongoose = require("mongoose");
const { asyncHandler } = require("../middleware/errorHandler");
const {
  ValidationError,
  NotFoundError,
  ConflictError,
} = require("../utils/AppError");
const notificationService = require("../services/notificationService");
const logger = require("../utils/logger");

const friendCtrl = {
  sendFriendRequest: asyncHandler(async (req, res) => {
    const { userId } = req.params;

    if (userId === req.user._id.toString()) {
      throw new ValidationError("You cannot send friend request to yourself.");
    }

    const targetUser = await Users.findById(userId);
    if (!targetUser) {
      throw new NotFoundError("User");
    }

    // Check if blocked
    const currentUser = await Users.findById(req.user._id);
    if (
      currentUser.blockedUsers.includes(userId) ||
      currentUser.blockedBy.includes(userId)
    ) {
      throw new ValidationError("Cannot send friend request to this user.");
    }

    // Check if already friends
    if (currentUser.friends.includes(userId)) {
      throw new ConflictError("Already friends with this user.");
    }

    // Check if request already sent
    if (targetUser.friendRequests.includes(req.user._id)) {
      throw new ConflictError("Friend request already sent.");
    }

    // Check if target user sent request to you (accept instead)
    if (currentUser.friendRequests.includes(userId)) {
      return friendCtrl.acceptFriendRequest(req, res);
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      await Users.findByIdAndUpdate(
        userId,
        {
          $addToSet: { friendRequests: req.user._id },
        },
        { session }
      );

      await Users.findByIdAndUpdate(
        req.user._id,
        {
          $addToSet: { sentFriendRequests: userId },
        },
        { session }
      );

      await notificationService.notifyFriendRequest(targetUser, req.user);

      await session.commitTransaction();

      logger.info("Friend request sent", {
        from: req.user._id,
        to: userId,
      });

      res.json({
        msg: "Friend request sent successfully.",
        notificationSent: true,
      });
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }),

  acceptFriendRequest: asyncHandler(async (req, res) => {
    const { userId } = req.params;

    const currentUser = await Users.findById(req.user._id);
    if (!currentUser.friendRequests.includes(userId)) {
      throw new ValidationError("No friend request from this user.");
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Add to friends list for both users
      await Users.findByIdAndUpdate(
        req.user._id,
        {
          $pull: { friendRequests: userId },
          $addToSet: { friends: userId },
        },
        { session }
      );

      await Users.findByIdAndUpdate(
        userId,
        {
          $pull: { sentFriendRequests: req.user._id },
          $addToSet: { friends: req.user._id },
        },
        { session }
      );

      await notificationService.notifyAcceptFriend(
        { _id: userId },
        req.user
      );

      await session.commitTransaction();

      logger.info("Friend request accepted", {
        acceptedBy: req.user._id,
        requester: userId,
      });

      res.json({
        msg: "Friend request accepted.",
        notificationSent: true,
      });
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }),

  declineFriendRequest: asyncHandler(async (req, res) => {
    const { userId } = req.params;

    const currentUser = await Users.findById(req.user._id);
    if (!currentUser.friendRequests.includes(userId)) {
      throw new ValidationError("No friend request from this user.");
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      await Users.findByIdAndUpdate(
        req.user._id,
        {
          $pull: { friendRequests: userId },
        },
        { session }
      );

      await Users.findByIdAndUpdate(
        userId,
        {
          $pull: { sentFriendRequests: req.user._id },
        },
        { session }
      );

      await session.commitTransaction();

      logger.info("Friend request declined", {
        declinedBy: req.user._id,
        requester: userId,
      });

      res.json({ msg: "Friend request declined." });
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }),

  cancelFriendRequest: asyncHandler(async (req, res) => {
    const { userId } = req.params;

    const currentUser = await Users.findById(req.user._id);
    if (!currentUser.sentFriendRequests.includes(userId)) {
      throw new ValidationError("No sent friend request to this user.");
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      await Users.findByIdAndUpdate(
        req.user._id,
        {
          $pull: { sentFriendRequests: userId },
        },
        { session }
      );

      await Users.findByIdAndUpdate(
        userId,
        {
          $pull: { friendRequests: req.user._id },
        },
        { session }
      );

      await session.commitTransaction();

      logger.info("Friend request cancelled", {
        cancelledBy: req.user._id,
        target: userId,
      });

      res.json({ msg: "Friend request cancelled." });
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }),

  unfriend: asyncHandler(async (req, res) => {
    const { userId } = req.params;

    const currentUser = await Users.findById(req.user._id);
    if (!currentUser.friends.includes(userId)) {
      throw new ValidationError("Not friends with this user.");
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      await Users.findByIdAndUpdate(
        req.user._id,
        {
          $pull: { friends: userId },
        },
        { session }
      );

      await Users.findByIdAndUpdate(
        userId,
        {
          $pull: { friends: req.user._id },
        },
        { session }
      );

      await session.commitTransaction();

      logger.info("Unfriended", {
        user: req.user._id,
        unfriended: userId,
      });

      res.json({ msg: "Unfriended successfully." });
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }),

  getFriends: asyncHandler(async (req, res) => {
    const userId = req.params.userId || req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const user = await Users.findById(userId)
      .populate({
        path: "friends",
        select: "username avatar fullname bio",
        options: {
          skip,
          limit,
        },
      })
      .select("friends");

    if (!user) {
      throw new NotFoundError("User");
    }

    const total = user.friends.length;

    res.json({
      friends: user.friends,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  }),

  getReceivedRequests: asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const user = await Users.findById(req.user._id)
      .populate({
        path: "friendRequests",
        select: "username avatar fullname bio",
        options: {
          skip,
          limit,
        },
      })
      .select("friendRequests");

    const total = user.friendRequests.length;

    res.json({
      requests: user.friendRequests,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  }),

  getSentRequests: asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const user = await Users.findById(req.user._id)
      .populate({
        path: "sentFriendRequests",
        select: "username avatar fullname bio",
        options: {
          skip,
          limit,
        },
      })
      .select("sentFriendRequests");

    const total = user.sentFriendRequests.length;

    res.json({
      requests: user.sentFriendRequests,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  }),

  getMutualFriends: asyncHandler(async (req, res) => {
    const { userId } = req.params;

    const currentUser = await Users.findById(req.user._id).select("friends");
    const targetUser = await Users.findById(userId).select("friends");

    if (!targetUser) {
      throw new NotFoundError("User");
    }

    const mutualFriends = currentUser.friends.filter((friendId) =>
      targetUser.friends.includes(friendId.toString())
    );

    const populatedMutuals = await Users.find({
      _id: { $in: mutualFriends },
    }).select("username avatar fullname");

    res.json({
      mutualFriends: populatedMutuals,
      count: populatedMutuals.length,
    });
  }),

  getFriendSuggestions: asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit) || 10;

    const currentUser = await Users.findById(req.user._id).select(
      "friends blockedUsers blockedBy"
    );

    const excludeIds = [
      ...currentUser.friends,
      req.user._id,
      ...currentUser.blockedUsers,
      ...currentUser.blockedBy,
    ];

    // Get friends of friends
    const friendsOfFriends = await Users.aggregate([
      {
        $match: {
          _id: { $in: currentUser.friends },
        },
      },
      {
        $project: {
          friends: 1,
        },
      },
      {
        $unwind: "$friends",
      },
      {
        $group: {
          _id: "$friends",
          count: { $sum: 1 },
        },
      },
      {
        $match: {
          _id: { $nin: excludeIds },
        },
      },
      {
        $sort: { count: -1 },
      },
      {
        $limit: limit,
      },
    ]);

    const suggestionIds = friendsOfFriends.map((f) => f._id);

    const suggestions = await Users.find({
      _id: { $in: suggestionIds },
    }).select("username avatar fullname bio friends");

    // Calculate mutual friends count for each suggestion
    const suggestionsWithMutuals = suggestions.map((user) => {
      const mutualCount = user.friends.filter((friendId) =>
        currentUser.friends.includes(friendId.toString())
      ).length;

      return {
        ...user.toObject(),
        mutualFriendsCount: mutualCount,
      };
    });

    res.json({
      suggestions: suggestionsWithMutuals,
      count: suggestionsWithMutuals.length,
    });
  }),

  checkFriendshipStatus: asyncHandler(async (req, res) => {
    const { userId } = req.params;

    const currentUser = await Users.findById(req.user._id).select(
      "friends friendRequests sentFriendRequests"
    );

    const status = {
      isFriend: currentUser.friends.includes(userId),
      hasReceivedRequest: currentUser.friendRequests.includes(userId),
      hasSentRequest: currentUser.sentFriendRequests.includes(userId),
    };

    res.json(status);
  }),
};

module.exports = friendCtrl;