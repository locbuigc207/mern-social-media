const Users = require("../models/userModel");
const Conversations = require("../models/conversationModel");
const Messages = require("../models/messageModel");
const { asyncHandler } = require("../middleware/errorHandler");
const {
  ValidationError,
  NotFoundError,
  ConflictError,
} = require("../utils/AppError");

const userCtrl = {
  searchUser: asyncHandler(async (req, res) => {
    const searchQuery = req.query.username
      ? req.query.username.replace(/[$.]/g, "").trim()
      : "";

    if (!searchQuery) {
      return res.json({ users: [] });
    }

    const currentUser = await Users.findById(req.user._id)
      .select("blockedUsers blockedBy");

    const excludedUserIds = [
      req.user._id,
      ...currentUser.blockedUsers,
      ...currentUser.blockedBy
    ];

    const users = await Users.find({
      username: { $regex: searchQuery, $options: "i" },
      role: "user",
      isBlocked: false,
      _id: { $nin: excludedUserIds }
    })
      .limit(10)
      .select("fullname username avatar");

    res.json({ users });
  }),

  getUser: asyncHandler(async (req, res) => {
    const userId = req.params.id === 'me' || !req.params.id ? req.user._id : req.params.id;
    
    const user = await Users.findById(userId)
      .select("-password")
      .populate("followers following", "-password");

    if (!user) {
      throw new NotFoundError("User");
    }

    if (userId.toString() === req.user._id.toString()) {
      return res.json({ user });
    }

    const currentUser = await Users.findById(req.user._id)
      .select("blockedUsers blockedBy");

    if (currentUser.blockedBy.includes(userId)) {
      return res.status(403).json({ 
        msg: "This user is not available.",
        isBlocked: true 
      });
    }

    if (currentUser.blockedUsers.includes(userId)) {
      return res.json({
        user: {
          _id: user._id,
          username: user.username,
          fullname: user.fullname,
          avatar: user.avatar,
          isBlockedByYou: true
        },
        message: "You have blocked this user"
      });
    }

    if (user.privacySettings.profileVisibility === "private") {
      const isFollowing = user.followers.some(
        (follower) => follower._id.toString() === req.user._id.toString()
      );

      if (!isFollowing) {
        return res.json({
          user: {
            _id: user._id,
            username: user.username,
            fullname: user.fullname,
            avatar: user.avatar,
            privacySettings: { profileVisibility: "private" },
          },
          message: "This account is private",
        });
      }
    }

    const userData = user.toObject();
    if (!user.privacySettings.showFollowers) {
      userData.followers = [];
    }
    if (!user.privacySettings.showFollowing) {
      userData.following = [];
    }

    res.json({ user: userData });
  }),

  getCurrentUser: asyncHandler(async (req, res) => {
    const user = await Users.findById(req.user._id)
      .select("-password")
      .populate("followers following", "avatar username fullname")
      .populate("blockedUsers", "avatar username fullname");

    if (!user) {
      throw new NotFoundError("User not found");
    }

    res.json({ user });
  }),

  updateUser: asyncHandler(async (req, res) => {
    const { avatar, fullname, mobile, address, story, website, gender } =
      req.body;

    if (!fullname) {
      throw new ValidationError("Please add your full name.");
    }

    if (fullname.length > 25) {
      throw new ValidationError("Full name cannot exceed 25 characters.");
    }

    if (story && story.length > 200) {
      throw new ValidationError("Bio cannot exceed 200 characters.");
    }

    if (website && website.trim()) {
      try {
        new URL(website);
      } catch (e) {
        throw new ValidationError("Please enter a valid website URL.");
      }
    }

    await Users.findOneAndUpdate(
      { _id: req.user._id },
      { 
        avatar, 
        fullname: fullname.trim(), 
        mobile, 
        address, 
        story: story ? story.trim() : "", 
        website: website ? website.trim() : "", 
        gender 
      }
    );

    res.json({ msg: "Profile updated successfully." });
  }),

  updatePrivacySettings: asyncHandler(async (req, res) => {
    const {
      profileVisibility,
      whoCanMessage,
      whoCanComment,
      whoCanTag,
      showFollowers,
      showFollowing,
    } = req.body;

    const privacySettings = {};

    if (profileVisibility)
      privacySettings.profileVisibility = profileVisibility;
    if (whoCanMessage) privacySettings.whoCanMessage = whoCanMessage;
    if (whoCanComment) privacySettings.whoCanComment = whoCanComment;
    if (whoCanTag) privacySettings.whoCanTag = whoCanTag;
    if (typeof showFollowers !== "undefined")
      privacySettings.showFollowers = showFollowers;
    if (typeof showFollowing !== "undefined")
      privacySettings.showFollowing = showFollowing;

    const user = await Users.findByIdAndUpdate(
      req.user._id,
      { $set: { privacySettings } },
      { new: true }
    ).select("-password");

    res.json({
      msg: "Privacy settings updated successfully.",
      privacySettings: user.privacySettings,
    });
  }),

  getPrivacySettings: asyncHandler(async (req, res) => {
    const user = await Users.findById(req.user._id).select("privacySettings");
    res.json({ privacySettings: user.privacySettings });
  }),

  blockUser: asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (id === req.user._id.toString()) {
      throw new ValidationError("You cannot block yourself.");
    }

    const targetUser = await Users.findById(id);
    if (!targetUser) {
      throw new NotFoundError("User");
    }

    const currentUser = await Users.findById(req.user._id);
    if (currentUser.blockedUsers.includes(id)) {
      throw new ConflictError("User is already blocked.");
    }

    const session = await require("mongoose").startSession();
    session.startTransaction();

    try {
      await Users.findByIdAndUpdate(
        req.user._id,
        {
          $addToSet: { blockedUsers: id },
          $pull: {
            following: id,
            followers: id 
          },
        },
        { session }
      );

      await Users.findByIdAndUpdate(
        id,
        {
          $addToSet: { blockedBy: req.user._id },
          $pull: {
            followers: req.user._id,
            following: req.user._id,
          },
        },
        { session }
      );

      await Conversations.deleteMany({
        recipients: { $all: [req.user._id, id] },
      }).session(session);

      await Messages.updateMany(
        {
          $or: [
            { sender: req.user._id, recipient: id },
            { sender: id, recipient: req.user._id },
          ],
        },
        {
          $addToSet: { deletedBy: { $each: [req.user._id, id] } },
        },
        { session }
      );

      await session.commitTransaction();
      res.json({ msg: "User blocked successfully." });
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }),

  unblockUser: asyncHandler(async (req, res) => {
    const { id } = req.params;

    const currentUser = await Users.findById(req.user._id);
    if (!currentUser.blockedUsers.includes(id)) {
      throw new ValidationError("User is not blocked.");
    }

    await Users.findByIdAndUpdate(req.user._id, {
      $pull: { blockedUsers: id },
    });

    await Users.findByIdAndUpdate(id, {
      $pull: { blockedBy: req.user._id },
    });

    res.json({ msg: "User unblocked successfully." });
  }),

  getBlockedUsers: asyncHandler(async (req, res) => {
    const user = await Users.findById(req.user._id)
      .populate("blockedUsers", "username fullname avatar")
      .select("blockedUsers");

    res.json({ blockedUsers: user.blockedUsers });
  }),

  checkBlocked: asyncHandler(async (req, res) => {
    const { id } = req.params;

    const currentUser = await Users.findById(req.user._id).select(
      "blockedUsers blockedBy"
    );

    const isBlockedByMe = currentUser.blockedUsers.includes(id);
    const isBlockedByThem = currentUser.blockedBy.includes(id);

    res.json({
      isBlocked: isBlockedByMe,
      isBlockedBy: isBlockedByThem,
    });
  }),

  follow: asyncHandler(async (req, res) => {
    const targetUser = await Users.findById(req.params.id);

    if (!targetUser) {
      throw new NotFoundError("User");
    }

    const currentUser = await Users.findById(req.user._id)
      .select("blockedUsers blockedBy following");

    if (currentUser.blockedBy.includes(req.params.id) || 
        currentUser.blockedUsers.includes(req.params.id)) {
      return res.status(403).json({ msg: "You cannot follow this user." });
    }

    if (currentUser.following.includes(req.params.id)) {
      throw new ConflictError("You are already following this user.");
    }

    const session = await require("mongoose").startSession();
    session.startTransaction();

    try {
      const newUser = await Users.findOneAndUpdate(
        { _id: req.params.id },
        {
          $addToSet: {
            followers: req.user._id,
          },
        },
        { new: true, session }
      ).populate("followers following", "-password");

      await Users.findOneAndUpdate(
        { _id: req.user._id },
        { $addToSet: { following: req.params.id } },
        { new: true, session }
      );

      await session.commitTransaction();
      res.json({ newUser });
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }),

  unfollow: asyncHandler(async (req, res) => {
    const currentUser = await Users.findById(req.user._id).select("following");

    if (!currentUser.following.includes(req.params.id)) {
      throw new ValidationError("You are not following this user.");
    }

    const session = await require("mongoose").startSession();
    session.startTransaction();

    try {
      const newUser = await Users.findOneAndUpdate(
        { _id: req.params.id },
        {
          $pull: { followers: req.user._id },
        },
        { new: true, session }
      ).populate("followers following", "-password");

      await Users.findOneAndUpdate(
        { _id: req.user._id },
        { $pull: { following: req.params.id } },
        { new: true, session }
      );

      await session.commitTransaction();
      res.json({ newUser });
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }),

  suggestionsUser: asyncHandler(async (req, res) => {
    const currentUser = await Users.findById(req.user._id)
      .select("following blockedUsers blockedBy")
      .lean();

    const newArr = [
      ...currentUser.following,
      req.user._id,
      ...currentUser.blockedUsers,
      ...currentUser.blockedBy,
    ];

    const num = parseInt(req.query.num) || 10;

    const users = await Users.aggregate([
      {
        $match: {
          _id: { $nin: newArr },
          role: "user",
          isBlocked: false,
        },
      },
      { $sample: { size: Number(num) } },
      {
        $lookup: {
          from: "users",
          localField: "followers",
          foreignField: "_id",
          as: "followers",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "following",
          foreignField: "_id",
          as: "following",
        },
      },
      {
        $project: {
          password: 0,
          resetPasswordToken: 0,
          verificationToken: 0,
          previousResetTokens: 0,
        },
      },
    ]);

    return res.json({
      users,
      result: users.length,
    });
  }),

  getFriends: asyncHandler(async (req, res) => {
    const user = await Users.findById(req.user._id)
      .populate('following', 'fullname username avatar')
      .select('following');

    if (!user) {
      throw new NotFoundError("User");
    }

    res.json({ friends: user.following });
  }),
};

module.exports = userCtrl;