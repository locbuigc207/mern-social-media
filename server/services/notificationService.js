const Notifies = require("../models/notifyModel");
const logger = require("../utils/logger");

class NotificationService {
  constructor() {
    this.io = null;
  }

  initialize(socketIO) {
    this.io = socketIO;
    logger.info(" NotificationService initialized with Socket.IO");
  }


  async create(data) {
    try {
      const {
        recipients,
        sender,
        type,
        post,
        comment,
        text,
        url,
        content,
        image,
        metadata,
      } = data;

      if (!recipients || recipients.length === 0) {
        throw new Error("Recipients are required");
      }
      if (!type) {
        throw new Error("Notification type is required");
      }

      const existingNotify = await Notifies.findOne({
        recipients: { $in: recipients },
        user: sender,
        type,
        ...(post && { id: post }),
        ...(comment && { comment }),
      }).sort("-createdAt");

      if (
        existingNotify &&
        Date.now() - existingNotify.createdAt < 5 * 60 * 1000
      ) {
        logger.debug("Skipped duplicate notification", { type, sender });
        return existingNotify;
      }

      const newNotify = new Notifies({
        id: post || comment,
        recipients,
        user: sender,
        url: url || this._generateUrl(type, post, comment),
        text: text || this._generateText(type),
        content: content || "",
        image: image || "",
        isRead: false,
        metadata: metadata || {},
      });

      await newNotify.save();

      const populatedNotify = await Notifies.findById(newNotify._id).populate(
        "user",
        "username avatar fullname"
      );

      if (this.io) {
        this._emitToRecipients(recipients, "createNotifyToClient", {
          ...populatedNotify.toObject(),
          timestamp: new Date().toISOString(),
        });
      }

      logger.info("Notification created", {
        type,
        recipients: recipients.length,
        notifyId: newNotify._id,
      });

      return populatedNotify;
    } catch (error) {
      logger.error("Failed to create notification", error, data);
      throw error;
    }
  }

  
  async notifyLikePost(post, liker) {
    if (post.user.toString() === liker._id.toString()) return;

    return this.create({
      recipients: [post.user],
      sender: liker._id,
      type: "like",
      post: post._id,
      text: "đã thích bài viết của bạn",
      content: post.content?.substring(0, 100) || "",
      image: post.images?.[0]?.url || "",
    });
  }

  async removeNotifyLikePost(postId, userId) {
    try {
      await Notifies.deleteOne({
        id: postId,
        user: userId,
        url: `/post/${postId}`,
      });

      if (this.io) {
        this.io.emit("removeNotifyToClient", {
          postId,
          userId,
          type: "like",
        });
      }
    } catch (error) {
      logger.error("Failed to remove like notification", error);
    }
  }

  async notifyComment(post, comment, commenter) {
    if (post.user.toString() === commenter._id.toString()) return;

    return this.create({
      recipients: [post.user],
      sender: commenter._id,
      type: "comment",
      post: post._id,
      comment: comment._id,
      text: "đã bình luận bài viết của bạn",
      content: comment.content?.substring(0, 100) || "",
      image: post.images?.[0]?.url || "",
    });
  }

  async notifyReplyComment(post, originalComment, reply, replier) {
    if (originalComment.user.toString() === replier._id.toString()) return;

    return this.create({
      recipients: [originalComment.user],
      sender: replier._id,
      type: "reply",
      post: post._id,
      comment: reply._id,
      text: "đã trả lời bình luận của bạn",
      content: reply.content?.substring(0, 100) || "",
      image: post.images?.[0]?.url || "",
    });
  }

  async notifyLikeComment(comment, post, liker) {
    if (comment.user.toString() === liker._id.toString()) return;

    return this.create({
      recipients: [comment.user],
      sender: liker._id,
      type: "like_comment",
      post: post._id,
      comment: comment._id,
      text: "đã thích bình luận của bạn",
      content: comment.content?.substring(0, 100) || "",
      image: post?.images?.[0]?.url || "",
    });
  }

  async notifySharePost(originalPost, sharedPost, sharer) {
    if (originalPost.user.toString() === sharer._id.toString()) return;

    return this.create({
      recipients: [originalPost.user],
      sender: sharer._id,
      type: "share",
      post: sharedPost._id,
      text: "đã chia sẻ bài viết của bạn",
      content: sharedPost.shareCaption || originalPost.content?.substring(0, 100) || "",
      image: originalPost.images?.[0]?.url || "",
    });
  }

  
  async notifyFollow(targetUser, follower) {
    return this.create({
      recipients: [targetUser._id],
      sender: follower._id,
      type: "follow",
      text: "đã bắt đầu theo dõi bạn",
      url: `/profile/${follower._id}`,
    });
  }

