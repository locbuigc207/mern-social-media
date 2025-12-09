const mongoose = require("mongoose");
const { Schema } = mongoose;

const storySchema = new Schema(
  {
    user: {
      type: mongoose.Types.ObjectId,
      ref: "user",
      required: true,
    },
    media: {
      url: {
        type: String,
        required: true,
      },
      public_id: String,
      type: {
        type: String,
        enum: ["image", "video"],
        required: true,
      },
      duration: Number, // For videos
      thumbnail: String, // For videos
    },
    caption: {
      type: String,
      maxlength: 500,
    },
    views: [
      {
        user: {
          type: mongoose.Types.ObjectId,
          ref: "user",
        },
        viewedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    replies: [
      {
        user: {
          type: mongoose.Types.ObjectId,
          ref: "user",
        },
        text: {
          type: String,
          required: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    isHighlight: {
      type: Boolean,
      default: false,
    },
    highlightName: String,
    privacy: {
      type: String,
      enum: ["public", "friends", "close_friends", "custom"],
      default: "public",
    },
    allowedViewers: [
      {
        type: mongoose.Types.ObjectId,
        ref: "user",
      },
    ],
    blockedViewers: [
      {
        type: mongoose.Types.ObjectId,
        ref: "user",
      },
    ],
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for automatic deletion - Only for non-highlights
storySchema.index(
  { expiresAt: 1 },
  { 
    expireAfterSeconds: 0,
    partialFilterExpression: { isHighlight: false }
  }
);

// Index for efficient queries
storySchema.index({ user: 1, isActive: 1, expiresAt: 1 });
storySchema.index({ user: 1, isHighlight: 1 });

// Middleware to set expiration time
storySchema.pre("save", function (next) {
  if (this.isNew && !this.isHighlight) {
    // Set expiration to 24 hours from now
    this.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  } else if (this.isHighlight && !this.expiresAt) {
    // Highlights don't expire
    this.expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  }
  next();
});

module.exports = mongoose.model("story", storySchema);