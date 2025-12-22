const Notifies = require("../models/notifyModel");
const logger = require("../utils/logger");

class NotificationService {
  constructor() {
    this.io = null;
  }

  initialize(socketIO) {
    this.io = socketIO;
    logger.info("✅ NotificationService initialized with Socket.IO");
  }

  /**
   * Tạo và emit notification
   * @param {Object} data - Notification data
   * @returns {Promise<Object>} Created notification
   */
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
      } = data;

      if (!recipients || recipients.length === 0) {
        throw new Error("Recipients are required");
      }
      if (!sender) {
        throw new Error("Sender is required");
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

  /**
   * Mention trong Post/Comment
   * @param {Array} mentionedUserIds - Danh sách user được tag
   */
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
      friend_request: "đã gửi lời mời kết bạn",
      friend_accept: "đã chấp nhận lời mời kết bạn",
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