  async notifyMention(mentionedUserIds, mentioner, post, comment = null) {
    const validRecipients = mentionedUserIds.filter(
      (id) => id.toString() !== mentioner._id.toString()
    );

    if (validRecipients.length === 0) return;

    return this.create({
      recipients: validRecipients,
      sender: mentioner._id,
      type: "mention",
      post: post._id,
      comment: comment?._id,
      text: comment 
        ? "đã nhắc đến bạn trong một bình luận" 
        : "đã nhắc đến bạn trong một bài viết",
      content: (comment?.content || post.content)?.substring(0, 100) || "",
      image: post.images?.[0]?.url || "",
    });
  }

  async notifyTagInPost(taggedUserIds, tagger, post) {
    const validRecipients = taggedUserIds.filter(
      (id) => id.toString() !== tagger._id.toString()
    );

    if (validRecipients.length === 0) return;

    return this.create({
      recipients: validRecipients,
      sender: tagger._id,
      type: "tag",
      post: post._id,
      text: "đã gắn thẻ bạn trong một bài viết",
      content: post.content?.substring(0, 100) || "",
      image: post.images?.[0]?.url || "",
    });
  }

  
  async notifyStoryView(story, viewer) {
    if (story.user.toString() === viewer._id.toString()) return;

    return this.create({
      recipients: [story.user],
      sender: viewer._id,
      type: "story_view",
      text: "đã xem story của bạn",
      url: `/story/${story._id}`,
      image: story.media?.url || "",
    });
  }

  async notifyStoryReply(story, reply, replier) {
    if (story.user.toString() === replier._id.toString()) return;

    return this.create({
      recipients: [story.user],
      sender: replier._id,
      type: "story_reply",
      text: "đã trả lời story của bạn",
      content: reply.text?.substring(0, 100) || "",
      url: `/story/${story._id}`,
      image: story.media?.url || "",
    });
  }

  
  async notifyGroupMention(mentionedUserIds, mentioner, group, message) {
    const validRecipients = mentionedUserIds.filter(
      (id) => id.toString() !== mentioner._id.toString()
    );

    if (validRecipients.length === 0) return;

    return this.create({
      recipients: validRecipients,
      sender: mentioner._id,
      type: "group_mention",
      text: `đã nhắc đến bạn trong nhóm ${group.name}`,
      content: message.text?.substring(0, 100) || "",
      url: `/group/${group._id}`,
      image: group.avatar || "",
    });
  }

  async notifyGroupInvite(invitedUserIds, inviter, group) {
    return this.create({
      recipients: invitedUserIds,
      sender: inviter._id,
      type: "group_invite",
      text: `đã mời bạn tham gia nhóm "${group.name}"`,
      content: group.description?.substring(0, 100) || "",
      url: `/group/${group._id}`,
      image: group.avatar || "",
    });
  }

  async notifyGroupRemoved(removedUserId, removedBy, group) {
    return this.create({
      recipients: [removedUserId],
      sender: removedBy,
      type: "group_removed",
      text: `đã xóa bạn khỏi nhóm "${group.name}"`,
      url: `/groups`,
      image: group.avatar || "",
    });
  }

  async notifyGroupRoleChanged(userId, changedBy, group, newRole) {
    const roleText = {
      admin: "quản trị viên",
      member: "thành viên"
    };

    return this.create({
      recipients: [userId],
      sender: changedBy,
      type: "group_role_changed",
      text: `đã thay đổi vai trò của bạn thành ${roleText[newRole]} trong nhóm "${group.name}"`,
      url: `/group/${group._id}`,
      image: group.avatar || "",
    });
  }

  
  async notifyFriendRequest(targetUser, requester) {
    return this.create({
      recipients: [targetUser._id],
      sender: requester._id,
      type: "friend_request",
      text: "đã gửi lời mời kết bạn",
      url: `/profile/${requester._id}`,
    });
  }

