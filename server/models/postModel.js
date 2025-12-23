// server/models/postModel.js - COMPLETE VERSION
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
    // Sharing
    isShared: {
      type: Boolean,
      default: false,
      index: true,
    },
    originalPost: {
      type: mongoose.Types.ObjectId,
      ref: "post",
      index: true,
    },
    shareCaption: {
      type: String,
      maxlength: 5000,
    },
    shares: [
      {
        type: mongoose.Types.ObjectId,
        ref: "post",
      },
    ],
    shareCount: {
      type: Number,
      default: 0,
      index: true,
    },
    // Reporting
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
    // Status
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
    // Moderation
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
    // Edit history
    editHistory: [
      {
        content: String,
        images: Array,
        editedAt: {
          type: Date,
          default: Date.now,
        },
        editedBy: {
          type: mongoose.Types.ObjectId,
          ref: "user",
        },
      },
    ],
    isEdited: {
      type: Boolean,
      default: false,
    },
    lastEditedAt: Date,
    // Location
    location: {
      type: {
        type: String,
        enum: ["Point"],
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
      },
      name: String,
      address: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
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
postSchema.index({ content: "text" });
postSchema.index({ isShared: 1, originalPost: 1 });
postSchema.index({ shareCount: -1 });
postSchema.index({ originalPost: 1, user: 1 }, { 
  partialFilterExpression: { isShared: true } 
});
postSchema.index({ "location.coordinates": "2dsphere" });
postSchema.index({ isEdited: 1, lastEditedAt: -1 });

// Methods
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

postSchema.methods.incrementShareCount = async function () {
  this.shareCount += 1;
  return this.save();
};

postSchema.methods.decrementShareCount = async function () {
  if (this.shareCount > 0) {
    this.shareCount -= 1;
    return this.save();
  }
  return this;
};

postSchema.methods.canBeShared = function () {
  return (
    this.status === "published" &&
    !this.isDraft &&
    this.moderationStatus !== "removed" &&
    !this.isHidden
  );
};

// Pre-save hook
postSchema.pre("save", function (next) {
  if (
    this.isModified("status") &&
    this.status === "published" &&
    !this.publishedAt
  ) {
    this.publishedAt = new Date();
  }
  next();
});

// Static methods
postSchema.statics.getMostShared = function (limit = 10, timeRange = null) {
  const query = {
    status: "published",
    isDraft: false,
    moderationStatus: { $ne: "removed" },
    shareCount: { $gt: 0 },
  };

  if (timeRange) {
    query.createdAt = { $gte: new Date(Date.now() - timeRange) };
  }

  return this.find(query)
    .sort("-shareCount -createdAt")
    .limit(limit)
    .populate("user", "username avatar fullname")
    .lean();
};

module.exports = mongoose.model("post", postSchema);