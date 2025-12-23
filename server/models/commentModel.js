const mongoose = require("mongoose");
const { Schema } = mongoose;

const commentSchema = new Schema(
  {
    content: {
      type: String,
      required: true,
    },
    tag: Object,
    reply: mongoose.Types.ObjectId,
    likes: [{ type: mongoose.Types.ObjectId, ref: "user" }],
    user: { type: mongoose.Types.ObjectId, ref: "user" },
    postId: mongoose.Types.ObjectId,
    postUserId: mongoose.Types.ObjectId,
    reports: [
      {
        type: mongoose.Types.ObjectId,
        ref: "report",
      },
    ],
    reportCount: {
      type: Number,
      default: 0,
      index: true,
    },
    isHidden: {
      type: Boolean,
      default: false,
    },
    hiddenBy: [
      {
        type: mongoose.Types.ObjectId,
        ref: "user",
      },
    ],
    moderationStatus: {
      type: String,
      enum: ["approved", "flagged", "removed"],
      default: "approved",
    },
  },
  {
    timestamps: true,
  }
);

commentSchema.index({ postId: 1, createdAt: -1 });
commentSchema.index({ user: 1 });
commentSchema.index({ reportCount: -1 });

commentSchema.methods.incrementReportCount = function () {
  this.reportCount += 1;
  if (this.reportCount >= 3) {
    this.moderationStatus = "flagged";
  }
  return this.save();
};

module.exports = mongoose.model("comment", commentSchema);