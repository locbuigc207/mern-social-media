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
    },
    reports: [
      {
        type: mongoose.Types.ObjectId,
        ref: "user",
      },
    ],
    status: {
      type: String,
      enum: ['published', 'draft', 'scheduled'],
      default: 'published'
    },
    scheduledDate: {
      type: Date
    },
    publishedAt: {
      type: Date
    },
    isDraft: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
  }
);

postSchema.index({ scheduledDate: 1, status: 1 });
postSchema.index({ user: 1, createdAt: -1 });
postSchema.index({ status: 1, scheduledDate: 1 });
postSchema.index({ status: 1, isDraft: 1 });
postSchema.index({ user: 1, status: 1, isDraft: 1 });

module.exports = mongoose.model("post", postSchema);