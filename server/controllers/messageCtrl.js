const Conversations = require("../models/conversationModel");
const Messages = require("../models/messageModel");
const Users = require("../models/userModel");
const { uploadMultipleToCloudinary } = require("../services/cloudinaryService");
const { asyncHandler } = require("../middleware/errorHandler");
const {
  NotFoundError,
  ValidationError,
  AuthorizationError,
} = require("../utils/AppError");
const logger = require("../utils/logger");

class APIfeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  paginating() {
    const page = this.queryString.page * 1 || 1;
    const limit = this.queryString.limit * 1 || 9;
    const skip = (page - 1) * limit;
    this.query = this.query.skip(skip).limit(limit);
    return this;
  }
}

const messageCtrl = {
  createMessage: async (req, res) => {
    try {
      const { recipient, text } = req.body;

      // KHÔNG CHO GỬI TIN NHẮN CHO CHÍNH MÌNH
      if (recipient === req.user._id.toString()) {
        return res.status(400).json({ msg: "Bạn không thể gửi tin nhắn cho chính mình." });
      }

      // Upload ảnh lên Cloudinary
      let media = [];
      if (req.files && req.files.length > 0) {
        try {
          console.log(`Uploading ${req.files.length} files to Cloudinary...`);
          
          const filePaths = req.files.map(file => file.path);
          
          const uploadResult = await uploadMultipleToCloudinary(
            filePaths,
            { folder: 'campus-connect/messages', resourceType: 'auto' }
          );

          if (!uploadResult.success && uploadResult.errors.length > 0) {
            console.error('Some files failed to upload:', uploadResult.errors);
          }

          media = uploadResult.results.map(result => ({
            url: result.url,
            publicId: result.publicId,
            type: result.type === 'video' ? 'video' : 'image',
          }));

          console.log(`Successfully uploaded ${media.length} files to Cloudinary`);
        } catch (uploadErr) {
          console.error("Chat media upload error:", uploadErr);
          return res.status(500).json({ msg: "Failed to upload media" });
        }
      }

      // Validate: must have text or media
      if (!recipient || (!text?.trim() && media.length === 0)) {
        return res.status(400).json({ msg: "Message content is required" });
      }

      const recipientUser = await Users.findById(recipient);

      if (!recipientUser) {
        return res.status(404).json({ msg: "Recipient not found" });
      }

      if (recipientUser.blockedUsers.includes(req.user._id)) {
        return res
          .status(403)
          .json({ msg: "You cannot send messages to this user." });
      }

      if (recipientUser.blockedBy && recipientUser.blockedBy.includes(req.user._id)) {
        return res.status(403).json({ msg: "You are blocked by this user." });
      }

      if (recipientUser.privacySettings.whoCanMessage === "none") {
        return res
          .status(403)
          .json({ msg: "This user doesn't accept messages." });
      }

      if (recipientUser.privacySettings.whoCanMessage === "following") {
        if (!recipientUser.followers.includes(req.user._id)) {
          return res
            .status(403)
            .json({
              msg: "You must be followed by this user to send messages.",
            });
        }
      }

      const newConversation = await Conversations.findOneAndUpdate(
        {
          $or: [
            { recipients: [req.user._id, recipient] },
            { recipients: [recipient, req.user._id] },
          ],
        },
        {
          recipients: [req.user._id, recipient],
          text: text || "",
          media,
        },
        { new: true, upsert: true }
      );

      const newMessage = new Messages({
        conversation: newConversation._id,
        sender: req.user._id,
        recipient,
        text: text || "",
        media,
      });

      await newMessage.save();

      res.json({ msg: "Created.", message: newMessage });
    } catch (err) {
      console.error("Create message error:", err);
      return res.status(500).json({ msg: err.message });
    }
  },

  getConversations: async (req, res) => {
    try {
      const features = new APIfeatures(
        Conversations.find({
          recipients: req.user._id,
        }),
        req.query
      ).paginating();

      const conversations = await features.query
        .sort("-updatedAt")
        .populate("recipients", "avatar username fullname");

      res.json({
        conversations,
        result: conversations.length,
      });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },

  getMessages: async (req, res) => {
    try {
      const features = new APIfeatures(
        Messages.find({
          $or: [
            { sender: req.user._id, recipient: req.params.id },
            { sender: req.params.id, recipient: req.user._id },
          ],
          deletedBy: { $ne: req.user._id },
        }),
        req.query
      ).paginating();

      const messages = await features.query.sort("-createdAt");

      res.json({
        messages,
        result: messages.length,
      });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },

  markAsRead: async (req, res) => {
    try {
      const { messageId } = req.params;

      const message = await Messages.findById(messageId);

      if (!message) {
        return res.status(404).json({ msg: "Message not found." });
      }

      if (message.recipient.toString() !== req.user._id.toString()) {
        return res.status(403).json({ msg: "Unauthorized." });
      }

      if (message.isRead) {
        return res.status(400).json({ msg: "Message already marked as read." });
      }

      message.isRead = true;
      message.readAt = new Date();
      await message.save();

      res.json({
        msg: "Message marked as read.",
        message,
      });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },

  markAllAsRead: async (req, res) => {
    try {
      const { userId } = req.params;

      await Messages.updateMany(
        {
          sender: userId,
          recipient: req.user._id,
          isRead: false,
        },
        {
          $set: {
            isRead: true,
            readAt: new Date(),
          },
        }
      );

      res.json({ msg: "All messages marked as read." });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },

  deleteMessage: async (req, res) => {
    try {
      const { messageId } = req.params;

      const message = await Messages.findById(messageId);

      if (!message) {
        return res.status(404).json({ msg: "Message not found." });
      }

      if (
        message.sender.toString() !== req.user._id.toString() &&
        message.recipient.toString() !== req.user._id.toString()
      ) {
        return res.status(403).json({ msg: "Unauthorized." });
      }

      if (!message.deletedBy.includes(req.user._id)) {
        message.deletedBy.push(req.user._id);
      }

      if (message.deletedBy.length === 2) {
        await Messages.findByIdAndDelete(messageId);
        return res.json({ msg: "Message permanently deleted." });
      }

      await message.save();

      res.json({ msg: "Message deleted successfully." });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },

  deleteConversation: async (req, res) => {
    try {
      const { userId } = req.params;

      await Messages.updateMany(
        {
          $or: [
            { sender: req.user._id, recipient: userId },
            { sender: userId, recipient: req.user._id },
          ],
        },
        {
          $addToSet: { deletedBy: req.user._id },
        }
      );

      const conversation = await Conversations.findOne({
        $or: [
          { recipients: [req.user._id, userId] },
          { recipients: [userId, req.user._id] },
        ],
      });

      if (conversation) {
        const allMessagesDeleted = await Messages.find({
          conversation: conversation._id,
          deletedBy: { $size: 2 },
        });

        const totalMessages = await Messages.countDocuments({
          conversation: conversation._id,
        });

        if (allMessagesDeleted.length === totalMessages) {
          await Conversations.findByIdAndDelete(conversation._id);
        }
      }

      res.json({ msg: "Conversation deleted successfully." });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },

  getUnreadCount: async (req, res) => {
    try {
      const unreadCount = await Messages.countDocuments({
        recipient: req.user._id,
        isRead: false,
        deletedBy: { $ne: req.user._id },
      });

      res.json({ unreadCount });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },

  getUnreadByConversation: async (req, res) => {
    try {
      const { userId } = req.params;

      const unreadCount = await Messages.countDocuments({
        sender: userId,
        recipient: req.user._id,
        isRead: false,
        deletedBy: { $ne: req.user._id },
      });

      res.json({ unreadCount });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },

  createMessageFromStoryReply: async (req, res) => {
    try {
      const { recipient, text, storyId } = req.body;

      if (!recipient || !text?.trim()) {
        return res.status(400).json({ msg: "Message content is required" });
      }

      const recipientUser = await Users.findById(recipient);

      if (!recipientUser) {
        return res.status(404).json({ msg: "Recipient not found" });
      }

      // Check blocking
      if (recipientUser.blockedUsers.includes(req.user._id)) {
        return res
          .status(403)
          .json({ msg: "You cannot send messages to this user." });
      }

      // Create conversation
      const newConversation = await Conversations.findOneAndUpdate(
        {
          $or: [
            { recipients: [req.user._id, recipient] },
            { recipients: [recipient, req.user._id] },
          ],
        },
        {
          recipients: [req.user._id, recipient],
          text: text,
          media: [],
        },
        { new: true, upsert: true }
      );

      // Create message with story reference
      const newMessage = new Messages({
        conversation: newConversation._id,
        sender: req.user._id,
        recipient,
        text: text,
        media: [],
        storyReply: storyId, // Reference to story
      });

      await newMessage.save();

      // Populate sender info
      await newMessage.populate("sender", "avatar username fullname");

      console.log(" Story reply message created:", newMessage._id);

      res.json({ msg: "Reply sent.", message: newMessage });
    } catch (err) {
      console.error("Create story reply message error:", err);
      return res.status(500).json({ msg: err.message });
    }
  },

  reactToMessage: asyncHandler(async (req, res) => {
    const { messageId } = req.params;
    const { emoji } = req.body;

    if (!emoji || emoji.trim().length === 0) {
      throw new ValidationError("Emoji is required.");
    }

    const message = await Messages.findById(messageId);

    if (!message) {
      throw new NotFoundError("Message");
    }

    // Check if user is sender or recipient
    if (
      message.sender.toString() !== req.user._id.toString() &&
      message.recipient.toString() !== req.user._id.toString()
    ) {
      throw new AuthorizationError("Unauthorized.");
    }

    // Check if already reacted
    const existingReaction = message.reactions.findIndex(
      (r) => r.user.toString() === req.user._id.toString()
    );

    if (existingReaction !== -1) {
      // Update existing reaction
      message.reactions[existingReaction].emoji = emoji;
      message.reactions[existingReaction].createdAt = new Date();
    } else {
      // Add new reaction
      message.reactions.push({
        user: req.user._id,
        emoji: emoji.trim(),
        createdAt: new Date(),
      });
    }

    await message.save();

    // Emit socket event
    const io = require("../socketServer");
    if (io) {
      const recipientId =
        message.sender.toString() === req.user._id.toString()
          ? message.recipient
          : message.sender;

      io.to(recipientId.toString()).emit("messageReaction", {
        messageId: message._id,
        userId: req.user._id,
        emoji,
        timestamp: new Date(),
      });
    }

    logger.info("Message reaction added", {
      messageId,
      userId: req.user._id,
      emoji,
    });

    res.json({
      msg: "Reaction added successfully.",
      reactions: message.reactions,
    });
  }),

  removeReaction: asyncHandler(async (req, res) => {
    const { messageId } = req.params;

    const message = await Messages.findById(messageId);

    if (!message) {
      throw new NotFoundError("Message");
    }

    // Check if user is sender or recipient
    if (
      message.sender.toString() !== req.user._id.toString() &&
      message.recipient.toString() !== req.user._id.toString()
    ) {
      throw new AuthorizationError("Unauthorized.");
    }

    message.reactions = message.reactions.filter(
      (r) => r.user.toString() !== req.user._id.toString()
    );

    await message.save();

    // Emit socket event
    const io = require("../socketServer");
    if (io) {
      const recipientId =
        message.sender.toString() === req.user._id.toString()
          ? message.recipient
          : message.sender;

      io.to(recipientId.toString()).emit("messageReactionRemoved", {
        messageId: message._id,
        userId: req.user._id,
        timestamp: new Date(),
      });
    }

    logger.info("Message reaction removed", {
      messageId,
      userId: req.user._id,
    });

    res.json({
      msg: "Reaction removed successfully.",
      reactions: message.reactions,
    });
  }),

  searchMessages: asyncHandler(async (req, res) => {
    const { query, conversationId } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    if (!query || query.trim().length < 2) {
      throw new ValidationError("Search query must be at least 2 characters.");
    }

    const sanitizedQuery = query.trim().replace(/[$.]/g, "");

    let searchQuery = {
      $or: [
        { sender: req.user._id },
        { recipient: req.user._id },
      ],
      text: { $regex: sanitizedQuery, $options: "i" },
      deletedBy: { $ne: req.user._id },
    };

    if (conversationId) {
      searchQuery.conversation = conversationId;
    }

    const messages = await Messages.find(searchQuery)
      .populate("sender recipient", "username avatar fullname")
      .sort("-createdAt")
      .skip(skip)
      .limit(limit);

    const total = await Messages.countDocuments(searchQuery);

    logger.info("Messages searched", {
      query: sanitizedQuery,
      userId: req.user._id,
      results: messages.length,
    });

    res.json({
      query: sanitizedQuery,
      messages,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  }),
};

module.exports = messageCtrl;