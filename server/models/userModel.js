const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    fullname: {
      type: String,
      required: true,
      trim: true,
      maxlength: 25,
    },
    username: {
      type: String,
      required: true,
      trim: true,
      maxlength: 25,
      unique: true,
      lowercase: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    avatar: {
      type: String,
      default:
        "https://res.cloudinary.com/devatchannel/image/upload/v1602752402/avatar/avatar_cugq40.png",
    },
    coverPhoto: {
      type: String,
      default: "",
    },
    bio: {
      type: String,
      default: "",
      maxlength: 200,
    },
    location: {
      type: String,
      default: "",
    },
    role: {
      type: String,
      default: "user",
      enum: ["user", "admin", "moderator"],
      index: true,
    },
    gender: {
      type: String,
      default: "male",
      enum: ["male", "female", "other"],
    },
    mobile: {
      type: String,
      default: "",
    },
    address: {
      type: String,
      default: "",
    },
    story: {
      type: String,
      default: "",
      maxlength: 200,
    },
    website: {
      type: String,
      default: "",
    },
    followers: [
      {
        type: mongoose.Types.ObjectId,
        ref: "user",
      },
    ],
    following: [
      {
        type: mongoose.Types.ObjectId,
        ref: "user",
      },
    ],
    closeFriends: [
      {
        type: mongoose.Types.ObjectId,
        ref: "user",
      },
    ],
    saved: [
      {
        type: mongoose.Types.ObjectId,
        ref: "post",
      },
    ],
    blockedUsers: [
      {
        type: mongoose.Types.ObjectId,
        ref: "user",
      },
    ],
    blockedBy: [
      {
        type: mongoose.Types.ObjectId,
        ref: "user",
      },
    ],
    reports: [
      {
        type: mongoose.Types.ObjectId,
        ref: "report",
      },
    ],
    isVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
    verificationToken: String,
    verificationTokenExpires: Date,

    isBlocked: {
      type: Boolean,
      default: false,
      index: true,
    },
    blockedReason: String,
    blockedByAdmin: {
      type: mongoose.Types.ObjectId,
      ref: "user",
    },
    blockedAt: Date,
    
    isBanned: {
      type: Boolean,
      default: false,
      index: true,
    },
    bannedReason: String,
    bannedAt: Date,
    
    suspendedUntil: {
      type: Date,
      index: true,
    },
    
    blockHistory: [
      {
        blockedAt: {
          type: Date,
          default: Date.now,
        },
        blockedBy: {
          type: mongoose.Types.ObjectId,
          ref: "user",
        },
        reason: String,
        actionTaken: {
          type: String,
          enum: ["warning", "content_removed", "account_suspended", "account_banned"],
        },
        unblockedAt: Date,
        unblockedBy: {
          type: mongoose.Types.ObjectId,
          ref: "user",
        },
        reportId: {
          type: mongoose.Types.ObjectId,
          ref: "report",
        },
      },
    ],
    
    warningCount: {
      type: Number,
      default: 0,
      index: true,
    },
    lastWarningAt: Date,
    warnings: [
      {
        warnedAt: {
          type: Date,
          default: Date.now,
        },
        warnedBy: {
          type: mongoose.Types.ObjectId,
          ref: "user",
        },
        reason: String,
        reportId: {
          type: mongoose.Types.ObjectId,
          ref: "report",
        },
      },
    ],
    
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    resetAttempts: {
      type: Number,
      default: 0,
    },
    lastResetAttempt: Date,
    previousResetTokens: [
      {
        token: String,
        invalidatedAt: Date,
      },
    ],
    tokenVersion: {
      type: Number,
      default: 0,
      index: true,
    },
    privacySettings: {
      profileVisibility: {
        type: String,
        enum: ["public", "private", "friends"],
        default: "public",
      },
      whoCanMessage: {
        type: String,
        enum: ["everyone", "following", "none"],
        default: "everyone",
      },
      whoCanComment: {
        type: String,
        enum: ["everyone", "following", "none"],
        default: "everyone",
      },
      whoCanTag: {
        type: String,
        enum: ["everyone", "following", "none"],
        default: "everyone",
      },
      showFollowers: {
        type: Boolean,
        default: true,
      },
      showFollowing: {
        type: Boolean,
        default: true,
      },
    },
    lastActive: {
      type: Date,
      default: Date.now,
      index: true,
    },
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    twoFactorSecret: String,
    lastLoginAt: {
      type: Date,
      index: true,
    },
    loginCount: {
      type: Number,
      default: 0,
    },
    lastLoginIP: String,
    lastLoginDevice: String,
  },
  {
    timestamps: true,
  }
);

userSchema.index({ role: 1, isBlocked: 1 });
userSchema.index({ followers: 1 });
userSchema.index({ following: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ blockedUsers: 1 });
userSchema.index({ blockedBy: 1 });
userSchema.index({ isVerified: 1, isBlocked: 1 });
userSchema.index({ username: "text", fullname: "text", email: "text" });
userSchema.index({ role: 1, isBlocked: 1, isVerified: 1 });
userSchema.index({ lastActive: -1 });

userSchema.index({ isBlocked: 1, isBanned: 1, suspendedUntil: 1 });

userSchema.methods.isCurrentlyBlocked = function () {
  if (this.isBanned) return true;
  if (this.isBlocked) return true;
  if (this.suspendedUntil && this.suspendedUntil > new Date()) return true;
  return false;
};

