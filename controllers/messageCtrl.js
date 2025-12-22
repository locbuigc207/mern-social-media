const Conversations = require("../models/conversationModel");
const Messages = require("../models/messageModel");
const Users = require("../models/userModel");
const logger = require("../utils/logger");
const { asyncHandler } = require("../middleware/errorHandler");
const {
  NotFoundError,
  ValidationError,
  AuthorizationError,
} = require("../utils/AppError");
const APIfeatures = require("../utils/APIfeatures");

const messageCtrl = {
  // 1. Tạo tin nhắn (Merge: Upload file + Privacy Check + Logic tạo)
  createMessage: asyncHandler(async (req, res) => {
    const { recipient, text, call } = req.body;

    // --- XỬ LÝ MEDIA (Từ File 2) ---
    // Kiểm tra nếu có file upload từ Multer
    let media = [];
    if (req.files && req.files.length > 0) {
      // Xây dựng URL động dựa trên host hiện tại
      const protocol = req.protocol;
      const host = req.get("host"); // localhost:4000 hoặc domain

      media = req.files.map((file) => ({
        url: `${protocol}://${host}/uploads/${file.filename}`,
        type: file.mimetype.startsWith("video/") ? "video" : "image",
      }));
    } else if (req.body.media) {
      // Trường hợp gửi link media trực tiếp (ít dùng nhưng hỗ trợ fallback)
      media = req.body.media;
    }

    // --- VALIDATION CƠ BẢN ---
    if (!recipient) {
      throw new ValidationError("Recipient is required.");
    }

    if ((!text || !text.trim()) && media.length === 0 && !call) {
      throw new ValidationError(
        "Message content (text, media, or call) is required."
      );
    }

    // --- KIỂM TRA USER & QUYỀN RIÊNG TƯ ---
    const recipientUser = await Users.findById(recipient);
    if (!recipientUser) {
      throw new NotFoundError("Recipient user");
    }

    // Check Block (2 chiều)
    if (recipientUser.blockedUsers.includes(req.user._id)) {
      throw new AuthorizationError(
        "You cannot send messages to this user (Blocked)."
      );
    }

    // Check nếu mình block họ (Logic File 1)
    const currentUser = await Users.findById(req.user._id);
    if (currentUser.blockedUsers.includes(recipient)) {
      throw new AuthorizationError("You have blocked this user.");
    }

    // --- CHECK QUYỀN RIÊNG TƯ (Từ File 2) ---
    // 1. Nếu user chặn tin nhắn hoàn toàn
    if (
      recipientUser.privacySettings &&
      recipientUser.privacySettings.whoCanMessage === "none"
    ) {
      throw new AuthorizationError("This user doesn't accept messages.");
    }

    // 2. Nếu user chỉ nhận tin từ người follow
    if (
      recipientUser.privacySettings &&
      recipientUser.privacySettings.whoCanMessage === "following"
    ) {
      // Kiểm tra xem mình (req.user._id) có nằm trong danh sách followers của họ không
      if (!recipientUser.followers.includes(req.user._id)) {
        throw new AuthorizationError(
          "You must be followed by this user to send messages."
        );
      }
    }

    // --- TẠO CONVERSATION ---
    let conversation = await Conversations.findOneAndUpdate(
      {
        $or: [
          { recipients: [req.user._id, recipient] },
          { recipients: [recipient, req.user._id] },
        ],
      },
      {
        $setOnInsert: { recipients: [req.user._id, recipient] },
      },
      { new: true, upsert: true }
    );

    // --- TẠO MESSAGE ---
    const newMessage = new Messages({
      conversation: conversation._id,
      sender: req.user._id,
      recipient,
      text: text || "",
      media,
      call,
    });

    await newMessage.save();
    await Conversations.findByIdAndUpdate(conversation._id, {
      $set: {
        recipients: [req.user._id, recipient], // Đẩy lên đầu nếu sort
        text: text || (media.length > 0 ? "Sent attachments" : "Call"),
        media,
        call,
        lastMessage: newMessage._id, // <--- QUAN TRỌNG: Lưu ID tin nhắn vào đây
      },
    });

    logger.info("Message sent", {
      messageId: newMessage._id,
      sender: req.user._id,
      recipient,
    });

    res.json({
      msg: "Message sent successfully!",
      message: newMessage,
      conversation: conversation,
    });
  }),

  // 2. Lấy danh sách hội thoại
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
          select: "username avatar",
        },
      });
    // Lọc bỏ những hội thoại với người đã block/bị block
    const currentUser = await Users.findById(req.user._id);
    const filteredConversations = conversations.filter((conv) => {
      const otherUser = conv.recipients.find(
        (r) => r._id.toString() !== req.user._id.toString()
      );

      // Giữ lại hội thoại nếu người kia tồn tại VÀ không có block 2 chiều
      // (Lưu ý: Logic này tùy product, có thể bạn vẫn muốn hiện chat cũ dù đã block)
      if (!otherUser) return false;

      const isBlockedByMe = currentUser.blockedUsers.includes(otherUser._id);
      // currentUser.blockedBy (nếu schema có) hoặc check logic ngược lại
      // Tạm thời dùng blockedUsers theo Schema chuẩn
      return !isBlockedByMe;
    });

    res.json({
      conversations: filteredConversations,
      result: filteredConversations.length,
    });
  }),

  // 3. Lấy tin nhắn của 1 hội thoại
  getMessages: asyncHandler(async (req, res) => {
    const features = new APIfeatures(
      Messages.find({
        $or: [
          { sender: req.user._id, recipient: req.params.id },
          { sender: req.params.id, recipient: req.user._id },
        ],
        deletedBy: { $ne: req.user._id }, // Không lấy tin nhắn mình đã xóa
      }),
      req.query
    ).paginating();

    const messages = await features.query
      .sort("-createdAt") // Lấy mới nhất trước để phân trang đúng
      .populate("sender recipient", "avatar username fullname");

    res.json({
      messages: messages.reverse(), // Đảo ngược lại để hiển thị từ trên xuống (cũ -> mới)
      result: messages.length,
    });
  }),

  // 4. Xóa tin nhắn (Soft Delete & Hard Delete)
  deleteMessage: asyncHandler(async (req, res) => {
    const message = await Messages.findById(req.params.messageId);

    if (!message) {
      throw new NotFoundError("Message");
    }

    if (
      message.sender.toString() !== req.user._id.toString() &&
      message.recipient.toString() !== req.user._id.toString()
    ) {
      throw new AuthorizationError(
        "You can only delete messages in your conversations."
      );
    }

    // Thêm người xóa vào mảng deletedBy
    if (!message.deletedBy.includes(req.user._id)) {
      message.deletedBy.push(req.user._id);
    }

    // Kiểm tra nếu cả 2 đều xóa -> Xóa vĩnh viễn khỏi DB
    const bothParticipants = [
      message.sender.toString(),
      message.recipient.toString(),
    ];

    const allDeleted = bothParticipants.every((userId) =>
      message.deletedBy.some(
        (deletedUserId) => deletedUserId.toString() === userId
      )
    );

    if (allDeleted) {
      await Messages.findByIdAndDelete(req.params.messageId);
      logger.info("Message permanently deleted", {
        messageId: req.params.messageId,
      });
      return res.json({ msg: "Message deleted permanently.", permanent: true });
    }

    await message.save();
    logger.info("Message soft deleted", {
      messageId: req.params.messageId,
      userId: req.user._id,
    });

    res.json({ msg: "Message deleted successfully.", permanent: false });
  }),

  // 5. Xóa cả cuộc trò chuyện
  deleteConversation: asyncHandler(async (req, res) => {
    const conversation = await Conversations.findOne({
      recipients: { $all: [req.user._id, req.params.userId] },
    });

    if (!conversation) {
      throw new NotFoundError("Conversation");
    }

    // 1. Soft delete tất cả message
    await Messages.updateMany(
      {
        conversation: conversation._id,
        deletedBy: { $ne: req.user._id },
      },
      {
        $addToSet: { deletedBy: req.user._id },
      }
    );

    // 2. Kiểm tra xem có thể xóa vĩnh viễn conversation không
    // (Nếu tất cả message bên trong đều đã bị cả 2 bên xóa)
    const activeMessagesCount = await Messages.countDocuments({
      conversation: conversation._id,
      $expr: { $lt: [{ $size: "$deletedBy" }, 2] }, // Vẫn còn người chưa xóa
    });

    if (activeMessagesCount === 0) {
      // Xóa sạch sẽ
      await Messages.deleteMany({ conversation: conversation._id });
      await Conversations.findByIdAndDelete(conversation._id);

      logger.info("Conversation permanently deleted", {
        conversationId: conversation._id,
      });
      return res.json({
        msg: "Conversation deleted permanently.",
        permanent: true,
      });
    }

    logger.info("Conversation soft deleted", {
      conversationId: conversation._id,
    });
    res.json({ msg: "Conversation deleted successfully.", permanent: false });
  }),

  // 6. Đánh dấu đã đọc 1 tin nhắn
  markAsRead: asyncHandler(async (req, res) => {
    const { messageId } = req.params;
    const message = await Messages.findById(messageId);

    if (!message) throw new NotFoundError("Message");

    if (message.recipient.toString() !== req.user._id.toString()) {
      throw new AuthorizationError(
        "You can only mark messages sent to you as read."
      );
    }

    if (message.isRead) {
      return res.json({ msg: "Message already marked as read." });
    }

    message.isRead = true;
    message.readAt = new Date();
    await message.save();

    res.json({
      msg: "Message marked as read.",
      message: {
        _id: message._id,
        isRead: message.isRead,
        readAt: message.readAt,
      },
    });
  }),

  // 7. Đánh dấu tất cả là đã đọc (trong 1 cuộc hội thoại)
  markAllAsRead: asyncHandler(async (req, res) => {
    const { userId } = req.params;

    const result = await Messages.updateMany(
      {
        sender: userId,
        recipient: req.user._id,
        isRead: false,
        deletedBy: { $ne: req.user._id },
      },
      {
        $set: { isRead: true, readAt: new Date() },
      }
    );

    res.json({
      msg: `${result.modifiedCount} message(s) marked as read.`,
      count: result.modifiedCount,
    });
  }),

  // 8. Đếm tổng tin nhắn chưa đọc
  getUnreadCount: asyncHandler(async (req, res) => {
    const count = await Messages.countDocuments({
      recipient: req.user._id,
      isRead: false,
      deletedBy: { $ne: req.user._id },
    });

    res.json({ unreadCount: count });
  }),

  // 9. Đếm tin nhắn chưa đọc của 1 người cụ thể
  getUnreadByConversation: asyncHandler(async (req, res) => {
    const { userId } = req.params;

    const count = await Messages.countDocuments({
      sender: userId,
      recipient: req.user._id,
      isRead: false,
      deletedBy: { $ne: req.user._id },
    });

    res.json({ unreadCount: count, conversationWith: userId });
  }),

  // 10. Tìm kiếm tin nhắn (Tính năng của File 1)
  searchMessages: asyncHandler(async (req, res) => {
    const { query, conversationWith } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    if (!query || query.trim().length < 2) {
      throw new ValidationError("Search query must be at least 2 characters.");
    }

    const sanitizedQuery = query.trim().replace(/[$.]/g, "");

    const searchQuery = {
      $or: [{ sender: req.user._id }, { recipient: req.user._id }],
      text: { $regex: sanitizedQuery, $options: "i" },
      deletedBy: { $ne: req.user._id },
    };

    if (conversationWith) {
      searchQuery.$or = [
        { sender: req.user._id, recipient: conversationWith },
        { sender: conversationWith, recipient: req.user._id },
      ];
    }

    const messages = await Messages.find(searchQuery)
      .populate("sender recipient", "username avatar fullname")
      .sort("-createdAt")
      .skip(skip)
      .limit(limit);

    const total = await Messages.countDocuments(searchQuery);

    res.json({
      messages,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  }),

  // 11. Thả Reaction (Tính năng của File 1)
  reactToMessage: asyncHandler(async (req, res) => {
    const { messageId } = req.params;
    const { emoji } = req.body;

    if (!emoji) throw new ValidationError("Emoji is required.");

    const message = await Messages.findById(messageId);
    if (!message) throw new NotFoundError("Message");

    // Chỉ người trong cuộc mới được react
    if (
      message.sender.toString() !== req.user._id.toString() &&
      message.recipient.toString() !== req.user._id.toString()
    ) {
      throw new AuthorizationError("You cannot react to this message.");
    }

    const existingReactionIndex = message.reactions.findIndex(
      (r) => r.user.toString() === req.user._id.toString()
    );

    if (existingReactionIndex !== -1) {
      message.reactions[existingReactionIndex].emoji = emoji; // Update
    } else {
      message.reactions.push({ user: req.user._id, emoji }); // Add new
    }

    await message.save();

    res.json({
      msg: "Reaction added successfully.",
      reactions: message.reactions,
    });
  }),

  // 12. Xóa Reaction
  removeReaction: asyncHandler(async (req, res) => {
    const { messageId } = req.params;
    const message = await Messages.findById(messageId);

    if (!message) throw new NotFoundError("Message");

    message.reactions = message.reactions.filter(
      (r) => r.user.toString() !== req.user._id.toString()
    );

    await message.save();

    res.json({
      msg: "Reaction removed successfully.",
      reactions: message.reactions,
    });
  }),
};

module.exports = messageCtrl;
