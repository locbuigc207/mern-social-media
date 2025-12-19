const mongoose = require("mongoose");
const { Schema } = mongoose;

const postSchema = new Schema(
  {
    content: String,
    images: {
      type: Array,
      required: true,
    },
    likes: [
      {
        type: mongoose.Types.ObjectId,
        ref: "user",
      },
    ],
    comments: [
      {
        type: mongoose.Types.ObjectId,
        ref: "comment",
      },
    ],
    user: {
      type: mongoose.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },
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
      index: true,
    },
    hiddenBy: [
      {
        type: mongoose.Types.ObjectId,
        ref: "user",
      },
    ],
    hiddenReason: String,
    status: {
      type: String,
      enum: ["published", "draft", "scheduled", "removed"],
      default: "published",
      index: true,
    },
    scheduledDate: {
      type: Date,
      index: true,
    },
    publishedAt: {
      type: Date,
      index: true,
    },
    isDraft: {
      type: Boolean,
      default: false,
      index: true,
    },
    moderationStatus: {
      type: String,
      enum: ["approved", "flagged", "under_review", "removed"],
      default: "approved",
      index: true,
    },
    moderatedBy: {
      type: mongoose.Types.ObjectId,
      ref: "user",
    },
    moderatedAt: Date,
    moderationNote: String,
  },
  {
    timestamps: true,
  }
);

postSchema.index({ user: 1, createdAt: -1 });
postSchema.index({ status: 1, isDraft: 1 });
postSchema.index({ status: 1, scheduledDate: 1 });
postSchema.index({ user: 1, status: 1, isDraft: 1 });
postSchema.index({ user: 1, status: 1, isDraft: 1, createdAt: -1 });
postSchema.index({ status: 1, createdAt: -1 });
postSchema.index({ reportCount: -1, moderationStatus: 1 });
postSchema.index({ status: 1, isDraft: 1, hiddenBy: 1, createdAt: -1 });
postSchema.index({ user: 1, status: 1, isDraft: 1, moderationStatus: 1 });

postSchema.index({ likes: 1 });

postSchema.index({ status: 1, isDraft: 1, moderationStatus: 1, createdAt: -1 });

postSchema.index({ content: 'text' });

postSchema.methods.incrementReportCount = function () {
  this.reportCount += 1;
  if (this.reportCount >= 5) {
    this.moderationStatus = "flagged";
  }
  if (this.reportCount >= 10) {
    this.moderationStatus = "under_review";
  }
  return this.save();
};

postSchema.methods.hidePost = function (userId, reason) {
  if (!this.hiddenBy.includes(userId)) {
    this.hiddenBy.push(userId);
  }
  this.isHidden = true;
  this.hiddenReason = reason;
  return this.save();
};

postSchema.methods.unhidePost = function (userId) {
  this.hiddenBy = this.hiddenBy.filter(
    (id) => id.toString() !== userId.toString()
  );
  if (this.hiddenBy.length === 0) {
    this.isHidden = false;
    this.hiddenReason = null;
  }
  return this.save();
};

postSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  next();
});

module.exports = mongoose.model("post", postSchema);