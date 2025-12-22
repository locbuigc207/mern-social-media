const Users = require("../models/userModel");
const Conversations = require("../models/conversationModel");
const Messages = require("../models/messageModel");
const Reports = require("../models/reportModel");
const { asyncHandler } = require("../middleware/errorHandler");
const {
  ValidationError,
  NotFoundError,
  ConflictError,
} = require("../utils/AppError");
const notificationService = require("../services/notificationService");

const userCtrl = {
  searchUser: asyncHandler(async (req, res) => {
    let searchQuery = req.query.username || "";

    searchQuery = searchQuery
      .replace(/[$.]/g, "")
      .replace(/[<>'"]/g, "")
      .trim();

    if (searchQuery.length === 0) {
      return res.json({ users: [] });
    }

    if (searchQuery.length < 2) {
      return res.status(400).json({
        msg: "Search query must be at least 2 characters",
      });
    }

    if (searchQuery.length > 50) {
      return res.status(400).json({
        msg: "Search query too long (max 50 characters)",
      });
    }

    const validPattern = /^[a-zA-Z0-9_]+$/;
    if (!validPattern.test(searchQuery)) {
      return res.status(400).json({
        msg: "Search query contains invalid characters",
      });
    }

    const currentUser = await Users.findById(req.user._id)
      .select("blockedUsers blockedBy")
      .lean();

    const excludedUserIds = [
      req.user._id,
      ...currentUser.blockedUsers,
      ...currentUser.blockedBy,
    ];

    const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const users = await Users.find({
      username: { $regex: escapedQuery, $options: "i" },
      role: "user",
      isBlocked: false,
      _id: { $nin: excludedUserIds },
    })
      .limit(10)
      .select("fullname username avatar")
      .lean();

    res.json({ users });
  }),

  getUser: asyncHandler(async (req, res) => {
    const userId =
      req.params.id === "me" || !req.params.id ? req.user._id : req.params.id;

    const user = await Users.findById(userId)
      .select("-password")
      .populate("followers following", "-password");

    if (!user) {
      throw new NotFoundError("User");
    }

    if (userId.toString() === req.user._id.toString()) {
      return res.json({ user });
    }

    const currentUser = await Users.findById(req.user._id).select(
      "blockedUsers blockedBy"
    );

    if (currentUser.blockedBy.includes(userId)) {
      return res.status(403).json({
        msg: "This user is not available.",
        isBlocked: true,
      });
    }

    if (currentUser.blockedUsers.includes(userId)) {
      return res.json({
        user: {
          _id: user._id,
          username: user.username,
          fullname: user.fullname,
          avatar: user.avatar,
          isBlockedByYou: true,
        },
        message: "You have blocked this user",
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
    try {
      const { fullname, bio, location, mobile, address, website, gender } =
        req.body;

      if (!fullname) {
        return res.status(400).json({ msg: "Please add your full name." });
      }

      const updateData = {
        fullname: fullname,
        bio: bio || "",
        location: location || "",
        mobile: mobile || "",
        address: address || "",
        website: website || "",
        gender: gender || "male",
      };

      if (req.files) {
        const port = process.env.PORT || 4000;
        const baseUrl = `http://localhost:${port}/uploads`;

        if (req.files.avatar && req.files.avatar[0]) {
          updateData.avatar = `${baseUrl}/${req.files.avatar[0].filename}`;
        }

        if (req.files.coverPhoto && req.files.coverPhoto[0]) {
          updateData.coverPhoto = `${baseUrl}/${req.files.coverPhoto[0].filename}`;
        }
      }

      const user = await Users.findByIdAndUpdate(req.user._id, updateData, {
        new: true,
      }).select("-password");

      res.json({
        msg: "Profile updated successfully.",
        user,
      });
    } catch (err) {
      console.error(" Update user error:", err);
      return res.status(500).json({ msg: err.message });
    }
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
            followers: id,
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

    const currentUser = await Users.findById(req.user._id).select(
      "blockedUsers blockedBy following"
    );

    if (
      currentUser.blockedBy.includes(req.params.id) ||
      currentUser.blockedUsers.includes(req.params.id)
    ) {
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

      await notificationService.notifyFollow(targetUser, req.user);

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

  reportUser: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { reason, description } = req.body;

    if (id === req.user._id.toString()) {
      throw new ValidationError("You cannot report yourself.");
    }

    const user = await Users.findById(id);
    if (!user) {
      throw new NotFoundError("User not found.");
    }

    const existingReport = await Reports.findOne({
      reportType: "user",
      targetId: id,
      reportedBy: req.user._id,
      status: "pending",
    });

    if (existingReport) {
      throw new ValidationError("You have already reported this user.");
    }

    const session = await require("mongoose").startSession();
    session.startTransaction();

    try {
      const newReport = new Reports({
        reportType: "user",
        targetId: id,
        targetModel: "user",
        reportedBy: req.user._id,
        reason,
        description: description || "No description provided",
        status: "pending",
        priority: determinePriority(reason),
      });

      await newReport.save({ session });

      const updatedUser = await Users.findByIdAndUpdate(
        id,
        { $push: { reports: newReport._id } },
        { new: true, session }
      );

      let autoBlocked = false;
      let actionMessage = "Report submitted successfully. We will review it within 24 hours.";

      const pendingReportsCount = await Reports.countDocuments({
        targetId: id,
        reportType: "user",
        status: "pending",
      }).session(session);

      const criticalReasons = ["child_exploitation", "terrorism", "self_harm", "threats"];
      const highReasons = ["violence", "harassment", "hate_speech"];

      let shouldAutoBlock = false;
      let autoBlockReason = "";
      let suspensionDuration = null;

      if (criticalReasons.includes(reason) && pendingReportsCount >= 2) {
        shouldAutoBlock = true;
        autoBlockReason = `Automatic suspension: ${pendingReportsCount} critical violation reports`;
        suspensionDuration = 7 * 24 * 60 * 60 * 1000;
      } else if (highReasons.includes(reason) && pendingReportsCount >= 3) {
        shouldAutoBlock = true;
        autoBlockReason = `Automatic suspension: ${pendingReportsCount} high-severity reports`;
        suspensionDuration = 3 * 24 * 60 * 60 * 1000;
      } else if (pendingReportsCount >= 5) {
        shouldAutoBlock = true;
        autoBlockReason = `Automatic suspension: ${pendingReportsCount} violation reports`;
        suspensionDuration = 24 * 60 * 60 * 1000;
      }

      if (shouldAutoBlock && !updatedUser.isBlocked) {
        await updatedUser.blockUser(
          null,
          autoBlockReason,
          "account_suspended",
          newReport._id,
          suspensionDuration
        );

        autoBlocked = true;

        const io = notificationService.getIO();
        if (io) {
          io.to(updatedUser._id.toString()).emit("accountBlocked", {
            reason: autoBlockReason,
            actionTaken: "account_suspended",
            blockedAt: updatedUser.blockedAt,
            expiresAt: updatedUser.suspendedUntil,
            message: "Your account has been temporarily suspended due to multiple reports.",
          });

          const sockets = await io.in(updatedUser._id.toString()).fetchSockets();
          for (const socket of sockets) {
            socket.emit("forceLogout", {
              reason: "account_suspended",
              message: "Your account has been temporarily suspended.",
            });
            socket.disconnect(true);
          }
        }

        const newNotify = new Notifies({
          recipients: [updatedUser._id],
          user: req.user._id,
          type: "warning",
          text: "Your account has been temporarily suspended",
          content: autoBlockReason,
          url: "/support",
          isRead: false,
        });
        await newNotify.save({ session });

        const admins = await Users.find({ role: "admin" }).select("_id");
        if (admins.length > 0) {
          const adminNotify = new Notifies({
            recipients: admins.map((a) => a._id),
            user: updatedUser._id,
            type: "warning",
            text: "User auto-blocked due to multiple reports",
            content: `User ${updatedUser.username} has been automatically suspended. Pending reports: ${pendingReportsCount}`,
            url: `/admin/reports/users/${updatedUser._id}`,
            isRead: false,
          });
          await adminNotify.save({ session });
        }

        const hours = Math.ceil(suspensionDuration / (1000 * 60 * 60));
        actionMessage = `Report submitted. The user has been temporarily suspended for ${hours} hours due to multiple reports.`;
      }

      await session.commitTransaction();

      res.json({
        msg: actionMessage,
        report: {
          _id: newReport._id,
          reason: newReport.reason,
          priority: newReport.priority,
          status: newReport.status,
        },
        autoBlocked,
        pendingReports: pendingReportsCount,
      });
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }),

  getFriends: asyncHandler(async (req, res) => {
    const user = await Users.findById(req.user._id)
      .populate("following", "fullname username avatar")
      .select("following");

    if (!user) {
      throw new NotFoundError("User");
    }

    res.json({ friends: user.following });
  }),
};

function determinePriority(reason) {
  const priorityMap = {
    child_exploitation: "critical",
    terrorism: "critical",
    self_harm: "critical",
    threats: "critical",
    violence: "high",
    harassment: "high",
    bullying: "high",
    hate_speech: "high",
    nudity: "medium",
    false_information: "medium",
    scam: "medium",
    spam: "low",
    other: "low",
  };

  return priorityMap[reason] || "low";
}

module.exports = userCtrl;