  async notifyAcceptFriend(requester, accepter) {
    return this.create({
      recipients: [requester._id],
      sender: accepter._id,
      type: "friend_accept",
      text: "đã chấp nhận lời mời kết bạn",
      url: `/profile/${accepter._id}`,
    });
  }

  
  async notifyAdminsNewReport(report, reporter) {
    try {
      const Users = require("../models/userModel");
      const admins = await Users.find({ role: "admin" }).select("_id");
      
      if (admins.length === 0) {
        logger.warn("No admins found to notify about new report");
        return;
      }

      const priorityEmoji = {
        critical: "🚨",
        high: "⚠️",
        medium: "📢",
        low: "ℹ️"
      };

      const typeText = {
        post: "bài viết",
        comment: "bình luận",
        user: "người dùng",
        message: "tin nhắn"
      };

      const reasonText = {
        spam: "Spam",
        harassment: "Quấy rối",
        hate_speech: "Ngôn từ căm thù",
        violence: "Bạo lực",
        nudity: "Nội dung nhạy cảm",
        false_information: "Thông tin sai lệch",
        scam: "Lừa đảo",
        copyright: "Vi phạm bản quyền",
        self_harm: "Tự gây thương tích",
        terrorism: "Khủng bố",
        child_exploitation: "Khai thác trẻ em",
        bullying: "Bắt nạt",
        threats: "Đe dọa",
        other: "Khác"
      };

      return this.create({
        recipients: admins.map(a => a._id),
        sender: reporter._id,
        type: "report_created",
        text: `${priorityEmoji[report.priority]} Báo cáo ${typeText[report.reportType]} mới (${report.priority})`,
        content: `Lý do: ${reasonText[report.reason]}\n${report.description?.substring(0, 100) || ""}`,
        url: `/admin/reports/${report._id}`,
        metadata: {
          reportId: report._id,
          reportType: report.reportType,
          reportReason: report.reason,
          reportStatus: report.status,
          priority: report.priority,
        },
      });
    } catch (error) {
      logger.error("Failed to notify admins about new report", error);
    }
  }

  async notifyReportAccepted(report, actionTaken, adminNote) {
    try {
      const actionText = {
        none: "đã được xem xét (không có hành động)",
        warning: "đã được xem xét (đưa ra cảnh báo)",
        content_removed: "đã được chấp nhận (nội dung đã bị xóa)",
        account_suspended: "đã được chấp nhận (tài khoản đã bị tạm khóa)",
        account_banned: "đã được chấp nhận (tài khoản đã bị cấm vĩnh viễn)"
      };

      return this.create({
        recipients: [report.reportedBy],
        sender: report.reviewedBy,
        type: "report_accepted",
        text: `Báo cáo của bạn ${actionText[actionTaken]}`,
        content: adminNote || "Cảm ơn bạn đã giúp chúng tôi giữ cho cộng đồng an toàn.",
        url: `/notifications`,
        metadata: {
          reportId: report._id,
          reportType: report.reportType,
          reportReason: report.reason,
          reportStatus: "accepted",
          actionTaken: actionTaken,
        },
      });
    } catch (error) {
      logger.error("Failed to notify reporter about accepted report", error);
    }
  }

  async notifyReportDeclined(report, adminNote) {
    try {
      return this.create({
        recipients: [report.reportedBy],
        sender: report.reviewedBy,
        type: "report_declined",
        text: "Báo cáo của bạn đã được xem xét",
        content: adminNote || "Sau khi xem xét, chúng tôi nhận thấy nội dung này không vi phạm nguyên tắc cộng đồng.",
        url: `/notifications`,
        metadata: {
          reportId: report._id,
          reportType: report.reportType,
          reportReason: report.reason,
          reportStatus: "declined",
        },
      });
    } catch (error) {
      logger.error("Failed to notify reporter about declined report", error);
    }
  }

  async notifyContentRemoved(contentType, contentId, ownerId, reason, adminNote) {
    try {
      const contentText = {
        post: "bài viết",
        comment: "bình luận",
        story: "story",
        message: "tin nhắn"
      };

      const reasonText = {
        spam: "Spam",
        harassment: "Quấy rối",
        hate_speech: "Ngôn từ căm thù",
        violence: "Bạo lực",
        nudity: "Nội dung nhạy cảm",
        false_information: "Thông tin sai lệch",
        scam: "Lừa đảo",
        copyright: "Vi phạm bản quyền",
        self_harm: "Tự gây thương tích",
        terrorism: "Khủng bố",
        child_exploitation: "Khai thác trẻ em",
        bullying: "Bắt nạt",
        threats: "Đe dọa",
        other: "Vi phạm nguyên tắc cộng đồng"
      };

      return this.create({
        recipients: [ownerId],
        sender: null,
        type: "content_removed",
        text: `${contentText[contentType]} của bạn đã bị xóa`,
        content: `Lý do: ${reasonText[reason] || reason}\n\n${adminNote || "Vui lòng xem lại nguyên tắc cộng đồng của chúng tôi."}`,
        url: "/community-guidelines",
        metadata: {
          contentType: contentType,
          contentId: contentId,
          reason: reason,
        },
      });
    } catch (error) {
      logger.error("Failed to notify content owner about removal", error);
    }
  }

