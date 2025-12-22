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
        "group_invite",
        "group_removed",
        "group_role_changed",
        "friend_request",
        "friend_accept",
        "report_created",         
        "report_accepted",        
        "report_declined",        
        "report_resolved",        
        "content_removed",        
        "content_hidden",         
        "account_blocked",        
        "account_unblocked",      
        "warning",               
        "system_maintenance",    
        "policy_update",        
        "security_alert",     
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
    
    metadata: {
      reportId: { type: mongoose.Types.ObjectId, ref: "report" },
      reportType: String,
      reportReason: String,
      reportStatus: String,
      actionTaken: String,
      priority: String,
      
      blockType: String,
      expiresAt: Date,
      
      contentType: String,
      contentId: mongoose.Types.ObjectId,
      reason: String,
      
      groupId: { type: mongoose.Types.ObjectId, ref: "group" },
      groupName: String,
      newRole: String,
      
      ipAddress: String,
      device: String,
      location: String,
    },
  },
  {
    timestamps: true,
  }
);

notifySchema.index({ recipients: 1, createdAt: -1 });
notifySchema.index({ recipients: 1, isRead: 1 });
notifySchema.index({ user: 1, type: 1 });
notifySchema.index({ 'metadata.reportId': 1 });
notifySchema.index({ type: 1, createdAt: -1 });
notifySchema.index({ recipients: 1, type: 1, isRead: 1 });

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

notifySchema.methods.markAsRead = function() {
  this.isRead = true;
  return this.save();
};

notifySchema.methods.markAsUnread = function() {
  this.isRead = false;
  return this.save();
};

notifySchema.statics.getUnreadCount = function(userId) {
  return this.countDocuments({
    recipients: userId,
    isRead: false
  });
};

notifySchema.statics.markAllAsRead = function(userId) {
  return this.updateMany(
    { 
      recipients: userId,
      isRead: false 
    },
    { 
      $set: { isRead: true } 
    }
  );
};

notifySchema.statics.getByType = function(userId, type, options = {}) {
  const { page = 1, limit = 20 } = options;
  const skip = (page - 1) * limit;

  return this.find({
    recipients: userId,
    type: type
  })
    .populate("user", "username avatar fullname")
    .sort("-createdAt")
    .skip(skip)
    .limit(limit);
};

notifySchema.statics.deleteOldNotifications = async function(daysOld = 90) {
  const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
  
  return this.deleteMany({
    createdAt: { $lt: cutoffDate },
    isRead: true
  });
};

notifySchema.pre('save', function(next) {
  if (!this.url) {
    if (this.post) {
      this.url = `/post/${this.post}`;
    } else if (this.comment) {
      this.url = `/comment/${this.comment}`;
    } else if (this.metadata?.groupId) {
      this.url = `/group/${this.metadata.groupId}`;
    } else {
      this.url = "/notifications";
    }
  }
  next();
});

notifySchema.post('save', function(doc) {
  const logger = require('../utils/logger');
  logger.debug('Notification created', {
    id: doc._id,
    type: doc.type,
    recipients: doc.recipients.length
  });
});

module.exports = mongoose.model("notify", notifySchema);