const Conversations = require("../models/conversationModel");
const Messages = require("../models/messageModel");
const Users = require("../models/userModel");
const logger = require("../utils/logger");
const { asyncHandler } = require("../middleware/errorHandler");
const { NotFoundError, ValidationError, AuthorizationError } = require("../utils/AppError");
const APIfeatures = require("../utils/APIfeatures");

const messageCtrl = {
  createMessage: asyncHandler(async (req, res) => {
    const { recipient, text, media, call } = req.body;

    if (!recipient) {
      throw new ValidationError("Recipient is required.");
    }

    if (!text && !media && !call) {
      throw new ValidationError("Message cannot be empty.");
    }

    const recipientUser = await Users.findById(recipient);
    if (!recipientUser) {
      throw new NotFoundError("Recipient user");
    }

    if (recipientUser.blockedUsers.includes(req.user._id)) {
      throw new AuthorizationError("You cannot send messages to this user.");
    }

    const currentUser = await Users.findById(req.user._id);
    if (currentUser.blockedUsers.includes(recipient)) {
      throw new AuthorizationError("You have blocked this user.");
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
        text,
        media,
        call,
      },
      { new: true, upsert: true }
    );

    const newMessage = new Messages({
      conversation: newConversation._id,
      sender: req.user._id,
      recipient,
      text,
      media,
      call,
    });

    await newMessage.save();

    logger.info('Message sent', {
      messageId: newMessage._id,
      sender: req.user._id,
      recipient
    });

    res.json({ 
      msg: "Message sent successfully!",
      message: newMessage,
      conversation: newConversation
    });
  }),

  getConversations: asyncHandler(async (req, res) => {
    const features = new APIfeatures(
      Conversations.find({
        recipients: req.user._id,
      }),
      req.query
    ).paginating();

    const conversations = await features.query
      .sort("-updatedAt")
      .populate("recipients", "avatar username fullname")
      .populate({
        path: "lastMessage",
        populate: {
          path: "sender",
          select: "username avatar"
        }
      });

    const currentUser = await Users.findById(req.user._id);
    const filteredConversations = conversations.filter(conv => {
      const otherUser = conv.recipients.find(
        r => r._id.toString() !== req.user._id.toString()
      );
      
      return otherUser && 
        !currentUser.blockedUsers.includes(otherUser._id) &&
        !currentUser.blockedBy.includes(otherUser._id);
    });

    res.json({
      conversations: filteredConversations,
      result: filteredConversations.length,
    });
  }),

  getMessages: asyncHandler(async (req, res) => {
    const features = new APIfeatures(
      Messages.find({
        $or: [
          { sender: req.user._id, recipient: req.params.id },
          { sender: req.params.id, recipient: req.user._id },
        ],
        deletedBy: { $ne: req.user._id }
      }),
      req.query
    ).paginating();

    const messages = await features.query
      .sort("-createdAt")
      .populate("sender recipient", "avatar username fullname");

    res.json({
      messages: messages.reverse(),
      result: messages.length,
    });
  }),

  deleteMessage: asyncHandler(async (req, res) => {
    const message = await Messages.findById(req.params.messageId);

    if (!message) {
      throw new NotFoundError("Message");
    }

    if (
      message.sender.toString() !== req.user._id.toString() &&
      message.recipient.toString() !== req.user._id.toString()
    ) {
      throw new AuthorizationError("You can only delete messages in your conversations.");
    }

    if (!message.deletedBy.includes(req.user._id)) {
      message.deletedBy.push(req.user._id);
    }

    const bothParticipants = [
      message.sender.toString(), 
      message.recipient.toString()
    ];
    
    const allDeleted = bothParticipants.every(userId => 
      message.deletedBy.some(deletedUserId => 
        deletedUserId.toString() === userId
      )
    );

    if (allDeleted) {
      await Messages.findByIdAndDelete(req.params.messageId);
      
      logger.info('Message permanently deleted', {
        messageId: req.params.messageId
      });
      
      return res.json({ 
        msg: "Message deleted successfully.",
        permanent: true
      });
    }

    await message.save();

    logger.info('Message soft deleted', {
      messageId: req.params.messageId,
      userId: req.user._id
    });

    res.json({ 
      msg: "Message deleted successfully.",
      permanent: false
    });
  }),

  deleteConversation: asyncHandler(async (req, res) => {
    const conversation = await Conversations.findOne({
      recipients: { $all: [req.user._id, req.params.userId] }
    });

    if (!conversation) {
      throw new NotFoundError("Conversation");
    }

    await Messages.updateMany(
      {
        conversation: conversation._id,
        deletedBy: { $ne: req.user._id }
      },
      {
        $addToSet: { deletedBy: req.user._id }
      }
    );

    const allMessagesDeleted = await Messages.countDocuments({
      conversation: conversation._id,
      $expr: { $lt: [{ $size: "$deletedBy" }, 2] }
    });

    if (allMessagesDeleted === 0) {
      await Messages.deleteMany({ conversation: conversation._id });
      await Conversations.findByIdAndDelete(conversation._id);
      
      logger.info('Conversation permanently deleted', {
        conversationId: conversation._id,
        users: [req.user._id, req.params.userId]
      });
      
      return res.json({ 
        msg: "Conversation deleted permanently.",
        permanent: true
      });
    }

    logger.info('Conversation soft deleted', {
      conversationId: conversation._id,
      userId: req.user._id
    });

    res.json({ 
      msg: "Conversation deleted successfully.",
      permanent: false
    });
  }),

  markAsRead: asyncHandler(async (req, res) => {
    const { messageId } = req.params;

    const message = await Messages.findById(messageId);

    if (!message) {
      throw new NotFoundError("Message");
    }

    if (message.recipient.toString() !== req.user._id.toString()) {
      throw new AuthorizationError("You can only mark messages sent to you as read.");
    }

    if (message.isRead) {
      return res.json({ msg: "Message already marked as read." });
    }

    message.isRead = true;
    message.readAt = new Date();
    await message.save();

    logger.info('Message marked as read', {
      messageId,
      userId: req.user._id
    });

    res.json({ 
      msg: "Message marked as read.",
      message: {
        _id: message._id,
        isRead: message.isRead,
        readAt: message.readAt
      }
    });
  }),

  markAllAsRead: asyncHandler(async (req, res) => {
    const { userId } = req.params;

    const result = await Messages.updateMany(
      {
        sender: userId,
        recipient: req.user._id,
        isRead: false,
        deletedBy: { $ne: req.user._id }
      },
      {
        $set: {
          isRead: true,
          readAt: new Date()
        }
      }
    );

    logger.info('All messages marked as read', {
      fromUser: userId,
      toUser: req.user._id,
      count: result.modifiedCount
    });

    res.json({ 
      msg: `${result.modifiedCount} message(s) marked as read.`,
      count: result.modifiedCount
    });
  }),

  getUnreadCount: asyncHandler(async (req, res) => {
    const count = await Messages.countDocuments({
      recipient: req.user._id,
      isRead: false,
      deletedBy: { $ne: req.user._id }
    });

    res.json({ 
      unreadCount: count 
    });
  }),

  getUnreadByConversation: asyncHandler(async (req, res) => {
    const { userId } = req.params;

    const count = await Messages.countDocuments({
      sender: userId,
      recipient: req.user._id,
      isRead: false,
      deletedBy: { $ne: req.user._id }
    });

    res.json({ 
      unreadCount: count,
      conversationWith: userId
    });
  }),

  searchMessages: asyncHandler(async (req, res) => {
    const { query, conversationWith } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    if (!query || query.trim().length < 2) {
      throw new ValidationError("Search query must be at least 2 characters.");
    }

    const sanitizedQuery = query.trim().replace(/[$.]/g, '');

    const searchQuery = {
      $or: [
        { sender: req.user._id },
        { recipient: req.user._id }
      ],
      text: { $regex: sanitizedQuery, $options: 'i' },
      deletedBy: { $ne: req.user._id }
    };

    if (conversationWith) {
      searchQuery.$or = [
        { sender: req.user._id, recipient: conversationWith },
        { sender: conversationWith, recipient: req.user._id }
      ];
    }

    const messages = await Messages.find(searchQuery)
      .populate('sender recipient', 'username avatar fullname')
      .sort('-createdAt')
      .skip(skip)
      .limit(limit);

    const total = await Messages.countDocuments(searchQuery);

    logger.info('Messages searched', {
      query: sanitizedQuery,
      userId: req.user._id,
      results: messages.length
    });

    res.json({
      messages,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  }),

  reactToMessage: asyncHandler(async (req, res) => {
    const { messageId } = req.params;
    const { emoji } = req.body;

    if (!emoji) {
      throw new ValidationError("Emoji is required.");
    }

    const message = await Messages.findById(messageId);

    if (!message) {
      throw new NotFoundError("Message");
    }

    if (
      message.sender.toString() !== req.user._id.toString() &&
      message.recipient.toString() !== req.user._id.toString()
    ) {
      throw new AuthorizationError("You cannot react to this message.");
    }

    const existingReactionIndex = message.reactions.findIndex(
      r => r.user.toString() === req.user._id.toString()
    );

    if (existingReactionIndex !== -1) {
      message.reactions[existingReactionIndex].emoji = emoji;
    } else {
      message.reactions.push({
        user: req.user._id,
        emoji
      });
    }

    await message.save();

    logger.info('Message reaction added', {
      messageId,
      userId: req.user._id,
      emoji
    });

    res.json({
      msg: "Reaction added successfully.",
      reactions: message.reactions
    });
  }),

  removeReaction: asyncHandler(async (req, res) => {
    const { messageId } = req.params;

    const message = await Messages.findById(messageId);

    if (!message) {
      throw new NotFoundError("Message");
    }

    message.reactions = message.reactions.filter(
      r => r.user.toString() !== req.user._id.toString()
    );

    await message.save();

    logger.info('Message reaction removed', {
      messageId,
      userId: req.user._id
    });

    res.json({
      msg: "Reaction removed successfully.",
      reactions: message.reactions
    });
  })
};

module.exports = messageCtrl;