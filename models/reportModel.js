const mongoose = require("mongoose");
const { Schema } = mongoose;

const reportSchema = new Schema(
  {
    reportType: {
      type: String,
      enum: ['post', 'comment', 'user', 'message'],
      required: true,
      index: true
    },
    targetId: {
      type: mongoose.Types.ObjectId,
      required: true,
      refPath: 'targetModel',
      index: true
    },
    targetModel: {
      type: String,
      required: true,
      enum: ['post', 'comment', 'user', 'message']
    },

    reportedBy: {
      type: mongoose.Types.ObjectId,
      ref: 'user',
      required: true,
      index: true
    },

    reason: {
      type: String,
      required: true,
      enum: [
        'spam',
        'harassment',
        'hate_speech',
        'violence',
        'nudity',
        'false_information',
        'scam',
        'copyright',
        'self_harm',
        'other'
      ],
      index: true
    },
    description: {
      type: String,
      maxlength: 500,
      trim: true
    },

    status: {
      type: String,
      enum: ['pending', 'reviewing', 'accepted', 'declined', 'resolved'],
      default: 'pending',
      index: true
    },

    reviewedBy: {
      type: mongoose.Types.ObjectId,
      ref: 'user'
    },
    reviewedAt: {
      type: Date
    },
    adminNote: {
      type: String,
      maxlength: 1000
    },
    actionTaken: {
      type: String,
      enum: ['none', 'warning', 'content_removed', 'account_suspended', 'account_banned'],
      default: 'none'
    },

    screenshots: [{
      url: String,
      publicId: String
    }],

    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'low',
      index: true
    },
    isResolved: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  {
    timestamps: true,
  }
);

reportSchema.index({ reportType: 1, status: 1, createdAt: -1 });
reportSchema.index({ targetId: 1, reportedBy: 1 }, { unique: true }); // Prevent duplicate reports
reportSchema.index({ status: 1, priority: -1, createdAt: -1 });
reportSchema.index({ reviewedBy: 1, status: 1 });

reportSchema.virtual('targetContent', {
  refPath: 'targetModel',
  localField: 'targetId',
  foreignField: '_id',
  justOne: true
});

reportSchema.methods.markAsReviewing = async function(adminId) {
  this.status = 'reviewing';
  this.reviewedBy = adminId;
  this.reviewedAt = new Date();
  return this.save();
};

reportSchema.methods.accept = async function(adminId, actionTaken, note) {
  this.status = 'accepted';
  this.reviewedBy = adminId;
  this.reviewedAt = new Date();
  this.actionTaken = actionTaken || 'content_removed';
  this.adminNote = note;
  this.isResolved = true;
  return this.save();
};

reportSchema.methods.decline = async function(adminId, note) {
  this.status = 'declined';
  this.reviewedBy = adminId;
  this.reviewedAt = new Date();
  this.adminNote = note;
  this.isResolved = true;
  return this.save();
};

reportSchema.statics.getPendingCount = function() {
  return this.countDocuments({ status: 'pending' });
};

reportSchema.statics.getHighPriorityReports = function(limit = 10) {
  return this.find({ 
    status: { $in: ['pending', 'reviewing'] },
    priority: { $in: ['high', 'critical'] }
  })
    .populate('reportedBy', 'username avatar email')
    .populate('reviewedBy', 'username avatar')
    .sort('-priority -createdAt')
    .limit(limit);
};

module.exports = mongoose.model("report", reportSchema);