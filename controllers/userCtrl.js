const mongoose = require("mongoose");
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
const { uploadToCloudinary, deleteFromCloudinary } = require("../services/cloudinaryService");

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
    const { fullname, bio, location, mobile, address, website, gender } = req.body;

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

    // Lấy user hiện tại để xóa ảnh cũ trên Cloudinary
    const currentUser = await Users.findById(req.user._id);

    // Upload avatar lên Cloudinary
    if (req.files && req.files.avatar && req.files.avatar[0]) {
      try {
        // Xóa avatar cũ nếu có
        if (currentUser.avatar && currentUser.avatar.includes('cloudinary')) {
          const oldPublicId = currentUser.avatar.split('/').pop().split('.')[0];
          const folderPath = currentUser.avatar.split('/').slice(-2, -1)[0];
          await deleteFromCloudinary(`${folderPath}/${oldPublicId}`);
        }

        // Upload avatar mới
        const avatarResult = await uploadToCloudinary(
          req.files.avatar[0].path,
          { folder: 'campus-connect/avatars', resourceType: 'image' }
        );
        updateData.avatar = avatarResult.url;
      } catch (err) {
        console.error("Avatar upload error:", err);
        return res.status(500).json({ msg: "Failed to upload avatar" });
      }
    }

    // Upload cover photo lên Cloudinary
    if (req.files && req.files.coverPhoto && req.files.coverPhoto[0]) {
      try {
        // Xóa cover cũ nếu có
        if (currentUser.coverPhoto && currentUser.coverPhoto.includes('cloudinary')) {
          const oldPublicId = currentUser.coverPhoto.split('/').pop().split('.')[0];
          const folderPath = currentUser.coverPhoto.split('/').slice(-2, -1)[0];
          await deleteFromCloudinary(`${folderPath}/${oldPublicId}`);
        }

        // Upload cover mới
        const coverResult = await uploadToCloudinary(
          req.files.coverPhoto[0].path,
          { folder: 'campus-connect/covers', resourceType: 'image' }
        );
        updateData.coverPhoto = coverResult.url;
      } catch (err) {
        console.error("Cover photo upload error:", err);
        return res.status(500).json({ msg: "Failed to upload cover photo" });
      }
    }

    // Cập nhật user
    const user = await Users.findByIdAndUpdate(req.user._id, updateData, {
      new: true,
    }).select("-password");

    res.json({
      msg: "Profile updated successfully.",
      user,
    });
  } catch (err) {
    console.error("Update user error:", err);
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
  //!-----------------------------------------------------------
  //!---------------------------- FOLLOW -----------------------
  //!-----------------------------------------------------------
  // 1. Follow User
  follow: asyncHandler(async (req, res) => {
    const targetUserId = req.params.id;
    const currentUserId = req.user._id;

    // Kiểm tra user tồn tại
    const targetUser = await Users.findById(targetUserId);
    if (!targetUser) throw new NotFoundError("User not found");

    // Kiểm tra block
    const currentUser = await Users.findById(currentUserId).select(
      "blockedUsers blockedBy following"
    );
    if (
      currentUser.blockedBy.includes(targetUserId) ||
      currentUser.blockedUsers.includes(targetUserId)
    ) {
      return res.status(403).json({ msg: "You cannot follow this user." });
    }

    // Kiểm tra đã follow chưa
    if (currentUser.following.includes(targetUserId)) {
      throw new ConflictError("You are already following this user.");
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Cập nhật người được follow (Thêm vào danh sách followers)
      const updatedTargetUser = await Users.findOneAndUpdate(
        { _id: targetUserId },
        { $addToSet: { followers: currentUserId } },
        { new: true, session }
      ).populate("followers following", "-password");

      // Cập nhật người đi follow (Thêm vào danh sách following)
      await Users.findOneAndUpdate(
        { _id: currentUserId },
        { $addToSet: { following: targetUserId } },
        { new: true, session }
      );

      // Notify followed user
      await notificationService.notifyFollow(targetUser, req.user);

      await session.commitTransaction();
      res.json({ newUser: updatedTargetUser });
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }),

  // 2. Unfollow User
  unfollow: asyncHandler(async (req, res) => {
    const targetUserId = req.params.id;
    const currentUserId = req.user._id;

    const currentUser = await Users.findById(currentUserId).select("following");
    if (!currentUser.following.includes(targetUserId)) {
      throw new ValidationError("You are not following this user.");
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Cập nhật người bị unfollow
      const updatedTargetUser = await Users.findOneAndUpdate(
        { _id: targetUserId },
        { $pull: { followers: currentUserId } },
        { new: true, session }
      ).populate("followers following", "-password");

      // Cập nhật người đi unfollow
      await Users.findOneAndUpdate(
        { _id: currentUserId },
        { $pull: { following: targetUserId } },
        { new: true, session }
      );

      // Xóa thông báo follow trước đó (nếu có) để sạch DB
      // (Optional: Tùy logic bạn muốn giữ lịch sử hay không)
      /* await Notifies.findOneAndDelete({
          user: currentUserId,
          recipients: targetUserId,
          text: "started following you."
      }).session(session);
      */

      await session.commitTransaction();
      res.json({ newUser: updatedTargetUser });
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }),

  // 3. Lấy danh sách đang theo dõi
  getFollowing: asyncHandler(async (req, res) => {
    // Nếu có userId trên params thì lấy của user đó, không thì lấy của chính mình
    const userId = req.params.id || req.user._id;

    const user = await Users.findById(userId)
      .populate("following", "fullname username avatar followers")
      .select("following");

    if (!user) throw new NotFoundError("User not found");

    // Trả về danh sách following
    res.json({ following: user.following });
  }),

  // 4. Lấy danh sách người theo dõi (Followers)
  getFollowers: asyncHandler(async (req, res) => {
    const userId = req.params.id || req.user._id;

    const user = await Users.findById(userId)
      .populate("followers", "fullname username avatar following")
      .select("followers");

    if (!user) throw new NotFoundError("User not found");

    res.json({ followers: user.followers });
  }),

  // 5. Gợi ý User (Suggestions) - Giữ nguyên logic cũ
  suggestionsUser: asyncHandler(async (req, res) => {
    const currentUser = await Users.findById(req.user._id).select(
      "following blockedUsers blockedBy"
    );

    const excludeIds = [
      ...currentUser.following,
      req.user._id,
      ...currentUser.blockedUsers,
      ...currentUser.blockedBy,
    ];

    const num = parseInt(req.query.num) || 10;

    const users = await Users.aggregate([
      {
        $match: {
          _id: { $nin: excludeIds },
          role: "user",
          isBlocked: false,
        },
      },
      { $sample: { size: Number(num) } },
      {
        $project: {
          password: 0,
          resetPasswordToken: 0,
          verificationToken: 0,
          previousResetTokens: 0,
          email: 0,
          role: 0,
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
      let actionMessage =
        "Report submitted successfully. We will review it within 24 hours.";

      const pendingReportsCount = await Reports.countDocuments({
        targetId: id,
        reportType: "user",
        status: "pending",
      }).session(session);

      const criticalReasons = [
        "child_exploitation",
        "terrorism",
        "self_harm",
        "threats",
      ];
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

        // Notify user about auto-block
        await notificationService.notifyAccountBlocked(
          updatedUser._id,
          null,
          autoBlockReason,
          "temporary_suspension",
          updatedUser.suspendedUntil
        );

        const io = notificationService.getIO();
        if (io) {
          io.to(updatedUser._id.toString()).emit("accountBlocked", {
            reason: autoBlockReason,
            actionTaken: "account_suspended",
            blockedAt: updatedUser.blockedAt,
            expiresAt: updatedUser.suspendedUntil,
            message:
              "Your account has been temporarily suspended due to multiple reports.",
          });

          const sockets = await io
            .in(updatedUser._id.toString())
            .fetchSockets();
          for (const socket of sockets) {
            socket.emit("forceLogout", {
              reason: "account_suspended",
              message: "Your account has been temporarily suspended.",
            });
            socket.disconnect(true);
          }
        }
      }

      // Notify admins about the report
      await notificationService.notifyAdminsNewReport(newReport, req.user);

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