  async notifySpamPostDeleted(post, adminId, reason = "Spam") {
    try {
      return this.create({
        recipients: [post.user._id || post.user],
        sender: adminId,
        type: "content_removed",
        text: "Bài viết spam của bạn đã bị xóa",
        content: `Lý do: ${reason}\n\nBài viết của bạn đã nhận được nhiều báo cáo và bị xác định là spam. Vui lòng tuân thủ nguyên tắc cộng đồng.`,
        url: "/community-guidelines",
        metadata: {
          contentType: "post",
          contentId: post._id,
          reason: reason,
          reportCount: post.reportCount || 0,
        },
      });
    } catch (error) {
      logger.error("Failed to notify user about spam post deletion", error);
    }
  }

  async notifyAccountBlocked(userId, blockedBy, reason, blockType, expiresAt = null) {
    try {
      let text = "Tài khoản của bạn đã bị ";
      let content = reason;

      if (blockType === "permanent_ban") {
        text += "cấm vĩnh viễn";
        content += "\n\nBạn có thể khiếu nại quyết định này bằng cách liên hệ với bộ phận hỗ trợ.";
      } else if (blockType === "temporary_suspension") {
        const hoursRemaining = Math.ceil((expiresAt - new Date()) / (1000 * 60 * 60));
        const daysRemaining = Math.ceil(hoursRemaining / 24);
        
        if (hoursRemaining > 48) {
          text += `tạm khóa trong ${daysRemaining} ngày`;
        } else {
          text += `tạm khóa trong ${hoursRemaining} giờ`;
        }
        
        content += `\n\nTài khoản của bạn sẽ tự động được mở khóa vào ${expiresAt.toLocaleString('vi-VN')}.`;
      } else {
        text += "khóa";
        content += "\n\nVui lòng liên hệ với bộ phận hỗ trợ để biết thêm thông tin.";
      }

      return this.create({
        recipients: [userId],
        sender: blockedBy,
        type: "account_blocked",
        text,
        content,
        url: "/support",
        metadata: {
          blockType: blockType,
          reason: reason,
          expiresAt: expiresAt,
        },
      });
    } catch (error) {
      logger.error("Failed to notify user about account block", error);
    }
  }

  async notifyAccountUnblocked(userId, unblockedBy, note = null) {
    try {
      return this.create({
        recipients: [userId],
        sender: unblockedBy,
        type: "account_unblocked",
        text: "Tài khoản của bạn đã được mở khóa",
        content: note || "Quyền truy cập tài khoản của bạn đã được khôi phục. Vui lòng tuân thủ nguyên tắc cộng đồng của chúng tôi.",
        url: "/",
      });
    } catch (error) {
      logger.error("Failed to notify user about account unblock", error);
    }
  }

  async notifyWarning(userId, warnedBy, reason, reportId = null) {
    try {
      return this.create({
        recipients: [userId],
        sender: warnedBy,
        type: "warning",
        text: " Bạn đã nhận được một cảnh báo",
        content: `Lý do: ${reason}\n\nVui lòng xem lại nguyên tắc cộng đồng của chúng tôi để tránh các hành động tiếp theo.`,
        url: reportId ? `/notifications` : "/community-guidelines",
        metadata: {
          reportId: reportId,
          reason: reason,
        },
      });
    } catch (error) {
      logger.error("Failed to notify user about warning", error);
    }
  }

  async notifyReportResolved(reportId, reportedBy, reviewedBy, note) {
    try {
      return this.create({
        recipients: [reportedBy],
        sender: reviewedBy,
        type: "report_resolved",
        text: "Báo cáo của bạn đã được xử lý",
        content: note || "Báo cáo của bạn đã được giải quyết cùng với các báo cáo liên quan khác.",
        url: `/notifications`,
        metadata: {
          reportId: reportId,
          reportStatus: "resolved",
        },
      });
    } catch (error) {
      logger.error("Failed to notify about resolved report", error);
    }
  }

  async notifyCommentHidden(comment, hiddenBy, reason) {
    try {
      if (comment.user.toString() === hiddenBy.toString()) return;

      return this.create({
        recipients: [comment.user],
        sender: hiddenBy,
        type: "content_hidden",
        text: "Bình luận của bạn đã bị ẩn",
        content: `Lý do: ${reason || "Vi phạm nguyên tắc cộng đồng"}`,
        url: `/notifications`,
        metadata: {
          contentType: "comment",
          contentId: comment._id,
          reason: reason,
        },
      });
    } catch (error) {
      logger.error("Failed to notify about hidden comment", error);
    }
  }

