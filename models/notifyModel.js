const mongoose = require("mongoose");
const { Schema } = mongoose;

const notifySchema = new Schema(
  {
    id: mongoose.Types.ObjectId,
    user: { type: mongoose.Types.ObjectId, ref: "user", required: true },
    recipients: {
      type: [mongoose.Types.ObjectId],
      required: true,
      index: true,
    },
    
    type: {
      type: String,
      enum: [
        "like",
        "comment",
        "reply",
        "like_comment",
        "share",
        "follow",
        "mention",
        "tag",
        "story_view",
        "story_reply",
        "group_mention",
        "friend_request",
        "friend_accept",
      ],
      default: "like",
      index: true,
    },
    
    post: { type: mongoose.Types.ObjectId, ref: "post" },
    comment: { type: mongoose.Types.ObjectId, ref: "comment" },
    
    url: String,
    text: { type: String, required: true },
    content: String,
    image: String,
    
    isRead: { type: Boolean, default: false, index: true },
  },
  {
    timestamps: true,
  }
);

notifySchema.index({ recipients: 1, createdAt: -1 });
notifySchema.index({ recipients: 1, isRead: 1 });
notifySchema.index({ user: 1, type: 1 });

notifySchema.virtual("postData", {
  ref: "post",
  localField: "post",
  foreignField: "_id",
  justOne: true,
});

notifySchema.virtual("commentData", {
  ref: "comment",
  localField: "comment",
  foreignField: "_id",
  justOne: true,
});

module.exports = mongoose.model("notify", notifySchema);