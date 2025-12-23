const mongoose = require("mongoose");
const { Schema } = mongoose;

const conversationSchema = new Schema(
  {
    recipients: [{ type: mongoose.Types.ObjectId, ref: "user" }],
    text: String,
    media: Array,

    lastMessage: {
      type: mongoose.Types.ObjectId,
      ref: "message",
    },
  },
  {
    timestamps: true,
  }
);

conversationSchema.index({ recipients: 1 });
conversationSchema.index({ updatedAt: -1 });

module.exports = mongoose.model("conversation", conversationSchema);
