const mongoose = require("mongoose");
const { Schema } = mongoose;

const notifySchema = new Schema(
  {
    id: mongoose.Types.ObjectId,
    user: { type: mongoose.Types.ObjectId, ref: "user" },
    recipients: [mongoose.Types.ObjectId],
    url: String,
    text: String,
    content: String,
    image: String,
    isRead: {type:Boolean, default: false}
  },
  {
    timestamps: true,
  }
);

notifySchema.index({ recipients: 1, createdAt: -1 });
notifySchema.index({ user: 1 });
notifySchema.index({ isRead: 1 });

module.exports = mongoose.model("notify", notifySchema);