userSchema.methods.checkAndUnblockIfExpired = async function () {
  if (this.suspendedUntil && this.suspendedUntil < new Date()) {
    this.isBlocked = false;
    this.suspendedUntil = null;
    this.blockedReason = null;
    
    if (this.blockHistory.length > 0) {
      const lastBlock = this.blockHistory[this.blockHistory.length - 1];
      if (!lastBlock.unblockedAt) {
        lastBlock.unblockedAt = new Date();
        lastBlock.unblockedBy = null; 
      }
    }
    
    await this.save();
    return true;
  }
  return false;
};

userSchema.methods.blockUser = async function (blockedBy, reason, actionTaken, reportId, duration = null) {
  this.isBlocked = true;
  this.blockedReason = reason;
  this.blockedByAdmin = blockedBy;
  this.blockedAt = new Date();
  
  if (actionTaken === "account_banned") {
    this.isBanned = true;
    this.bannedReason = reason;
    this.bannedAt = new Date();
  }
  
  if (duration && actionTaken === "account_suspended") {
    this.suspendedUntil = new Date(Date.now() + duration);
  }
  
  this.tokenVersion = (this.tokenVersion || 0) + 1;
  
  this.blockHistory.push({
    blockedAt: new Date(),
    blockedBy: blockedBy,
    reason: reason,
    actionTaken: actionTaken,
    reportId: reportId,
  });
  
  await this.save();
};

userSchema.methods.unblockUser = async function (unblockedBy) {
  this.isBlocked = false;
  this.blockedReason = null;
  this.blockedByAdmin = null;
  this.blockedAt = null;
  this.suspendedUntil = null;

  if (this.blockHistory.length > 0) {
    const lastBlock = this.blockHistory[this.blockHistory.length - 1];
    if (!lastBlock.unblockedAt) {
      lastBlock.unblockedAt = new Date();
      lastBlock.unblockedBy = unblockedBy;
    }
  }
  
  await this.save();
};

userSchema.methods.addWarning = async function (warnedBy, reason, reportId) {
  this.warningCount = (this.warningCount || 0) + 1;
  this.lastWarningAt = new Date();
  
  this.warnings.push({
    warnedAt: new Date(),
    warnedBy: warnedBy,
    reason: reason,
    reportId: reportId,
  });
  
  await this.save();
};

userSchema.methods.getBlockStatus = function () {
  if (this.isBanned) {
    return {
      isBlocked: true,
      type: "permanent_ban",
      reason: this.bannedReason || this.blockedReason,
      blockedAt: this.bannedAt || this.blockedAt,
      canAppeal: true,
    };
  }
  
  if (this.suspendedUntil && this.suspendedUntil > new Date()) {
    return {
      isBlocked: true,
      type: "temporary_suspension",
      reason: this.blockedReason,
      blockedAt: this.blockedAt,
      expiresAt: this.suspendedUntil,
      canAppeal: true,
    };
  }
  
  if (this.isBlocked) {
    return {
      isBlocked: true,
      type: "admin_block",
      reason: this.blockedReason,
      blockedAt: this.blockedAt,
      canAppeal: true,
    };
  }
  
  return {
    isBlocked: false,
    type: null,
  };
};


userSchema.methods.canResetPassword = function () {
  if (this.resetAttempts >= 5) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    if (this.lastResetAttempt && this.lastResetAttempt > oneHourAgo) {
      return false;
    }
    this.resetAttempts = 0;
  }
  return true;
};

userSchema.methods.incrementResetAttempts = async function () {
  this.resetAttempts += 1;
  this.lastResetAttempt = new Date();
  await this.save();
};

userSchema.methods.resetPasswordAttempts = async function () {
  this.resetAttempts = 0;
  this.lastResetAttempt = undefined;
  await this.save();
};

userSchema.methods.invalidateAllSessions = async function () {
  this.tokenVersion += 1;
  await this.save();
};

userSchema.methods.updateLastLogin = async function (ip, device) {
  this.lastLoginAt = new Date();
  this.loginCount += 1;
  this.lastActive = new Date();
  if (ip) this.lastLoginIP = ip;
  if (device) this.lastLoginDevice = device;
  await this.save();
};

userSchema.pre("save", function (next) {
  if (this.isModified("email")) {
    this.email = this.email.toLowerCase();
  }
  if (this.isModified("username")) {
    this.username = this.username.toLowerCase();
  }
  next();
});

userSchema.post("save", function (doc) {
  if (this.isModified("isBlocked") && this.isBlocked) {
    const logger = require("../utils/logger");
    logger.audit("User blocked", doc._id, {
      reason: doc.blockedReason,
      blockedBy: doc.blockedByAdmin,
    });
  }
});

userSchema.post("find", async function (docs) {
  if (!docs || docs.length === 0) return;
  
  const now = new Date();
  const toUpdate = docs.filter(
    (doc) => doc.suspendedUntil && doc.suspendedUntil < now && doc.isBlocked
  );
  
  if (toUpdate.length > 0) {
    const logger = require("../utils/logger");
    logger.info(`Auto-unblocking ${toUpdate.length} users with expired suspensions`);
    
    for (const user of toUpdate) {
      await user.checkAndUnblockIfExpired();
    }
  }
});

module.exports = mongoose.model("user", userSchema);