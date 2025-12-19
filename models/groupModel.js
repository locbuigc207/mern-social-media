const mongoose = require("mongoose");
const { Schema } = mongoose;

const groupSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      maxlength: 500,
    },
    avatar: {
      type: String,
      default: "https://via.placeholder.com/150?text=Group",
    },
    admin: [
      {
        type: mongoose.Types.ObjectId,
        ref: "user",
        required: true,
      },
    ],
    members: [
      {
        user: {
          type: mongoose.Types.ObjectId,
          ref: "user",
        },
        role: {
          type: String,
          enum: ["admin", "member"],
          default: "member",
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
        lastSeen: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    lastMessage: {
      sender: {
        type: mongoose.Types.ObjectId,
        ref: "user",
      },
      text: String,
      media: Array,
      timestamp: Date,
    },
    settings: {
      onlyAdminsCanPost: {
        type: Boolean,
        default: false,
      },
      onlyAdminsCanAddMembers: {
        type: Boolean,
        default: false,
      },
      onlyAdminsCanEditInfo: {
        type: Boolean,
        default: true,
      },
      allowMembersToLeave: {
        type: Boolean,
        default: true,
      },
    },
    pinnedMessages: [
      {
        type: mongoose.Types.ObjectId,
        ref: "groupMessage",
      },
    ],
    mutedBy: [
      {
        type: mongoose.Types.ObjectId,
        ref: "user",
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

groupSchema.index({ members: 1 });
groupSchema.index({ admin: 1 });
groupSchema.index({ "members.user": 1 });

module.exports = mongoose.model("group", groupSchema);