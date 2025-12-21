const mongoose = require("mongoose");
const { Schema } = mongoose;

const notificationSchema = new Schema(
  {
    // Người nhận thông báo
    recipient: {
      type: mongoose.Types.ObjectId,
      ref: "user",
      required: true,
    },
    // Người gây ra thông báo (like, comment, add friend, ...))
    sender: {
      type: mongoose.Types.ObjectId,
      ref: "user",
      required: true,
    },
    // Loại thông báo
    type: {
      type: String,
      enum: [
        "like",           // Thích bài viết
        "comment",        // Bình luận bài viết
        "reply",          // Trả lời bình luận
        "follow",         // Theo dõi
        "friend_request", // Gửi lời mời kết bạn
        "friend_accept",  // Chấp nhận kết bạn
        "mention",        // Nhắc đến trong bài viết/bình luận
        "share",          // Chia sẻ bài viết
      ],
      required: true,
    },
    // Bài viết liên quan (nếu có)
    post: {
      type: mongoose.Types.ObjectId,
      ref: "post",
    },
    // Bình luận liên quan (nếu có)
    comment: {
      type: mongoose.Types.ObjectId,
      ref: "comment",
    },
    // Nội dung thông báo (tuỳ chọn)
    text: {
      type: String,
    },
    // Đã đọc chưa
    isRead: {
      type: Boolean,
      default: false,
    },
    // URL để chuyển hướng khi click
    url: {
      type: String,
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

// Index để query nhanh hơn
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1 });

module.exports = mongoose.model("notification", notificationSchema);