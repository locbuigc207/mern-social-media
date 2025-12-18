const Comments = require("../models/commentModel");
const Posts = require("../models/postModel");
const Reports = require("../models/reportModel"); 
const logger = require("../utils/logger");

const commentCtrl = {
  createComment: async (req, res) => {
    try {
      const { postId, content, tag, reply, postUserId } = req.body;

      const post = await Posts.findById(postId);
      if (!post) {
        return res.status(400).json({ msg: "Post does not exist." });
      }

      if (reply) {
        const cm = await Comments.findById(reply);
        if (!cm) {
          return res.status(400).json({ msg: "Comment does not exist." });
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

      await Posts.findOneAndUpdate(
        { _id: postId },
        {
          $push: { comments: newComment._id },
        },
        { new: true }
      );

      await newComment.save();
      res.json({ newComment });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },

  updateComment: async (req, res) => {
    try {
      const { content } = req.body;

      await Comments.findOneAndUpdate(
        { _id: req.params.id, user: req.user._id },
        { content }
      );

      res.json({ msg: "updated successfully." });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },

  likeComment: async (req, res) => {
    try {
      const comment = await Comments.find({
        _id: req.params.id,
        likes: req.user._id,
      });
      if (comment.length > 0) {
        return res
          .status(400)
          .json({ msg: "You have already liked this comment" });
      }

      await Comments.findOneAndUpdate(
        { _id: req.params.id },
        {
          $push: { likes: req.user._id },
        },
        {
          new: true,
        }
      );

      res.json({ msg: "Comment liked successfully." });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },

  unLikeComment: async (req, res) => {
    try {
      await Comments.findOneAndUpdate(
        { _id: req.params.id },
        {
          $pull: { likes: req.user._id },
        },
        {
          new: true,
        }
      );

      res.json({ msg: "Comment unliked successfully." });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },

  deleteComment: async (req, res) => {
    try {
      const comment = await Comments.findOneAndDelete({
        _id: req.params.id,
        $or: [{ user: req.user._id }, { postUserId: req.user._id }],
      });

      await Posts.findOneAndUpdate(
        { _id: comment.postId },
        {
          $pull: { comments: req.params.id },
        }
      );
      res.json({ msg: "Comment deleted successfully." });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },

  reportComment: async (req, res) => {
    try {
      const { reason, description, priority } = req.body;

      if (!reason) {
        return res.status(400).json({
          msg: "Report reason is required.",
        });
      }

      const validReasons = [
        "spam",
        "harassment",
        "hate_speech",
        "violence",
        "nudity",
        "false_information",
        "bullying",
        "threats",
        "self_harm",
        "other",
      ];

      if (!validReasons.includes(reason)) {
        return res.status(400).json({
          msg: "Invalid report reason.",
        });
      }

      if (!description || description.trim().length < 10) {
        return res.status(400).json({
          msg: "Please provide a detailed description (at least 10 characters).",
        });
      }

      if (priority) {
        const validPriorities = ['low', 'medium', 'high', 'critical'];
        if (!validPriorities.includes(priority)) {
          return res.status(400).json({
            msg: "Invalid priority level.",
          });
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
        return res.status(404).json({ msg: "Comment not found." });
      }

      const priorityMap = {
        'self_harm': 'critical',
        'threats': 'critical',
        'violence': 'high',
        'harassment': 'high',
        'bullying': 'high',
        'hate_speech': 'high',
        'nudity': 'medium',
        'false_information': 'medium',
        'spam': 'low',
        'other': 'low'
      };

      const finalPriority = priority || priorityMap[reason] || 'low';

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
          status: newReport.status
        },
      });
    } catch (err) {
      logger.error("Report comment failed", err, {
        userId: req.user._id,
        commentId: req.params.id,
      });
      return res.status(500).json({ msg: err.message });
    }
  },

  hideComment: async (req, res) => {
    try {
      const comment = await Comments.findById(req.params.id);

      if (!comment) {
        return res.status(404).json({ msg: "Comment not found." });
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
    } catch (err) {
      logger.error("Hide comment failed", err, {
        userId: req.user._id,
        commentId: req.params.id,
      });
      return res.status(500).json({ msg: err.message });
    }
  },
};

module.exports = commentCtrl;