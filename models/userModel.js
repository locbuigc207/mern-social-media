const mongoose = require('mongoose');
const { Schema } = mongoose;

const userSchema = new Schema(
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
    },
    email: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    avatar: {
      type: String,
      default:
        "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460__340.png",
    },
    role: {
      type: String,
      default: "user",
    },
    gender: {
      type: String,
      default: "male",
    },
    mobile: {
      type: String,
      default: "",
    },
    address: {
      type: String,
      default: "",
    },
    saved: [
      {
        type: mongoose.Types.ObjectId,
        ref: 'post'
      }
    ],
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
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationToken: {
      type: String,
    },
    verificationTokenExpires: {
      type: Date,
    },
    resetPasswordToken: {
      type: String,
    },
    resetPasswordExpires: {
      type: Date,
    },
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
    privacySettings: {
      profileVisibility: {
        type: String,
        enum: ['public', 'private', 'friends'],
        default: 'public'
      },
      whoCanMessage: {
        type: String,
        enum: ['everyone', 'following', 'none'],
        default: 'everyone'
      },
      whoCanComment: {
        type: String,
        enum: ['everyone', 'following', 'none'],
        default: 'everyone'
      },
      whoCanTag: {
        type: String,
        enum: ['everyone', 'following', 'none'],
        default: 'everyone'
      },
      showFollowers: {
        type: Boolean,
        default: true
      },
      showFollowing: {
        type: Boolean,
        default: true
      }
    },
    isBlocked: {
      type: Boolean,
      default: false
    },
    blockedReason: {
      type: String
    },
    blockedBy: {
      type: mongoose.Types.ObjectId,
      ref: "user"
    },
    blockedAt: {
      type: Date
    }
  },
  {
    timestamps: true,
  }
);

userSchema.index({ username: 1 });
userSchema.index({ email: 1 });
userSchema.index({ isBlocked: 1 });
userSchema.index({ role: 1 });

module.exports = mongoose.model('user', userSchema);