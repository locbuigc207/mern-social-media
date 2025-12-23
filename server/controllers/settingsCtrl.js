const Users = require("../models/userModel");
const Posts = require("../models/postModel");
const Comments = require("../models/commentModel");
const Messages = require("../models/messageModel");
const { asyncHandler } = require("../middleware/errorHandler");
const { ValidationError } = require("../utils/AppError");
const logger = require("../utils/logger");
const fs = require("fs").promises;
const path = require("path");

const settingsCtrl = {
  updatePrivacySettings: asyncHandler(async (req, res) => {
    const {
      profileVisibility,
      whoCanMessage,
      whoCanComment,
      whoCanTag,
      showFollowers,
      showFollowing,
      showOnlineStatus,
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
    if (typeof showOnlineStatus !== "undefined")
      privacySettings.showOnlineStatus = showOnlineStatus;

    const user = await Users.findByIdAndUpdate(
      req.user._id,
      { $set: { privacySettings } },
      { new: true }
    ).select("privacySettings");

    logger.audit("Privacy settings updated", req.user._id, privacySettings);

    res.json({
      msg: "Privacy settings updated successfully.",
      privacySettings: user.privacySettings,
    });
  }),

  getPrivacySettings: asyncHandler(async (req, res) => {
    const user = await Users.findById(req.user._id).select("privacySettings");
    res.json({ privacySettings: user.privacySettings });
  }),

  updateNotificationSettings: asyncHandler(async (req, res) => {
    const {
      emailNotifications,
      pushNotifications,
      notifyOnLike,
      notifyOnComment,
      notifyOnFollow,
      notifyOnMessage,
      notifyOnMention,
      notifyOnShare,
    } = req.body;

    const notificationSettings = {};

    if (typeof emailNotifications !== "undefined")
      notificationSettings.emailNotifications = emailNotifications;
    if (typeof pushNotifications !== "undefined")
      notificationSettings.pushNotifications = pushNotifications;
    if (typeof notifyOnLike !== "undefined")
      notificationSettings.notifyOnLike = notifyOnLike;
    if (typeof notifyOnComment !== "undefined")
      notificationSettings.notifyOnComment = notifyOnComment;
    if (typeof notifyOnFollow !== "undefined")
      notificationSettings.notifyOnFollow = notifyOnFollow;
    if (typeof notifyOnMessage !== "undefined")
      notificationSettings.notifyOnMessage = notifyOnMessage;
    if (typeof notifyOnMention !== "undefined")
      notificationSettings.notifyOnMention = notifyOnMention;
    if (typeof notifyOnShare !== "undefined")
      notificationSettings.notifyOnShare = notifyOnShare;

    const user = await Users.findByIdAndUpdate(
      req.user._id,
      { $set: { notificationSettings } },
      { new: true }
    ).select("notificationSettings");

    logger.audit("Notification settings updated", req.user._id, notificationSettings);

    res.json({
      msg: "Notification settings updated successfully.",
      notificationSettings: user.notificationSettings,
    });
  }),

  getNotificationSettings: asyncHandler(async (req, res) => {
    const user = await Users.findById(req.user._id).select("notificationSettings");
    res.json({ notificationSettings: user.notificationSettings });
  }),

  updateAccountSettings: asyncHandler(async (req, res) => {
    const { language, timezone } = req.body;

    const accountSettings = {};

    if (language) accountSettings.language = language;
    if (timezone) accountSettings.timezone = timezone;

    const user = await Users.findByIdAndUpdate(
      req.user._id,
      { $set: { accountSettings } },
      { new: true }
    ).select("accountSettings");

    logger.audit("Account settings updated", req.user._id, accountSettings);

    res.json({
      msg: "Account settings updated successfully.",
      accountSettings: user.accountSettings,
    });
  }),

  getAccountSettings: asyncHandler(async (req, res) => {
    const user = await Users.findById(req.user._id).select(
      "accountSettings createdAt lastLoginAt"
    );
    
    res.json({
      accountSettings: user.accountSettings,
      accountInfo: {
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
      },
    });
  }),

  deactivateAccount: asyncHandler(async (req, res) => {
    await Users.findByIdAndUpdate(req.user._id, {
      isActive: false,
      deactivatedAt: new Date(),
    });

    logger.audit("Account deactivated", req.user._id);

    res.json({
      msg: "Account deactivated successfully. You can reactivate anytime by logging in.",
    });
  }),

  deleteAccount: asyncHandler(async (req, res) => {
    const userId = req.user._id;

    // Delete in order: Comments -> Posts -> Messages -> User
    await Comments.deleteMany({ user: userId });
    await Posts.deleteMany({ user: userId });
    await Messages.deleteMany({
      $or: [{ sender: userId }, { recipient: userId }],
    });

    // Remove from other users' lists
    await Users.updateMany(
      {
        $or: [
          { followers: userId },
          { following: userId },
          { friends: userId },
          { blockedUsers: userId },
        ],
      },
      {
        $pull: {
          followers: userId,
          following: userId,
          friends: userId,
          blockedUsers: userId,
        },
      }
    );

    await Users.findByIdAndDelete(userId);

    logger.audit("Account deleted permanently", userId);

    res.json({
      msg: "Account deleted permanently. We're sad to see you go.",
    });
  }),

  downloadUserData: asyncHandler(async (req, res) => {
    const user = await Users.findById(req.user._id)
      .select("-password")
      .lean();

    const posts = await Posts.find({ user: req.user._id }).lean();
    const comments = await Comments.find({ user: req.user._id }).lean();
    const messages = await Messages.find({
      $or: [{ sender: req.user._id }, { recipient: req.user._id }],
    }).lean();

    const userData = {
      user,
      posts,
      comments,
      messages,
      exportedAt: new Date().toISOString(),
    };

    const filename = `user_data_${req.user._id}_${Date.now()}.json`;
    const filepath = path.join(__dirname, "../temp", filename);

    await fs.mkdir(path.dirname(filepath), { recursive: true });
    await fs.writeFile(filepath, JSON.stringify(userData, null, 2));

    logger.audit("User data exported", req.user._id);

    res.download(filepath, filename, async (err) => {
      if (err) {
        logger.error("Error downloading user data", err);
      }
      
      try {
        await fs.unlink(filepath);
      } catch (unlinkErr) {
        logger.error("Error deleting temp file", unlinkErr);
      }
    });
  }),
};

module.exports = settingsCtrl;