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
    }]
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("message", messageSchema);