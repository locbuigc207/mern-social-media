const mongoose = require("mongoose");
const { Schema } = mongoose;

const groupMessageSchema = new Schema(
  {
    group: {
      type: mongoose.Types.ObjectId,
      ref: "group",
      required: true,
    },
    sender: {
      type: mongoose.Types.ObjectId,
      ref: "user",
      required: true,
    },
    text: String,
    media: [
      {
        url: String,
        type: {
          type: String,
          enum: ["image", "video", "audio", "file"],
        },
        name: String,
        size: Number,
      },
    ],
    replyTo: {
      type: mongoose.Types.ObjectId,
      ref: "groupMessage",
    },
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
    ],
    readBy: [
      {
        user: {
          type: mongoose.Types.ObjectId,
          ref: "user",
        },
        readAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    mentions: [
      {
        type: mongoose.Types.ObjectId,
        ref: "user",
      },
    ],
    isPinned: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedFor: [
      {
        type: mongoose.Types.ObjectId,
        ref: "user",
      },
    ],
    isEdited: {
      type: Boolean,
      default: false,
    },
    editHistory: [
      {
        text: String,
        editedAt: Date,
      },
    ],
  },
  {
    timestamps: true,
  }
);

groupMessageSchema.index({ group: 1, createdAt: -1 });
groupMessageSchema.index({ sender: 1 });
groupMessageSchema.index({ group: 1, isPinned: 1 });
groupMessageSchema.index({ 
  group: 1, 
  isDeleted: 1, 
  createdAt: -1 
});
groupMessageSchema.index({ 
  group: 1, 
  'readBy.user': 1 
});

module.exports = mongoose.model("groupMessage", groupMessageSchema);