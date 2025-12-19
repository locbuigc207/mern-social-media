const Posts = require("../models/postModel");
const Comments = require("../models/commentModel");
const Users = require("../models/userModel");
const Reports = require("../models/reportModel");
const Notifies = require("../models/notifyModel");
const Hashtags = require("../models/hashtagModel");
const mongoose = require("mongoose");
const { uploadMultipleToCloudinary } = require("../services/cloudinaryService");
const { processHashtags, removePostFromHashtags } = require("../services/hashtagService");
const logger = require("../utils/logger");
const { asyncHandler } = require("../middleware/errorHandler");
const { ValidationError, NotFoundError, AuthorizationError } = require("../utils/AppError");

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

    if (!isDraft && images.length === 0) {
      throw new ValidationError("Please add at least one photo or video.");
    }

    if (status === "scheduled") {
      if (!scheduledDate) {
        throw new ValidationError("Please provide scheduled date.");
      }

      const scheduleDate = new Date(scheduledDate);
      if (scheduleDate <= new Date()) {
        throw new ValidationError("Scheduled date must be in the future.");
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
    const features = new APIfeatures(
      Posts.find({
        user: [...req.user.following, req.user._id],
        status: "published",
        isDraft: false,
        isHidden: false,
        hiddenBy: { $ne: req.user._id },
        moderationStatus: { $ne: "removed" },
      }),
      req.query
    ).paginating();

    const posts = await features.query
      .sort("-createdAt")
      .populate("user", "avatar username fullname")
      .populate({
        path: "comments",
        options: { limit: 5 },
        populate: {
          path: "user",
          select: "avatar username",
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
        throw new ValidationError("Please add at least one image before publishing.");
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

    const existingImages = JSON.parse(req.body.existingImages || "[]");
    const finalImages = [...existingImages, ...images];

    const post = await Posts.findByIdAndUpdate(
      req.params.id,
      {
        content: content || existingPost.content,
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
        likes: { $ne: req.user._id }
      },
      {
        $addToSet: { likes: req.user._id }
      },
      { new: true }
    );

    if (!post) {
      const existingPost = await Posts.findById(req.params.id);
      if (!existingPost) {
        throw new NotFoundError('Post');
      }
      return res.status(400).json({
        msg: "You have already liked this post"
      });
    }

    res.json({
      msg: "Post liked successfully.",
      likesCount: post.likes.length
    });
  }),

  unLikePost: asyncHandler(async (req, res) => {
    const post = await Posts.findOneAndUpdate(
      {
        _id: req.params.id,
        likes: req.user._id
      },
      {
        $pull: { likes: req.user._id }
      },
      { new: true }
    );

    if (!post) {
      const existingPost = await Posts.findById(req.params.id);
      if (!existingPost) {
        throw new NotFoundError('Post');
      }
      return res.status(400).json({
        msg: "You haven't liked this post"
      });
    }

    res.json({
      msg: "Post unliked successfully.",
      likesCount: post.likes.length
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
    const posts = await features.query.sort("-createdAt");

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
          path: "user likes ",
          select: "-password",
        },
      });

    if (!post) {
      throw new NotFoundError("Post");
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
        throw new NotFoundError('Post');
      }

      await Promise.all([
        Comments.deleteMany({ _id: { $in: post.comments } }).session(session),
        Reports.deleteMany({
          targetId: req.params.id,
          reportType: 'post'
        }).session(session),
        Notifies.deleteMany({
          id: req.params.id
        }).session(session),
        Users.updateMany(
          { saved: req.params.id },
          { $pull: { saved: req.params.id } }
        ).session(session),
      ]);

      if (post.content) {
        await removePostFromHashtags(req.params.id, post.content, session);
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
      "spam", "harassment", "hate_speech", "violence", "nudity",
      "false_information", "scam", "copyright", "self_harm",
      "terrorism", "child_exploitation", "other",
    ];

    if (!validReasons.includes(reason)) throw new ValidationError("Invalid report reason.");

    if (!description || description.trim().length < 10) {
      throw new ValidationError("Please provide a detailed description (at least 10 characters).");
    }

    const existingReport = await Reports.findOne({
      reportType: "post",
      targetId: req.params.id,
      reportedBy: req.user._id,
    });

    if (existingReport) throw new ValidationError("You have already reported this post.");

    const post = await Posts.findById(req.params.id);
    if (!post) throw new NotFoundError("Post");

    const priorityMap = {
      child_exploitation: "critical", terrorism: "critical", self_harm: "critical",
      violence: "high", harassment: "high", hate_speech: "high",
      nudity: "medium", scam: "medium", false_information: "medium",
      spam: "low", other: "low"
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
    post.reports.push(newReport._id);
    await post.incrementReportCount();

    res.json({
      msg: "Post reported successfully.",
      report: { _id: newReport._id, reason: newReport.reason, status: newReport.status },
    });
  }),

  hidePost: asyncHandler(async (req, res) => {
    const { reason } = req.body;
    const post = await Posts.findById(req.params.id);

    if (!post) throw new NotFoundError("Post not found.");
    if (post.user.toString() === req.user._id.toString()) {
      throw new ValidationError("You cannot hide your own post.");
    }
    if (post.hiddenBy.includes(req.user._id)) {
      throw new ValidationError("You have already hidden this post.");
    }

    await post.hidePost(req.user._id, reason || "User preference");

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
    const user = await Users.findOne({ _id: req.user._id, saved: req.params.id });
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
};

module.exports = postCtrl;