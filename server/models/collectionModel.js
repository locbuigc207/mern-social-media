// server/models/collectionModel.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const collectionSchema = new Schema(
  {
    user: {
      type: mongoose.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      maxlength: 500,
      default: "",
    },
    posts: [
      {
        type: mongoose.Types.ObjectId,
        ref: "post",
      },
    ],
    isPrivate: {
      type: Boolean,
      default: false,
    },
    coverImage: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

collectionSchema.index({ user: 1, name: 1 }, { unique: true });
collectionSchema.index({ user: 1, updatedAt: -1 });

module.exports = mongoose.model("collection", collectionSchema);