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
    },
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    twoFactorSecret: String,
  },
  {
    timestamps: true,
  }
);

userSchema.index({ username: 1 }, { unique: true });
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1, isBlocked: 1 });
userSchema.index({ followers: 1 });
userSchema.index({ following: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ blockedUsers: 1 });
userSchema.index({ blockedBy: 1 });
userSchema.index({ isVerified: 1, isBlocked: 1 });

userSchema.index({ username: "text", fullname: "text", email: "text" });

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

userSchema.pre("save", function (next) {
  if (this.isModified("email")) {
    this.email = this.email.toLowerCase();
  }
  if (this.isModified("username")) {
    this.username = this.username.toLowerCase();
  }
  next();
});

module.exports = mongoose.model("user", userSchema);