  async notifyPostHidden(post, hiddenBy, reason) {
    try {
      if (post.user.toString() === hiddenBy.toString()) return;

      return this.create({
        recipients: [post.user],
        sender: hiddenBy,
        type: "content_hidden",
        text: "Bài viết của bạn đã bị ẩn",
        content: `Lý do: ${reason || "Vi phạm nguyên tắc cộng đồng"}`,
        url: `/notifications`,
        metadata: {
          contentType: "post",
          contentId: post._id,
          reason: reason,
        },
      });
    } catch (error) {
      logger.error("Failed to notify about hidden post", error);
    }
  }


  async notifySystemMaintenance(userIds, startTime, endTime, message) {
    try {
      return this.create({
        recipients: userIds,
        sender: null,
        type: "system_maintenance",
        text: " Bảo trì hệ thống",
        content: `${message}\n\nThời gian: ${startTime.toLocaleString('vi-VN')} - ${endTime.toLocaleString('vi-VN')}`,
        url: "/",
      });
    } catch (error) {
      logger.error("Failed to send maintenance notification", error);
    }
  }

  async notifyPolicyUpdate(userIds, policyType, effectiveDate) {
    try {
      const policyText = {
        terms: "Điều khoản sử dụng",
        privacy: "Chính sách bảo mật",
        community: "Nguyên tắc cộng đồng"
      };

      return this.create({
        recipients: userIds,
        sender: null,
        type: "policy_update",
        text: ` Cập nhật ${policyText[policyType]}`,
        content: `Chúng tôi đã cập nhật ${policyText[policyType]}. Vui lòng xem lại các thay đổi.\n\nCó hiệu lực từ: ${effectiveDate.toLocaleString('vi-VN')}`,
        url: `/${policyType}`,
      });
    } catch (error) {
      logger.error("Failed to send policy update notification", error);
    }
  }

  async notifySecurityAlert(userId, alertType, details) {
    try {
      const alertText = {
        new_login: " Đăng nhập mới",
        password_changed: " Mật khẩu đã được thay đổi",
        suspicious_activity: " Hoạt động đáng ngờ",
        new_device: " Thiết bị mới"
      };

      return this.create({
        recipients: [userId],
        sender: null,
        type: "security_alert",
        text: alertText[alertType],
        content: details,
        url: "/settings/security",
      });
    } catch (error) {
      logger.error("Failed to send security alert", error);
    }
  }


  _generateUrl(type, postId, commentId) {
    if (postId) return `/post/${postId}`;
    if (commentId) return `/comment/${commentId}`;
    return "/notifications";
  }

  _generateText(type) {
    const textMap = {
      like: "đã thích bài viết của bạn",
      comment: "đã bình luận bài viết của bạn",
      reply: "đã trả lời bình luận của bạn",
      like_comment: "đã thích bình luận của bạn",
      share: "đã chia sẻ bài viết của bạn",
      follow: "đã bắt đầu theo dõi bạn",
      mention: "đã nhắc đến bạn",
      tag: "đã gắn thẻ bạn trong bài viết",
      story_view: "đã xem story của bạn",
      story_reply: "đã trả lời story của bạn",
      group_mention: "đã nhắc đến bạn trong nhóm",
      group_invite: "đã mời bạn tham gia nhóm",
      group_removed: "đã xóa bạn khỏi nhóm",
      group_role_changed: "đã thay đổi vai trò của bạn trong nhóm",
      friend_request: "đã gửi lời mời kết bạn",
      friend_accept: "đã chấp nhận lời mời kết bạn",
      report_created: "Báo cáo mới",
      report_accepted: "Báo cáo của bạn đã được chấp nhận",
      report_declined: "Báo cáo của bạn đã được xem xét",
      report_resolved: "Báo cáo của bạn đã được giải quyết",
      content_removed: "Nội dung của bạn đã bị xóa",
      content_hidden: "Nội dung của bạn đã bị ẩn",
      account_blocked: "Tài khoản của bạn đã bị khóa",
      account_unblocked: "Tài khoản của bạn đã được mở khóa",
      warning: "Bạn đã nhận được cảnh báo",
      system_maintenance: "Bảo trì hệ thống",
      policy_update: "Cập nhật chính sách",
      security_alert: "Cảnh báo bảo mật",
    };
    return textMap[type] || "có hoạt động mới";
  }

  _emitToRecipients(recipientIds, event, data) {
    if (!this.io) return;

    recipientIds.forEach((recipientId) => {
      this.io.to(recipientId.toString()).emit(event, data);
    });
  }

  getIO() {
    return this.io;
  }
}

const notificationService = new NotificationService();

module.exports = notificationService;