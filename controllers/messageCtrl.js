const Conversations = require("../models/conversationModel");
const Messages = require("../models/messageModel");
const Users = require("../models/userModel");

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
      const { recipient, text, media } = req.body;
      
      if (!recipient || (!text.trim() && media.length === 0)) {
        return res.status(400).json({ msg: "Message content is required" });
      }

      const recipientUser = await Users.findById(recipient);
      
      if (!recipientUser) {
        return res.status(404).json({ msg: "Recipient not found" });
      }

      if (recipientUser.blockedUsers.includes(req.user._id)) {
        return res.status(403).json({ msg: "You cannot send messages to this user." });
      }

      if (recipientUser.blockedByUsers.includes(req.user._id)) {
        return res.status(403).json({ msg: "You are blocked by this user." });
      }

      if (recipientUser.privacySettings.whoCanMessage === 'none') {
        return res.status(403).json({ msg: "This user doesn't accept messages." });
      }

      if (recipientUser.privacySettings.whoCanMessage === 'following') {
        if (!recipientUser.followers.includes(req.user._id)) {
          return res.status(403).json({ msg: "You must be followed by this user to send messages." });
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
          text,
          media,
        },
        { new: true, upsert: true }
      );

      const newMessage = new Messages({
        conversation: newConversation._id,
        sender: req.user._id,
        recipient,
        text,
        media,
      });

      await newMessage.save();

      res.json({ msg: "Created.", message: newMessage });
    } catch (err) {
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
          deletedBy: { $ne: req.user._id } 
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
        message
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
          isRead: false
        },
        {
          $set: {
            isRead: true,
            readAt: new Date()
          }
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
          $addToSet: { deletedBy: req.user._id }
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
          deletedBy: { $size: 2 }
        });

        const totalMessages = await Messages.countDocuments({
          conversation: conversation._id
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
        deletedBy: { $ne: req.user._id }
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
        deletedBy: { $ne: req.user._id }
      });

      res.json({ unreadCount });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },
};

module.exports = messageCtrl;