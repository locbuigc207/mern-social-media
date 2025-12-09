const Groups = require("../models/groupModel");
const GroupMessages = require("../models/groupMessageModel");
const Users = require("../models/userModel");

const groupCtrl = {
  // Create Group
  createGroup: async (req, res) => {
    try {
      const { name, description, avatar, members } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({ msg: "Group name is required." });
      }

      if (!members || members.length < 1) {
        return res
          .status(400)
          .json({ msg: "At least 2 members are required." });
      }

      // Validate all members exist
      const validMembers = await Users.find({
        _id: { $in: members }
      }).select('_id');

      if (validMembers.length !== members.length) {
        return res.status(400).json({ 
          msg: "Some user IDs are invalid." 
        });
      }

      // Check for blocked users
      const currentUser = await Users.findById(req.user._id);
      const blockedMembers = members.filter(memberId => 
        currentUser.blockedUsers.includes(memberId) ||
        currentUser.blockedBy.includes(memberId)
      );

      if (blockedMembers.length > 0) {
        return res.status(403).json({ 
          msg: "Cannot add blocked users to group." 
        });
      }

      // Add creator as admin
      const groupMembers = [
        {
          user: req.user._id,
          role: "admin",
          joinedAt: new Date(),
        },
      ];

      // Add other members
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
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },

  // Get User Groups
  getUserGroups: async (req, res) => {
    try {
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
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },

  // Get Group Details
  getGroupDetails: async (req, res) => {
    try {
      const { groupId } = req.params;

      const group = await Groups.findById(groupId)
        .populate("admin", "username avatar fullname email")
        .populate("members.user", "username avatar fullname email")
        .populate("pinnedMessages");

      if (!group) {
        return res.status(404).json({ msg: "Group not found." });
      }

      // Check if user is member
      const isMember = group.members.some(
        (m) => m.user._id.toString() === req.user._id.toString()
      );

      if (!isMember) {
        return res
          .status(403)
          .json({ msg: "You are not a member of this group." });
      }

      res.json({ group });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },

  // Send Group Message
  sendGroupMessage: async (req, res) => {
    try {
      const { groupId } = req.params;
      const { text, media, replyTo, mentions } = req.body;

      if ((!text || !text.trim()) && (!media || media.length === 0)) {
        return res.status(400).json({ msg: "Message cannot be empty." });
      }

      const group = await Groups.findById(groupId);

      if (!group) {
        return res.status(404).json({ msg: "Group not found." });
      }

      // Check if user is member
      const member = group.members.find(
        (m) => m.user.toString() === req.user._id.toString()
      );

      if (!member) {
        return res
          .status(403)
          .json({ msg: "You are not a member of this group." });
      }

      // Check posting permission
      if (group.settings.onlyAdminsCanPost && member.role !== "admin") {
        return res
          .status(403)
          .json({ msg: "Only admins can post in this group." });
      }

      const newMessage = new GroupMessages({
        group: groupId,
        sender: req.user._id,
        text: text?.trim() || "",
        media: media || [],
        replyTo: replyTo || null,
        mentions: mentions || [],
      });

      await newMessage.save();

      // Update last message in group
      group.lastMessage = {
        sender: req.user._id,
        text: text?.trim() || "Media",
        media: media || [],
        timestamp: new Date(),
      };
      await group.save();

      const populatedMessage = await GroupMessages.findById(newMessage._id)
        .populate("sender", "username avatar fullname")
        .populate("replyTo")
        .populate("mentions", "username avatar");

      res.json({
        msg: "Message sent successfully!",
        message: populatedMessage,
      });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },

  // Get Group Messages
  getGroupMessages: async (req, res) => {
    try {
      const { groupId } = req.params;
      const limit = parseInt(req.query.limit) || 50;
      const page = parseInt(req.query.page) || 1;
      const skip = (page - 1) * limit;

      const group = await Groups.findById(groupId);

      if (!group) {
        return res.status(404).json({ msg: "Group not found." });
      }

      // Check if user is member
      const isMember = group.members.some(
        (m) => m.user.toString() === req.user._id.toString()
      );

      if (!isMember) {
        return res
          .status(403)
          .json({ msg: "You are not a member of this group." });
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
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },

  // Add Members
  addMembers: async (req, res) => {
    try {
      const { groupId } = req.params;
      const { members } = req.body;

      if (!members || members.length === 0) {
        return res.status(400).json({ msg: "No members to add." });
      }

      const group = await Groups.findById(groupId);

      if (!group) {
        return res.status(404).json({ msg: "Group not found." });
      }

      // Check permission
      const member = group.members.find(
        (m) => m.user.toString() === req.user._id.toString()
      );

      if (
        group.settings.onlyAdminsCanAddMembers &&
        member.role !== "admin"
      ) {
        return res
          .status(403)
          .json({ msg: "Only admins can add members." });
      }

      // Add new members
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
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },

  // Remove Member
  removeMember: async (req, res) => {
    try {
      const { groupId, memberId } = req.params;

      const group = await Groups.findById(groupId);

      if (!group) {
        return res.status(404).json({ msg: "Group not found." });
      }

      // Check if user is admin
      const isAdmin = group.admin.some(
        (a) => a.toString() === req.user._id.toString()
      );

      if (!isAdmin) {
        return res
          .status(403)
          .json({ msg: "Only admins can remove members." });
      }

      // Cannot remove other admins
      const memberToRemove = group.members.find(
        (m) => m.user.toString() === memberId
      );

      if (memberToRemove && memberToRemove.role === "admin") {
        return res.status(403).json({ msg: "Cannot remove admin." });
      }

      group.members = group.members.filter(
        (m) => m.user.toString() !== memberId
      );

      await group.save();

      res.json({ msg: "Member removed successfully." });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },

  // Leave Group
  leaveGroup: async (req, res) => {
    try {
      const { groupId } = req.params;

      const group = await Groups.findById(groupId);

      if (!group) {
        return res.status(404).json({ msg: "Group not found." });
      }

      if (!group.settings.allowMembersToLeave) {
        return res
          .status(403)
          .json({ msg: "Members are not allowed to leave this group." });
      }

      const member = group.members.find(
        (m) => m.user.toString() === req.user._id.toString()
      );

      if (member && member.role === "admin") {
        return res
          .status(400)
          .json({ msg: "Admin must transfer ownership before leaving." });
      }

      group.members = group.members.filter(
        (m) => m.user.toString() !== req.user._id.toString()
      );

      await group.save();

      res.json({ msg: "You left the group successfully." });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },

  // Update Group Info
  updateGroupInfo: async (req, res) => {
    try {
      const { groupId } = req.params;
      const { name, description, avatar } = req.body;

      const group = await Groups.findById(groupId);

      if (!group) {
        return res.status(404).json({ msg: "Group not found." });
      }

      // Check permission
      const member = group.members.find(
        (m) => m.user.toString() === req.user._id.toString()
      );

      if (group.settings.onlyAdminsCanEditInfo && member.role !== "admin") {
        return res
          .status(403)
          .json({ msg: "Only admins can edit group info." });
      }

      if (name) group.name = name.trim();
      if (description !== undefined) group.description = description.trim();
      if (avatar) group.avatar = avatar;

      await group.save();

      res.json({
        msg: "Group info updated successfully.",
        group,
      });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },

  // React to Message
  reactToMessage: async (req, res) => {
    try {
      const { messageId } = req.params;
      const { emoji } = req.body;

      if (!emoji) {
        return res.status(400).json({ msg: "Emoji is required." });
      }

      const message = await GroupMessages.findById(messageId);

      if (!message) {
        return res.status(404).json({ msg: "Message not found." });
      }

      // Check if already reacted
      const existingReaction = message.reactions.findIndex(
        (r) => r.user.toString() === req.user._id.toString()
      );

      if (existingReaction !== -1) {
        // Update existing reaction
        message.reactions[existingReaction].emoji = emoji;
      } else {
        // Add new reaction
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
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },

  // Mark Messages as Read
  markAsRead: async (req, res) => {
    try {
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
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },
};

module.exports = groupCtrl;