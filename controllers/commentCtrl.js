const Comments = require("../models/commentModel");
const Posts = require("../models/postModel");
const Reports = require("../models/reportModel");
const Notifies = require("../models/notificationModel");
const logger = require("../utils/logger");
const notificationService = require("../services/notificationService");
const { asyncHandler } = require("../middleware/errorHandler");
const { NotFoundError, ValidationError } = require("../utils/AppError");
const { REPORT_REASONS, REPORT_PRIORITY } = require("../constants");

const commentCtrl = {
  createComment: asyncHandler(async (req, res) => {
  const { postId, content, tag, reply, postUserId } = req.body;

  const post = await Posts.findById(postId).populate(
    "user",
    "username avatar fullname"
  );
  if (!post) {
    throw new NotFoundError("Post");
  }

  let originalComment = null;
  if (reply) {
    originalComment = await Comments.findById(reply).populate(
      "user",
      "username avatar fullname"
    );
    if (!originalComment) {
      throw new NotFoundError("Comment");
    }
  }

  const newComment = new Comments({
    user: req.user._id,
    content,
    tag,
    reply,
    postUserId,
    postId,
  });

  await newComment.save();

  await Posts.findOneAndUpdate(
    { _id: postId },
    {
      $push: { comments: newComment._id },
    },
    { new: true }
  );

  if (reply && originalComment) {
    await notificationService.notifyReplyComment(
      post,
      originalComment,
      newComment,
      req.user
    );
  } else {
    await notificationService.notifyComment(post, newComment, req.user);
  }

  const mentionRegex = /@(\w+)/g;
  const mentions = content.match(mentionRegex);
  if (mentions) {
    const Users = require("../models/userModel");
    const usernames = mentions.map((m) => m.slice(1));
    const mentionedUsers = await Users.find({
      username: { $in: usernames },
    }).select("_id");

    if (mentionedUsers.length > 0) {
      await notificationService.notifyMention(
        mentionedUsers.map((u) => u._id),
        req.user,
        post,
        newComment
      );
    }
  }

  // POPULATE user trước khi trả về
  await newComment.populate("user", "avatar username fullname");

  res.json({ newComment });
}),

  updateComment: asyncHandler(async (req, res) => {
    const { content } = req.body;

    const comment = await Comments.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { content },
      { new: true }
    );

    if (!comment) {
      throw new NotFoundError("Comment");
    }

    res.json({ msg: "Comment updated successfully.", comment });
  }),

  likeComment: asyncHandler(async (req, res) => {
    const comment = await Comments.findOneAndUpdate(
      {
        _id: req.params.id,
        likes: { $ne: req.user._id },
      },
      {
        $addToSet: { likes: req.user._id },
      },
      { new: true }
    ).populate("user", "username avatar fullname");

    if (!comment) {
      const existingComment = await Comments.findById(req.params.id);
      if (!existingComment) {
        throw new NotFoundError("Comment");
      }
      return res.status(400).json({
        msg: "You have already liked this comment",
      });
    }

    const post = await Posts.findById(comment.postId);
    await notificationService.notifyLikeComment(comment, post, req.user);

    res.json({
      msg: "Comment liked successfully.",
      likesCount: comment.likes.length,
    });
  }),

  unLikeComment: asyncHandler(async (req, res) => {
    const comment = await Comments.findOneAndUpdate(
      {
        _id: req.params.id,
        likes: req.user._id,
      },
      {
        $pull: { likes: req.user._id },
      },
      { new: true }
    );

    if (!comment) {
      const existingComment = await Comments.findById(req.params.id);
      if (!existingComment) {
        throw new NotFoundError("Comment");
      }
      return res.status(400).json({
        msg: "You haven't liked this comment",
      });
    }

    res.json({
      msg: "Comment unliked successfully.",
      likesCount: comment.likes.length,
    });
  }),

  deleteComment: asyncHandler(async (req, res) => {
    const comment = await Comments.findOneAndDelete({
      _id: req.params.id,
      $or: [{ user: req.user._id }, { postUserId: req.user._id }],
    });

    if (!comment) {
      throw new NotFoundError("Comment");
    }

    await Posts.findOneAndUpdate(
      { _id: comment.postId },
      {
        $pull: { comments: req.params.id },
      }
    );

    res.json({ msg: "Comment deleted successfully." });
  }),

  reportComment: asyncHandler(async (req, res) => {
    const { reason, description, priority } = req.body;

    if (!reason) {
      throw new ValidationError("Report reason is required.");
    }

    const validReasons = Object.values(REPORT_REASONS);
    if (!validReasons.includes(reason)) {
      throw new ValidationError("Invalid report reason.");
    }

    if (!description || description.trim().length < 10) {
      throw new ValidationError(
        "Please provide a detailed description (at least 10 characters)."
      );
    }

    if (priority) {
      const validPriorities = Object.values(REPORT_PRIORITY);
      if (!validPriorities.includes(priority)) {
        throw new ValidationError("Invalid priority level.");
      }
    }

    const existingReport = await Reports.findOne({
      reportType: "comment",
      targetId: req.params.id,
      reportedBy: req.user._id,
    });

    if (existingReport) {
      return res.status(400).json({
        msg: "You have already reported this comment.",
      });
    }

    const comment = await Comments.findById(req.params.id);
    if (!comment) {
      throw new NotFoundError("Comment");
    }

    const priorityMap = {
      self_harm: REPORT_PRIORITY.CRITICAL,
      threats: REPORT_PRIORITY.CRITICAL,
      violence: REPORT_PRIORITY.HIGH,
      harassment: REPORT_PRIORITY.HIGH,
      bullying: REPORT_PRIORITY.HIGH,
      hate_speech: REPORT_PRIORITY.HIGH,
      nudity: REPORT_PRIORITY.MEDIUM,
      false_information: REPORT_PRIORITY.MEDIUM,
      spam: REPORT_PRIORITY.LOW,
      other: REPORT_PRIORITY.LOW,
    };

    const finalPriority =
      priority || priorityMap[reason] || REPORT_PRIORITY.LOW;

    const newReport = new Reports({
      reportType: "comment",
      targetId: req.params.id,
      targetModel: "comment",
      reportedBy: req.user._id,
      reason,
      description: description.trim(),
      priority: finalPriority,
      status: "pending",
    });

    await newReport.save();

    if (finalPriority === REPORT_PRIORITY.CRITICAL || finalPriority === REPORT_PRIORITY.HIGH) {
      await notificationService.notifyAdminsNewReport(newReport, req.user);
    }

    comment.reports.push(newReport._id);
    await comment.incrementReportCount();

    logger.audit("Comment reported", req.user._id, {
      commentId: req.params.id,
      reason,
      priority: finalPriority,
      reportId: newReport._id,
    });

    res.json({
      msg: "Comment reported successfully. Our team will review it.",
      report: {
        _id: newReport._id,
        reason: newReport.reason,
        priority: newReport.priority,
        status: newReport.status,
      },
    });
  }),

  hideComment: asyncHandler(async (req, res) => {
    const comment = await Comments.findById(req.params.id).populate("user", "_id");

    if (!comment) {
      throw new NotFoundError("Comment");
    }

    if (comment.hiddenBy.includes(req.user._id)) {
      return res.status(400).json({
        msg: "You have already hidden this comment.",
      });
    }

    if (!comment.hiddenBy.includes(req.user._id)) {
      comment.hiddenBy.push(req.user._id);
    }
    comment.isHidden = true;
    await comment.save();

    if (comment.user._id.toString() !== req.user._id.toString()) {
      await notificationService.notifyCommentHidden(
        comment,
        req.user._id,
        "Your comment has been hidden by another user"
      );
    }

    logger.info("Comment hidden", {
      commentId: req.params.id,
      userId: req.user._id,
    });

    res.json({
      msg: "Comment hidden successfully.",
      comment: {
        _id: comment._id,
        isHidden: comment.isHidden,
      },
    });
  }),
};

module.exports = commentCtrl;