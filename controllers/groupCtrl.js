const Groups = require("../models/groupModel");
const GroupMessages = require("../models/groupMessageModel");
const Users = require("../models/userModel");
const mongoose = require("mongoose");
const notificationService = require("../services/notificationService");
const { asyncHandler } = require("../middleware/errorHandler");
const { NotFoundError, ValidationError, AuthorizationError } = require("../utils/AppError");

const groupCtrl = {
  createGroup: asyncHandler(async (req, res) => {
    const { name, description, avatar, members } = req.body;

    if (!name || !name.trim()) {
      throw new ValidationError("Group name is required.");
    }

    if (!members || members.length < 1) {
      throw new ValidationError("At least 2 members are required.");
    }

    const validMembers = await Users.find({
      _id: { $in: members }
    }).select('_id');

    if (validMembers.length !== members.length) {
      throw new ValidationError("Some user IDs are invalid.");
    }

    const currentUser = await Users.findById(req.user._id);
    const blockedMembers = members.filter(memberId => 
      currentUser.blockedUsers.includes(memberId) ||
      currentUser.blockedBy.includes(memberId)
    );

    if (blockedMembers.length > 0) {
      throw new AuthorizationError("Cannot add blocked users to group.");
    }

    const groupMembers = [
      {
        user: req.user._id,
        role: "admin",
        joinedAt: new Date(),
      },
    ];

    members.forEach((memberId) => {
      if (memberId !== req.user._id.toString()) {
        groupMembers.push({
          user: memberId,
          role: "member",
          joinedAt: new Date(),
        });
      }
    });

    const newGroup = new Groups({
      name: name.trim(),
      description: description?.trim() || "",
      avatar: avatar || undefined,
      admin: [req.user._id],
      members: groupMembers,
    });

    await newGroup.save();

    const populatedGroup = await Groups.findById(newGroup._id)
      .populate("admin", "username avatar fullname")
      .populate("members.user", "username avatar fullname");

    res.json({
      msg: "Group created successfully!",
      group: populatedGroup,
    });
  }),

  getUserGroups: asyncHandler(async (req, res) => {
    const groups = await Groups.find({
      "members.user": req.user._id,
      isActive: true,
    })
      .populate("admin", "username avatar fullname")
      .populate("members.user", "username avatar fullname")
      .populate("lastMessage.sender", "username avatar")
      .sort("-updatedAt");

    res.json({
      groups,
      totalGroups: groups.length,
    });
  }),

  getGroupDetails: asyncHandler(async (req, res) => {
    const { groupId } = req.params;

    const group = await Groups.findById(groupId)
      .populate("admin", "username avatar fullname email")
      .populate("members.user", "username avatar fullname email")
      .populate("pinnedMessages");

    if (!group) {
      throw new NotFoundError("Group");
    }

    const isMember = group.members.some(
      (m) => m.user._id.toString() === req.user._id.toString()
    );

    if (!isMember) {
      throw new AuthorizationError("You are not a member of this group.");
    }

    res.json({ group });
  }),

  sendGroupMessage: asyncHandler(async (req, res) => {
    const { groupId } = req.params;
    const { text, media, replyTo, mentions } = req.body;

    if ((!text || !text.trim()) && (!media || media.length === 0)) {
      throw new ValidationError("Message cannot be empty.");
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const group = await Groups.findById(groupId).session(session);
      if (!group) {
        await session.abortTransaction();
        throw new NotFoundError("Group");
      }

      const member = group.members.find(
        (m) => m.user.toString() === req.user._id.toString()
      );

      if (!member) {
        await session.abortTransaction();
        throw new AuthorizationError("You are not a member of this group.");
      }

      if (group.settings.onlyAdminsCanPost && member.role !== "admin") {
        await session.abortTransaction();
        throw new AuthorizationError("Only admins can post in this group.");
      }

      const newMessage = new GroupMessages({
        group: groupId,
        sender: req.user._id,
        text: text?.trim() || "",
        media: media || [],
        replyTo: replyTo || null,
        mentions: mentions || [],
      });

      await newMessage.save({ session });

      group.lastMessage = {
        sender: req.user._id,
        text: text?.trim() || (media && media.length > 0 ? "Media" : ""),
        media: media || [],
        timestamp: new Date(),
      };
      
      await group.save({ session });

      await session.commitTransaction();

      const populatedMessage = await GroupMessages.findById(newMessage._id)
        .populate("sender", "username avatar fullname")
        .populate("replyTo")
        .populate("mentions", "username avatar");

      if (mentions && mentions.length > 0) {
        await notificationService.notifyGroupMention(
          mentions,
          req.user,
          group,
          newMessage
        );
      }

      res.json({
        msg: "Message sent successfully!",
        message: populatedMessage,
      });
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }),

  getGroupMessages: asyncHandler(async (req, res) => {
    const { groupId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;

    const group = await Groups.findById(groupId);

    if (!group) {
      throw new NotFoundError("Group");
    }

    const isMember = group.members.some(
      (m) => m.user.toString() === req.user._id.toString()
    );

    if (!isMember) {
      throw new AuthorizationError("You are not a member of this group.");
    }

    const messages = await GroupMessages.find({
      group: groupId,
      isDeleted: false,
      deletedFor: { $ne: req.user._id },
    })
      .populate("sender", "username avatar fullname")
      .populate("replyTo")
      .populate("reactions.user", "username avatar")
      .populate("mentions", "username avatar")
      .sort("-createdAt")
      .skip(skip)
      .limit(limit);

    const totalMessages = await GroupMessages.countDocuments({
      group: groupId,
      isDeleted: false,
      deletedFor: { $ne: req.user._id },
    });

    res.json({
      messages: messages.reverse(),
      totalMessages,
      currentPage: page,
      totalPages: Math.ceil(totalMessages / limit),
    });
  }),

  addMembers: asyncHandler(async (req, res) => {
    const { groupId } = req.params;
    const { members } = req.body;

    if (!members || members.length === 0) {
      throw new ValidationError("No members to add.");
    }

    const group = await Groups.findById(groupId);

    if (!group) {
      throw new NotFoundError("Group");
    }

    const member = group.members.find(
      (m) => m.user.toString() === req.user._id.toString()
    );

    if (
      group.settings.onlyAdminsCanAddMembers &&
      member.role !== "admin"
    ) {
      throw new AuthorizationError("Only admins can add members.");
    }

    const newMembers = [];
    for (const memberId of members) {
      const exists = group.members.some(
        (m) => m.user.toString() === memberId
      );

      if (!exists) {
        group.members.push({
          user: memberId,
          role: "member",
          joinedAt: new Date(),
        });
        newMembers.push(memberId);
      }
    }

    await group.save();

    const populatedGroup = await Groups.findById(groupId)
      .populate("admin", "username avatar fullname")
      .populate("members.user", "username avatar fullname");

    res.json({
      msg: `${newMembers.length} member(s) added successfully!`,
      group: populatedGroup,
    });
  }),

  removeMember: asyncHandler(async (req, res) => {
    const { groupId, memberId } = req.params;

    const group = await Groups.findById(groupId);

    if (!group) {
      throw new NotFoundError("Group");
    }

    const isAdmin = group.admin.some(
      (a) => a.toString() === req.user._id.toString()
    );

    if (!isAdmin) {
      throw new AuthorizationError("Only admins can remove members.");
    }

    const memberToRemove = group.members.find(
      (m) => m.user.toString() === memberId
    );

    if (memberToRemove && memberToRemove.role === "admin") {
      throw new AuthorizationError("Cannot remove admin.");
    }

    group.members = group.members.filter(
      (m) => m.user.toString() !== memberId
    );

    await group.save();

    res.json({ msg: "Member removed successfully." });
  }),

  leaveGroup: asyncHandler(async (req, res) => {
    const { groupId } = req.params;

    const group = await Groups.findById(groupId);

    if (!group) {
      throw new NotFoundError("Group");
    }

    if (!group.settings.allowMembersToLeave) {
      throw new AuthorizationError("Members are not allowed to leave this group.");
    }

    const member = group.members.find(
      (m) => m.user.toString() === req.user._id.toString()
    );

    if (member && member.role === "admin") {
      throw new ValidationError("Admin must transfer ownership before leaving.");
    }

    group.members = group.members.filter(
      (m) => m.user.toString() !== req.user._id.toString()
    );

    await group.save();

    res.json({ msg: "You left the group successfully." });
  }),

  updateGroupInfo: asyncHandler(async (req, res) => {
    const { groupId } = req.params;
    const { name, description, avatar } = req.body;

    const group = await Groups.findById(groupId);

    if (!group) {
      throw new NotFoundError("Group");
    }

    const member = group.members.find(
      (m) => m.user.toString() === req.user._id.toString()
    );

    if (group.settings.onlyAdminsCanEditInfo && member.role !== "admin") {
      throw new AuthorizationError("Only admins can edit group info.");
    }

    if (name) group.name = name.trim();
    if (description !== undefined) group.description = description.trim();
    if (avatar) group.avatar = avatar;

    await group.save();

    res.json({
      msg: "Group info updated successfully.",
      group,
    });
  }),

  reactToMessage: asyncHandler(async (req, res) => {
    const { messageId } = req.params;
    const { emoji } = req.body;

    if (!emoji) {
      throw new ValidationError("Emoji is required.");
    }

    const message = await GroupMessages.findById(messageId);

    if (!message) {
      throw new NotFoundError("Message");
    }

    const existingReaction = message.reactions.findIndex(
      (r) => r.user.toString() === req.user._id.toString()
    );

    if (existingReaction !== -1) {
      message.reactions[existingReaction].emoji = emoji;
    } else {
      message.reactions.push({
        user: req.user._id,
        emoji,
        createdAt: new Date(),
      });
    }

    await message.save();

    res.json({
      msg: "Reaction added successfully.",
      reactions: message.reactions,
    });
  }),

  markAsRead: asyncHandler(async (req, res) => {
    const { groupId } = req.params;

    await GroupMessages.updateMany(
      {
        group: groupId,
        "readBy.user": { $ne: req.user._id },
      },
      {
        $push: {
          readBy: {
            user: req.user._id,
            readAt: new Date(),
          },
        },
      }
    );

    res.json({ msg: "Messages marked as read." });
  }),
};

module.exports = groupCtrl;