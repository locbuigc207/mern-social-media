const mongoose = require("mongoose");
const { Schema } = mongoose;

const messageSchema = new Schema(
  {
    conversation: { type: mongoose.Types.ObjectId, ref: "conversation" },
    sender: { type: mongoose.Types.ObjectId, ref: "user" },
    recipient: { type: mongoose.Types.ObjectId, ref: "user" },
    text: String,
    media: Array,
    isRead: {
      type: Boolean,
      default: false
    },
    readAt: {
      type: Date
    },
    isDeleted: {
      type: Boolean,
      default: false
    },
    deletedBy: [{
      type: mongoose.Types.ObjectId,
      ref: "user"
    }],
    reactions: [
      {
        user: {
          type: mongoose.Types.ObjectId,
          ref: "user",
        },
        emoji: String,
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ]
  },
  {
    timestamps: true,
  }
);

messageSchema.index({ conversation: 1, createdAt: -1 });
messageSchema.index({ sender: 1, recipient: 1 });
messageSchema.index({ recipient: 1, isRead: 1 });
messageSchema.index({ conversation: 1, deletedBy: 1 });

module.exports = mongoose.model("message", messageSchema);