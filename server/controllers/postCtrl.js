const Posts = require("../models/postModel");
const Comments = require("../models/commentModel");
const Users = require("../models/userModel");
const Reports = require("../models/reportModel");
const Notifies = require("../models/notifyModel");
const Hashtags = require("../models/hashtagModel");
const mongoose = require("mongoose");
const { uploadMultipleToCloudinary } = require("../services/cloudinaryService");
const {
  processHashtags,
  removePostFromHashtags,
} = require("../services/hashtagService");
const logger = require("../utils/logger");
const { asyncHandler } = require("../middleware/errorHandler");
const {
  ValidationError,
  NotFoundError,
  AuthorizationError,
} = require("../utils/AppError");
const notificationService = require("../services/notificationService");

class APIfeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  paginating() {
    const page = this.queryString.page * 1 || 1;
    const limit = this.queryString.limit * 1 || 9;
    const skip = (page - 1) * limit;
    this.query = this.query.skip(skip).limit(limit);
    return this;
  }
}

const postCtrl = {
  createPost: asyncHandler(async (req, res) => {
    const { content, status, scheduledDate, isDraft } = req.body;

    let images = [];
    if (req.files && req.files.length > 0) {
      logger.info("Uploading files to Cloudinary", {
        userId: req.user._id,
        fileCount: req.files.length,
      });

      const filePaths = req.files.map((file) => file.path);
      const uploadResult = await uploadMultipleToCloudinary(filePaths, {
        folder: "campus-connect/posts",
        resourceType: "auto",
      });

      if (!uploadResult.success) {
        logger.error("Cloudinary upload failed", null, {
          userId: req.user._id,
          errors: uploadResult.errors,
        });
        throw new ValidationError("Failed to upload some images.");
      }

      images = uploadResult.results.map((result) => ({
        url: result.url,
        publicId: result.publicId,
        type: result.type,
        width: result.width,
        height: result.height,
      }));

      logger.info("Files uploaded successfully", {
        userId: req.user._id,
        uploadedCount: images.length,
      });
    }

    if (!isDraft && status === "published") {
      if (images.length === 0 && (!content || content.trim().length === 0)) {
        throw new ValidationError(
          "Please add content or at least one photo/video."
        );
      }
    }

    if (status === "scheduled") {
      if (!scheduledDate) {
        throw new ValidationError("Please provide scheduled date.");
      }

      const scheduleDate = new Date(scheduledDate);
      if (scheduleDate <= new Date()) {
        throw new ValidationError("Scheduled date must be in the future.");
      }

      if (images.length === 0) {
        throw new ValidationError(
          "Scheduled posts must have at least one image."
        );
      }
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const newPost = new Posts({
        content: content || "",
        images,
        user: req.user._id,
        status: status || "published",
        isDraft: isDraft || false,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
        publishedAt: status === "published" ? new Date() : null,
      });

      await newPost.save({ session });

      if (content && status === "published") {
        await processHashtags(newPost._id, content, session);
      }

      await session.commitTransaction();

      logger.audit("Post created", req.user._id, {
        postId: newPost._id,
        status: newPost.status,
        imagesCount: images.length,
      });

      let message = "Post created successfully.";
      if (status === "scheduled") {
        message = "Post scheduled successfully.";
      } else if (isDraft) {
        message = "Draft saved successfully.";
      }

      res.json({
        msg: message,
        newPost: {
          ...newPost._doc,
          user: req.user,
        },
      });
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }),

  getPosts: asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 9;
    const skip = (page - 1) * limit;

    const currentUser = await Users.findById(req.user._id).select(
      "blockedUsers blockedBy following"
    );

    const excludedUserIds = [
      ...currentUser.blockedUsers,
      ...currentUser.blockedBy,
    ];

    const posts = await Posts.find({
      user: {
        $in: [...currentUser.following, req.user._id],
        $nin: excludedUserIds,
      },
      status: "published",
      isDraft: false,
      isHidden: false,
      hiddenBy: { $ne: req.user._id },
      moderationStatus: { $ne: "removed" },
    })
      .sort("-createdAt")
      .skip(skip)
      .limit(limit)
      .populate("user", "avatar username fullname")
      .populate({
        path: "comments",
        options: { limit: 5 },
        populate: {
          path: "user",
          select: "avatar username",
        },
      })
      .populate({
        path: "originalPost",
        populate: {
          path: "user",
          select: "username avatar fullname",
        },
      })
      .lean();

    res.json({
      msg: "Success",
      result: posts.length,
      posts,
    });
  }),

  getDraftPosts: asyncHandler(async (req, res) => {
    const features = new APIfeatures(
      Posts.find({
        user: req.user._id,
        isDraft: true,
        status: "draft",
      }),
      req.query
    ).paginating();

    const drafts = await features.query
      .sort("-updatedAt")
      .populate("user", "avatar username fullname");

    res.json({
      msg: "Success",
      result: drafts.length,
      drafts,
    });
  }),

  getScheduledPosts: asyncHandler(async (req, res) => {
    const features = new APIfeatures(
      Posts.find({
        user: req.user._id,
        status: "scheduled",
      }),
      req.query
    ).paginating();

    const scheduledPosts = await features.query
      .sort("scheduledDate")
      .populate("user", "avatar username fullname");

    res.json({
      msg: "Success",
      result: scheduledPosts.length,
      scheduledPosts,
    });
  }),

  saveDraft: asyncHandler(async (req, res) => {
    const { content, images } = req.body;

    const newDraft = new Posts({
      content,
      images: images || [],
      user: req.user._id,
      status: "draft",
      isDraft: true,
    });

    await newDraft.save();

    res.json({
      msg: "Draft saved successfully.",
      draft: {
        ...newDraft._doc,
        user: req.user,
      },
    });
  }),

  publishDraft: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const post = await Posts.findOne({
        _id: id,
        user: req.user._id,
        isDraft: true,
      }).session(session);

      if (!post) {
        await session.abortTransaction();
        throw new NotFoundError("Draft not found.");
      }

      if (post.images.length === 0) {
        await session.abortTransaction();
        throw new ValidationError(
          "Please add at least one image before publishing."
        );
      }

      post.status = "published";
      post.isDraft = false;
      post.publishedAt = new Date();
      await post.save({ session });

      if (post.content) {
        await processHashtags(post._id, post.content, session);
      }

      await session.commitTransaction();

      const populatedPost = await Posts.findById(id)
        .populate("user likes", "avatar username fullname followers")
        .populate({
          path: "comments",
          populate: {
            path: "user likes",
            select: "-password",
          },
        });

      res.json({
        msg: "Draft published successfully.",
        post: populatedPost,
      });
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }),

  updateDraft: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { content, images } = req.body;

    const draft = await Posts.findOne({
      _id: id,
      user: req.user._id,
      isDraft: true,
    });

    if (!draft) {
      throw new NotFoundError("Draft not found.");
    }

    draft.content = content;
    draft.images = images;
    await draft.save();

    res.json({
      msg: "Draft updated successfully.",
      draft,
    });
  }),

  deleteDraft: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const draft = await Posts.findOneAndDelete({
      _id: id,
      user: req.user._id,
      isDraft: true,
    });

    if (!draft) {
      throw new NotFoundError("Draft not found.");
    }
    res.json({ msg: "Draft deleted successfully." });
  }),

  schedulePost: asyncHandler(async (req, res) => {
    const { content, images, scheduledDate } = req.body;

    if (!images || images.length === 0) {
      throw new ValidationError("Please add photo(s)");
    }

    if (!scheduledDate) {
      throw new ValidationError("Please provide scheduled date.");
    }

    const scheduleDate = new Date(scheduledDate);
    if (scheduleDate <= new Date()) {
      throw new ValidationError("Scheduled date must be in the future.");
    }

    const newPost = new Posts({
      content,
      images,
      user: req.user._id,
      status: "scheduled",
      scheduledDate: scheduleDate,
      isDraft: false,
    });

    await newPost.save();

    res.json({
      msg: `Post scheduled for ${scheduleDate.toLocaleString()}.`,
      post: {
        ...newPost._doc,
        user: req.user,
      },
    });
  }),

  updateScheduledPost: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { content, images, scheduledDate } = req.body;

    const post = await Posts.findOne({
      _id: id,
      user: req.user._id,
      status: "scheduled",
    });

    if (!post) {
      throw new NotFoundError("Scheduled post not found.");
    }

    if (scheduledDate) {
      const scheduleDate = new Date(scheduledDate);
      if (scheduleDate <= new Date()) {
        throw new ValidationError("Scheduled date must be in the future.");
      }
      post.scheduledDate = scheduleDate;
    }

    if (content) post.content = content;
    if (images) post.images = images;

    await post.save();

    res.json({
      msg: "Scheduled post updated successfully.",
      post,
    });
  }),

  cancelScheduledPost: asyncHandler(async (req, res) => {
    const { id } = req.params;

    const post = await Posts.findOne({
      _id: id,
      user: req.user._id,
      status: "scheduled",
    });

    if (!post) {
      throw new NotFoundError("Scheduled post not found.");
    }

    post.status = "draft";
    post.isDraft = true;
    post.scheduledDate = null;
    await post.save();

    res.json({
      msg: "Scheduled post cancelled and saved as draft.",
      post,
    });
  }),

  updatePost: asyncHandler(async (req, res) => {
    const { content } = req.body;
    let images = [];

    if (req.files && req.files.length > 0) {
      const filePaths = req.files.map((file) => file.path);
      const uploadResult = await uploadMultipleToCloudinary(filePaths, {
        folder: "campus-connect/posts",
        resourceType: "auto",
      });

      if (uploadResult.success) {
        images = uploadResult.results.map((result) => ({
          url: result.url,
          publicId: result.publicId,
          type: result.type,
          width: result.width,
          height: result.height,
        }));
      }
    }

    const existingPost = await Posts.findById(req.params.id);
    if (!existingPost) {
      throw new NotFoundError("Post not found.");
    }

    if (existingPost.user.toString() !== req.user._id.toString()) {
      throw new AuthorizationError("Unauthorized.");
    }

    if (existingPost.isShared) {
      throw new ValidationError(
        "Cannot edit shared posts. You can only update the share caption."
      );
    }

    const existingImages = JSON.parse(req.body.existingImages || "[]");
    const finalImages = [...existingImages, ...images];

    if (existingPost.status === "published" && !existingPost.isDraft) {
      if (
        finalImages.length === 0 &&
        (!content || content.trim().length === 0)
      ) {
        throw new ValidationError(
          "Post must have content or at least one image."
        );
      }
    }

    const post = await Posts.findByIdAndUpdate(
      req.params.id,
      {
        content: content !== undefined ? content : existingPost.content,
        images: finalImages,
      },
      { new: true }
    )
      .populate("user likes", "avatar username fullname")
      .populate({
        path: "comments",
        populate: {
          path: "user likes",
          select: "-password",
        },
      });

    logger.audit("Post updated", req.user._id, {
      postId: req.params.id,
      newImagesCount: images.length,
    });

    res.json({
      msg: "Post updated successfully.",
      newPost: post,
    });
  }),

  likePost: asyncHandler(async (req, res) => {
    const post = await Posts.findOneAndUpdate(
      {
        _id: req.params.id,
        likes: { $ne: req.user._id },
        status: "published",
        moderationStatus: { $ne: "removed" },
      },
      {
        $addToSet: { likes: req.user._id },
      },
      { new: true }
    ).populate("user", "username avatar fullname");

    if (!post) {
      const existingPost = await Posts.findById(req.params.id);
      if (!existingPost) {
        throw new NotFoundError("Post");
      }

      if (existingPost.moderationStatus === "removed") {
        throw new ValidationError("This post has been removed.");
      }

      return res.status(400).json({
        msg: "You have already liked this post",
      });
    }

    await notificationService.notifyLikePost(post, req.user);

    res.json({
      msg: "Post liked successfully.",
      likesCount: post.likes.length,
    });
  }),

  unLikePost: asyncHandler(async (req, res) => {
    const post = await Posts.findOneAndUpdate(
      {
        _id: req.params.id,
        likes: req.user._id,
      },
      {
        $pull: { likes: req.user._id },
      },
      { new: true }
    );

    if (!post) {
      const existingPost = await Posts.findById(req.params.id);
      if (!existingPost) {
        throw new NotFoundError("Post");
      }
      return res.status(400).json({
        msg: "You haven't liked this post",
      });
    }

    await notificationService.removeNotifyLikePost(req.params.id, req.user._id);

    res.json({
      msg: "Post unliked successfully.",
      likesCount: post.likes.length,
    });
  }),

  getUserPosts: asyncHandler(async (req, res) => {
  const features = new APIfeatures(
    Posts.find({
      user: req.params.id,
      status: "published",
      isDraft: false,
    }),
    req.query
  ).paginating();

  const posts = await features.query
    .sort("-createdAt")
    .populate("user", "avatar username fullname")
    .populate({
      path: "comments",
      populate: {
        path: "user",
        select: "avatar username fullname"
      }
    })
    .populate({
      path: "originalPost",
      populate: {
        path: "user",
        select: "avatar username fullname"
      }
    });

  res.json({
    posts,
    result: posts.length,
  });
}),

  getPost: asyncHandler(async (req, res) => {
    const post = await Posts.findById(req.params.id)
      .populate("user", "avatar username fullname followers")
      .populate({
        path: "comments",
        populate: {
          path: "user likes",
          select: "-password",
        },
      })
      .populate({
        path: "originalPost",
        select: "content images createdAt user",
        populate: {
          path: "user",
          select: "username avatar fullname",
        },
      });

    if (!post) {
      throw new NotFoundError("Post");
    }

    const postOwner = await Users.findById(post.user._id).select(
      "blockedUsers"
    );
    if (postOwner.blockedUsers.includes(req.user._id)) {
      throw new AuthorizationError("You cannot view this post.");
    }

    res.json({ post });
  }),

  getPostDiscover: asyncHandler(async (req, res) => {
    const newArr = [...req.user.following, req.user._id];
    const num = req.query.num || 8;

    const posts = await Posts.aggregate([
      {
        $match: {
          user: { $nin: newArr },
          status: "published",
          isDraft: false,
        },
      },
      { $sample: { size: Number(num) } },
    ]);

    res.json({
      msg: "Success",
      result: posts.length,
      posts,
    });
  }),

  deletePost: asyncHandler(async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const post = await Posts.findOne({
        _id: req.params.id,
        user: req.user._id,
      }).session(session);

      if (!post) {
        await session.abortTransaction();
        throw new NotFoundError("Post");
      }

      if (post.isShared && post.originalPost) {
        const originalPost = await Posts.findById(post.originalPost).session(
          session
        );
        if (originalPost) {
          originalPost.shares = originalPost.shares.filter(
            (id) => id.toString() !== req.params.id
          );
          await originalPost.decrementShareCount();
          await originalPost.save({ session });
        }
      }

      if (post.shareCount > 0 && post.shares.length > 0) {
        await Posts.deleteMany({
          _id: { $in: post.shares },
        }).session(session);
      }

      await Comments.deleteMany({
        _id: { $in: post.comments },
      }).session(session);

      await Reports.deleteMany({
        targetId: req.params.id,
        reportType: "post",
      }).session(session);

      await Notifies.deleteMany({
        id: req.params.id,
      }).session(session);

      await Users.updateMany(
        { saved: req.params.id },
        { $pull: { saved: req.params.id } }
      ).session(session);

      if (post.content) {
        await removePostFromHashtags(req.params.id, post.content, session);
      }

      if (post.isShared && post.shareCaption) {
        await removePostFromHashtags(req.params.id, post.shareCaption, session);
      }

      await Posts.findByIdAndDelete(req.params.id).session(session);

      await session.commitTransaction();

      res.json({
        msg: "Post deleted successfully.",
        newPost: {
          ...post.toObject(),
          user: req.user,
        },
      });
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }),

  reportPost: asyncHandler(async (req, res) => {
    const { reason, description, priority } = req.body;

    if (!reason) throw new ValidationError("Report reason is required.");

    const validReasons = [
      "spam",
      "harassment",
      "hate_speech",
      "violence",
      "nudity",
      "false_information",
      "scam",
      "copyright",
      "self_harm",
      "terrorism",
      "child_exploitation",
      "other",
    ];

    if (!validReasons.includes(reason))
      throw new ValidationError("Invalid report reason.");

    if (!description || description.trim().length < 10) {
      throw new ValidationError(
        "Please provide a detailed description (at least 10 characters)."
      );
    }

    const existingReport = await Reports.findOne({
      reportType: "post",
      targetId: req.params.id,
      reportedBy: req.user._id,
    });

    if (existingReport)
      throw new ValidationError("You have already reported this post.");

    const post = await Posts.findById(req.params.id);
    if (!post) throw new NotFoundError("Post");

    const priorityMap = {
      child_exploitation: "critical",
      terrorism: "critical",
      self_harm: "critical",
      violence: "high",
      harassment: "high",
      hate_speech: "high",
      nudity: "medium",
      scam: "medium",
      false_information: "medium",
      spam: "low",
      other: "low",
    };

    const finalPriority = priority || priorityMap[reason] || "low";

    const newReport = new Reports({
      reportType: "post",
      targetId: req.params.id,
      targetModel: "post",
      reportedBy: req.user._id,
      reason,
      description: description.trim(),
      priority: finalPriority,
      status: "pending",
    });
    await newReport.save();

    if (finalPriority === "critical" || finalPriority === "high") {
      await notificationService.notifyAdminsNewReport(newReport, req.user);
    }

    await Posts.findByIdAndUpdate(req.params.id, {
      $push: { reports: newReport._id },
    });
    if (typeof post.incrementReportCount === "function") {
      await post.incrementReportCount();
    }

    res.json({
      msg: "Post reported successfully.",
      report: {
        _id: newReport._id,
        reason: newReport.reason,
        status: newReport.status,
      },
    });
  }),

  hidePost: asyncHandler(async (req, res) => {
    const { reason } = req.body;
    const post = await Posts.findById(req.params.id).populate("user", "_id");

    if (!post) throw new NotFoundError("Post not found.");
    if (post.user._id.toString() === req.user._id.toString()) {
      throw new ValidationError("You cannot hide your own post.");
    }
    if (post.hiddenBy.includes(req.user._id)) {
      throw new ValidationError("You have already hidden this post.");
    }

    await post.hidePost(req.user._id, reason || "User preference");

    await notificationService.notifyPostHidden(
      post,
      req.user._id,
      reason || "Your post has been hidden by another user"
    );

    res.json({
      msg: "Post hidden successfully.",
      post: { _id: post._id, isHidden: true },
    });
  }),

  unhidePost: asyncHandler(async (req, res) => {
    const post = await Posts.findById(req.params.id);

    if (!post) throw new NotFoundError("Post not found.");
    if (!post.hiddenBy.includes(req.user._id)) {
      throw new ValidationError("This post is not hidden by you.");
    }

    await post.unhidePost(req.user._id);

    res.json({
      msg: "Post unhidden successfully.",
      post: { _id: post._id, isHidden: post.isHidden },
    });
  }),

  savePost: asyncHandler(async (req, res) => {
    const user = await Users.findOne({
      _id: req.user._id,
      saved: req.params.id,
    });
    if (user) throw new ValidationError("You have already saved this post.");

    const save = await Users.findOneAndUpdate(
      { _id: req.user._id },
      { $push: { saved: req.params.id } },
      { new: true }
    );

    if (!save) throw new ValidationError("User does not exist.");
    res.json({ msg: "Post saved successfully." });
  }),

  unSavePost: asyncHandler(async (req, res) => {
    const save = await Users.findOneAndUpdate(
      { _id: req.user._id },
      { $pull: { saved: req.params.id } },
      { new: true }
    );

    if (!save) throw new ValidationError("User does not exist.");
    res.json({ msg: "Post removed from collection successfully." });
  }),

  getSavePost: asyncHandler(async (req, res) => {
    const features = new APIfeatures(
      Posts.find({
        _id: { $in: req.user.saved },
        status: "published",
        isDraft: false,
      }),
      req.query
    ).paginating();

    const savePosts = await features.query.sort("-createdAt");
    res.json({ savePosts, result: savePosts.length });
  }),

  getHiddenPosts: asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const hiddenPosts = await Posts.find({
      hiddenBy: req.user._id,
      status: "published",
      isDraft: false,
    })
      .populate("user", "username avatar fullname")
      .sort("-updatedAt")
      .skip(skip)
      .limit(limit);

    const total = await Posts.countDocuments({
      hiddenBy: req.user._id,
      status: "published",
      isDraft: false,
    });

    res.json({
      hiddenPosts,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  }),

  unhideAllPosts: asyncHandler(async (req, res) => {
    const result = await Posts.updateMany(
      { hiddenBy: req.user._id },
      {
        $pull: { hiddenBy: req.user._id },
        $set: { isHidden: false },
      }
    );

    res.json({
      msg: `Successfully unhidden ${result.modifiedCount} post(s).`,
      count: result.modifiedCount,
    });
  }),

  sharePost: asyncHandler(async (req, res) => {
    const { postId } = req.params;
    const { shareCaption } = req.body;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const originalPost = await Posts.findById(postId)
        .session(session)
        .populate("user", "username avatar fullname");

      if (!originalPost) {
        await session.abortTransaction();
        throw new NotFoundError("Post");
      }

      if (!originalPost.canBeShared()) {
        await session.abortTransaction();
        throw new ValidationError("This post cannot be shared.");
      }

      const existingShare = await Posts.findOne({
        user: req.user._id,
        originalPost: postId,
        isShared: true,
        status: "published",
      }).session(session);

      if (existingShare) {
        await session.abortTransaction();
        return res.status(400).json({
          msg: "You have already shared this post.",
          sharedPost: existingShare,
        });
      }

      const originalPostOwner = await Users.findById(originalPost.user).session(
        session
      );

      if (originalPostOwner.blockedUsers.includes(req.user._id)) {
        await session.abortTransaction();
        throw new AuthorizationError("You cannot share this post.");
      }

      const sharedPost = new Posts({
        content: originalPost.content,
        images: originalPost.images,
        user: req.user._id,
        isShared: true,
        originalPost: postId,
        shareCaption: shareCaption || "",
        status: "published",
        publishedAt: new Date(),
      });

      await sharedPost.save({ session });

      await originalPost.incrementShareCount();

      originalPost.shares.push(sharedPost._id);
      await originalPost.save({ session });

      if (shareCaption) {
        await processHashtags(sharedPost._id, shareCaption, session);
      }

      await notificationService.notifySharePost(
        originalPost,
        sharedPost,
        req.user
      );

      await session.commitTransaction();

      const populatedShare = await Posts.findById(sharedPost._id)
        .populate("user", "username avatar fullname followers")
        .populate({
          path: "originalPost",
          populate: {
            path: "user",
            select: "username avatar fullname",
          },
        });

      logger.audit("Post shared", req.user._id, {
        sharedPostId: sharedPost._id,
        originalPostId: postId,
      });

      res.json({
        msg: "Post shared successfully!",
        sharedPost: populatedShare,
      });
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }),

  unsharePost: asyncHandler(async (req, res) => {
    const { postId } = req.params;
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const sharedPost = await Posts.findOne({
        _id: postId,
        user: req.user._id,
        isShared: true,
      }).session(session);

      if (!sharedPost) {
        await session.abortTransaction();
        throw new NotFoundError("Shared post");
      }

      const originalPostId = sharedPost.originalPost;

      await Comments.deleteMany({
        _id: { $in: sharedPost.comments },
      }).session(session);

      if (sharedPost.shareCaption) {
        await removePostFromHashtags(
          sharedPost._id,
          sharedPost.shareCaption,
          session
        );
      }

      await Notifies.deleteMany({
        id: sharedPost._id,
      }).session(session);

      await Users.updateMany(
        { saved: sharedPost._id },
        { $pull: { saved: sharedPost._id } }
      ).session(session);

      const originalPost = await Posts.findById(originalPostId).session(
        session
      );
      if (originalPost) {
        originalPost.shares = originalPost.shares.filter(
          (id) => id.toString() !== postId
        );
        await originalPost.decrementShareCount();
        await originalPost.save({ session });
      }

      await Posts.findByIdAndDelete(postId).session(session);

      await session.commitTransaction();

      logger.audit("Post unshared", req.user._id, {
        sharedPostId: postId,
        originalPostId,
      });

      res.json({
        msg: "Post unshared successfully.",
      });
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }),

  getPostShares: asyncHandler(async (req, res) => {
    const { postId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const originalPost = await Posts.findById(postId);

    if (!originalPost) {
      throw new NotFoundError("Post");
    }

    const shares = await Posts.find({
      originalPost: postId,
      isShared: true,
      status: "published",
      isDraft: false,
    })
      .populate("user", "username avatar fullname")
      .populate({
        path: "originalPost",
        populate: {
          path: "user",
          select: "username avatar fullname",
        },
      })
      .sort("-createdAt")
      .skip(skip)
      .limit(limit);

    const total = await Posts.countDocuments({
      originalPost: postId,
      isShared: true,
      status: "published",
      isDraft: false,
    });

    logger.info("Post shares retrieved", {
      postId,
      sharesCount: shares.length,
      userId: req.user._id,
    });

    res.json({
      shares,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      shareCount: originalPost.shareCount,
    });
  }),

  getUserShares: asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const shares = await Posts.find({
      user: userId,
      isShared: true,
      status: "published",
      isDraft: false,
    })
      .populate("user", "username avatar fullname")
      .populate({
        path: "originalPost",
        populate: {
          path: "user",
          select: "username avatar fullname",
        },
      })
      .sort("-createdAt")
      .skip(skip)
      .limit(limit);

    const total = await Posts.countDocuments({
      user: userId,
      isShared: true,
      status: "published",
      isDraft: false,
    });

    res.json({
      shares,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  }),

  getMostSharedPosts: asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit) || 10;
    const timeRange = req.query.timeRange;

    let timeRangeMs = null;
    if (timeRange === "day") {
      timeRangeMs = 24 * 60 * 60 * 1000;
    } else if (timeRange === "week") {
      timeRangeMs = 7 * 24 * 60 * 60 * 1000;
    } else if (timeRange === "month") {
      timeRangeMs = 30 * 24 * 60 * 60 * 1000;
    }

    const mostSharedPosts = await Posts.getMostShared(limit, timeRangeMs);

    logger.info("Most shared posts retrieved", {
      count: mostSharedPosts.length,
      timeRange: timeRange || "all",
      userId: req.user._id,
    });

    res.json({
      posts: mostSharedPosts,
      count: mostSharedPosts.length,
      timeRange: timeRange || "all",
    });
  }),

  checkIfShared: asyncHandler(async (req, res) => {
    const { postId } = req.params;

    const sharedPost = await Posts.findOne({
      user: req.user._id,
      originalPost: postId,
      isShared: true,
      status: "published",
    }).select("_id createdAt");

    res.json({
      isShared: !!sharedPost,
      sharedPost: sharedPost || null,
    });
  }),
};

module.exports = postCtrl;