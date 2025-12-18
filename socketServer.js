const logger = require('./utils/logger');

let users = new Map();
let admins = new Map();

const SocketServer = (socket) => {
  // ✅ Helper function for error handling
  const handleSocketError = (eventName, error, data = {}) => {
    logger.error(`Socket error in ${eventName}:`, error, data);
    socket.emit('error', { 
      event: eventName,
      message: 'An error occurred processing your request' 
    });
  };

  // ✅ Helper function with validation
  const getUsersFromIds = (ids) => {
    try {
      if (!Array.isArray(ids)) {
        logger.warn('getUsersFromIds received non-array:', typeof ids);
        return [];
      }

      const result = [];
      for (const id of ids) {
        const socketId = users.get(id?.toString());
        if (socketId) {
          result.push({ id, socketId });
        }
      }
      return result;
    } catch (error) {
      logger.error('Error in getUsersFromIds:', error);
      return [];
    }
  };

  // --- CONNECTION ---
  socket.on("joinUser", (id) => {
    try {
      if (!id) {
        logger.warn('joinUser called without ID');
        return;
      }

      users.set(id.toString(), socket.id);
      logger.info(`👤 User joined: ${id}, Total users: ${users.size}`);
      socket.broadcast.emit("userOnline", id);
    } catch (error) {
      handleSocketError('joinUser', error, { id });
    }
  });

  socket.on("joinAdmin", (id) => {
    try {
      if (!id) {
        logger.warn('joinAdmin called without ID');
        return;
      }

      admins.set(id.toString(), socket.id);
      logger.info(`👨‍💼 Admin joined: ${id}, Total admins: ${admins.size}`);
      socket.to(socket.id).emit("activeUsers", users.size);
    } catch (error) {
      handleSocketError('joinAdmin', error, { id });
    }
  });

  socket.on("disconnect", () => {
    try {
      let disconnectedUserId = null;
      let disconnectedAdminId = null;

      for (const [userId, socketId] of users.entries()) {
        if (socketId === socket.id) {
          disconnectedUserId = userId;
          users.delete(userId);
          break;
        }
      }

      for (const [adminId, socketId] of admins.entries()) {
        if (socketId === socket.id) {
          disconnectedAdminId = adminId;
          admins.delete(adminId);
          break;
        }
      }

      if (disconnectedUserId) {
        logger.info(`👋 User disconnected: ${disconnectedUserId}`);
        socket.broadcast.emit("userOffline", disconnectedUserId);
      }

      if (disconnectedAdminId) {
        logger.info(`👋 Admin disconnected: ${disconnectedAdminId}`);
      }

      logger.info(`📊 Remaining - Users: ${users.size}, Admins: ${admins.size}`);
    } catch (error) {
      logger.error('Error in disconnect handler:', error);
    }
  });

  // --- POST INTERACTIONS ---
  socket.on("likePost", (newPost) => {
    try {
      if (!newPost || !newPost.user) {
        logger.warn('likePost received invalid data');
        return;
      }

      let ids = [...(newPost.user.followers || []), newPost.user._id];
      const clients = getUsersFromIds(ids);
      clients.forEach((client) => {
        socket.to(client.socketId).emit("likeToClient", newPost);
      });
    } catch (error) {
      handleSocketError('likePost', error, { postId: newPost?._id });
    }
  });

  socket.on("unLikePost", (newPost) => {
    try {
      if (!newPost || !newPost.user) {
        logger.warn('unLikePost received invalid data');
        return;
      }

      let ids = [...(newPost.user.followers || []), newPost.user._id];
      const clients = getUsersFromIds(ids);
      clients.forEach((client) => {
        socket.to(client.socketId).emit("unLikeToClient", newPost);
      });
    } catch (error) {
      handleSocketError('unLikePost', error, { postId: newPost?._id });
    }
  });

  socket.on("createComment", (newPost) => {
    try {
      if (!newPost || !newPost.user) {
        logger.warn('createComment received invalid data');
        return;
      }

      let ids = [...(newPost.user.followers || []), newPost.user._id];
      const clients = getUsersFromIds(ids);
      clients.forEach((client) => {
        socket.to(client.socketId).emit("createCommentToClient", newPost);
      });
    } catch (error) {
      handleSocketError('createComment', error, { postId: newPost?._id });
    }
  });

  socket.on("deleteComment", (newPost) => {
    try {
      if (!newPost || !newPost.user) {
        logger.warn('deleteComment received invalid data');
        return;
      }

      let ids = [...(newPost.user.followers || []), newPost.user._id];
      const clients = getUsersFromIds(ids);
      clients.forEach((client) => {
        socket.to(client.socketId).emit("deleteCommentToClient", newPost);
      });
    } catch (error) {
      handleSocketError('deleteComment', error, { postId: newPost?._id });
    }
  });

  // --- FOLLOW & NOTIFICATIONS ---
  socket.on("follow", (newUser) => {
    try {
      if (!newUser || !newUser._id) {
        logger.warn('follow received invalid data');
        return;
      }

      const socketId = users.get(newUser._id.toString());
      if (socketId) socket.to(socketId).emit("followToClient", newUser);
    } catch (error) {
      handleSocketError('follow', error, { userId: newUser?._id });
    }
  });

  socket.on("unFollow", (newUser) => {
    try {
      if (!newUser || !newUser._id) {
        logger.warn('unFollow received invalid data');
        return;
      }

      const socketId = users.get(newUser._id.toString());
      if (socketId) socket.to(socketId).emit("unFollowToClient", newUser);
    } catch (error) {
      handleSocketError('unFollow', error, { userId: newUser?._id });
    }
  });

  socket.on("createNotify", (msg) => {
    try {
      if (!msg || !msg.recipients) {
        logger.warn('createNotify received invalid data');
        return;
      }

      const clients = getUsersFromIds(msg.recipients);
      clients.forEach((client) => {
        socket.to(client.socketId).emit("createNotifyToClient", msg);
      });
    } catch (error) {
      handleSocketError('createNotify', error);
    }
  });

  socket.on("removeNotify", (msg) => {
    try {
      if (!msg || !msg.recipients) {
        logger.warn('removeNotify received invalid data');
        return;
      }

      const clients = getUsersFromIds(msg.recipients);
      clients.forEach((client) => {
        socket.to(client.socketId).emit("removeNotifyToClient", msg);
      });
    } catch (error) {
      handleSocketError('removeNotify', error);
    }
  });

  // --- MESSAGES ---
  socket.on("addMessage", (msg) => {
    try {
      if (!msg || !msg.recipient) {
        logger.warn('addMessage received invalid data');
        return;
      }

      const socketId = users.get(msg.recipient.toString());
      if (socketId) {
        socket.to(socketId).emit("addMessageToClient", msg);
        socket.emit("messageDelivered", { 
          messageId: msg._id, 
          deliveredAt: new Date() 
        });
      } else {
        socket.emit("messageOffline", { 
          messageId: msg._id, 
          recipient: msg.recipient 
        });
      }
    } catch (error) {
      handleSocketError('addMessage', error, { messageId: msg?._id });
    }
  });

  socket.on("markMessageRead", (data) => {
    try {
      if (!data || !data.messageId || !data.senderId) {
        logger.warn('markMessageRead received invalid data');
        return;
      }

      const { messageId, senderId } = data;
      const socketId = users.get(senderId.toString());
      if (socketId) {
        socket.to(socketId).emit("messageReadConfirm", { 
          messageId, 
          readAt: new Date() 
        });
      }
    } catch (error) {
      handleSocketError('markMessageRead', error, data);
    }
  });

  socket.on("typing", (data) => {
    try {
      if (!data || !data.recipientId) {
        return;
      }

      const { recipientId, isTyping, userId } = data;
      const socketId = users.get(recipientId.toString());
      if (socketId) {
        socket.to(socketId).emit("userTyping", { userId, isTyping });
      }
    } catch (error) {
      handleSocketError('typing', error, data);
    }
  });

  socket.on("deleteMessage", (data) => {
    try {
      if (!data || !data.messageId || !data.recipientId) {
        logger.warn('deleteMessage received invalid data');
        return;
      }

      const { messageId, recipientId } = data;
      const socketId = users.get(recipientId.toString());
      if (socketId) {
        socket.to(socketId).emit("messageDeleted", { messageId });
      }
    } catch (error) {
      handleSocketError('deleteMessage', error, data);
    }
  });

  // --- ADMIN & STATUS ---
  socket.on("getActiveUsers", (id) => {
    try {
      if (!id) return;

      const adminSocketId = admins.get(id.toString());
      if (adminSocketId) {
        socket.to(adminSocketId).emit("getActiveUsersToClient", users.size);
      }
    } catch (error) {
      handleSocketError('getActiveUsers', error, { id });
    }
  });

  socket.on("checkUserOnline", (userId) => {
    try {
      if (!userId) return;

      const isOnline = users.has(userId.toString());
      socket.emit("userOnlineStatus", { userId, isOnline });
    } catch (error) {
      handleSocketError('checkUserOnline', error, { userId });
    }
  });

  socket.on("getOnlineUsers", () => {
    try {
      const onlineUserIds = Array.from(users.keys());
      socket.emit("onlineUsersList", onlineUserIds);
    } catch (error) {
      handleSocketError('getOnlineUsers', error);
    }
  });

  // --- BLOCK USERS ---
  socket.on("userBlocked", (data) => {
    try {
      if (!data || !data.blockedUserId) return;

      const socketId = users.get(data.blockedUserId.toString());
      if (socketId) {
        socket.to(socketId).emit("youWereBlocked", { 
          blockerId: data.blockerId 
        });
      }
    } catch (error) {
      handleSocketError('userBlocked', error, data);
    }
  });

  socket.on("userUnblocked", (data) => {
    try {
      if (!data || !data.unblockedUserId) return;

      const socketId = users.get(data.unblockedUserId.toString());
      if (socketId) {
        socket.to(socketId).emit("youWereUnblocked", { 
          unblockerId: data.unblockerId 
        });
      }
    } catch (error) {
      handleSocketError('userUnblocked', error, data);
    }
  });

  // --- SCHEDULED POSTS ---
  socket.on("postScheduled", (data) => {
    try {
      if (!data || !data.userId || !data.post) return;

      const { userId, post } = data;
      const socketId = users.get(userId.toString());
      if (socketId) {
        socket.to(socketId).emit("scheduleConfirmed", { 
          post, 
          scheduledDate: post.scheduledDate 
        });
      }
    } catch (error) {
      handleSocketError('postScheduled', error, data);
    }
  });

  socket.on("scheduledPostPublished", (data) => {
    try {
      if (!data || !data.post) return;

      const { post } = data;
      const ownerSocketId = users.get(post.user._id.toString());
      
      if (ownerSocketId) {
        socket.to(ownerSocketId).emit("yourScheduledPostPublished", { 
          postId: post._id, 
          publishedAt: new Date() 
        });
      }

      if (post.user.followers) {
        const followers = getUsersFromIds(post.user.followers);
        followers.forEach(follower => {
          socket.to(follower.socketId).emit("newPostFromFollowing", { post });
        });
      }
    } catch (error) {
      handleSocketError('scheduledPostPublished', error, data);
    }
  });

  // --- STORIES ---
  socket.on("createStory", (data) => {
    try {
      if (!data || !data.story || !data.followers) return;

      const { story, followers } = data;
      const clients = getUsersFromIds(followers);
      clients.forEach((client) => {
        socket.to(client.socketId).emit("newStoryAlert", { 
          user: story.user, 
          storyId: story._id, 
          hasUnviewed: true 
        });
      });
    } catch (error) {
      handleSocketError('createStory', error, data);
    }
  });

  socket.on("viewStory", (data) => {
    try {
      if (!data || !data.storyId || !data.viewerId || !data.storyOwnerId) return;

      const { storyId, viewerId, storyOwnerId } = data;
      const ownerSocketId = users.get(storyOwnerId.toString());
      if (ownerSocketId) {
        socket.to(ownerSocketId).emit("storyViewed", { 
          storyId, 
          viewer: viewerId, 
          viewedAt: new Date() 
        });
      }
    } catch (error) {
      handleSocketError('viewStory', error, data);
    }
  });

  socket.on("replyToStory", (data) => {
    try {
      if (!data || !data.storyOwnerId || !data.reply) return;

      const { storyOwnerId, reply } = data;
      const ownerSocketId = users.get(storyOwnerId.toString());
      if (ownerSocketId) {
        socket.to(ownerSocketId).emit("storyReply", { 
          reply, 
          timestamp: new Date() 
        });
      }
    } catch (error) {
      handleSocketError('replyToStory', error, data);
    }
  });

  socket.on("deleteStory", (data) => {
    try {
      if (!data || !data.storyId || !data.followers) return;

      const { storyId, followers } = data;
      const clients = getUsersFromIds(followers);
      clients.forEach((client) => {
        socket.to(client.socketId).emit("storyDeleted", { storyId });
      });
    } catch (error) {
      handleSocketError('deleteStory', error, data);
    }
  });

  socket.on("checkStoriesUpdate", (userId) => {
    try {
      socket.emit("storiesUpdateStatus", { 
        hasNewStories: true, 
        timestamp: new Date() 
      });
    } catch (error) {
      handleSocketError('checkStoriesUpdate', error, { userId });
    }
  });

  // --- GROUPS ---
  socket.on("joinGroup", (groupId) => {
    try {
      if (!groupId) return;

      socket.join(`group_${groupId}`);
      logger.info(`User joined group room: ${groupId}`);
    } catch (error) {
      handleSocketError('joinGroup', error, { groupId });
    }
  });

  socket.on("leaveGroup", (groupId) => {
    try {
      if (!groupId) return;

      socket.leave(`group_${groupId}`);
      logger.info(`User left group room: ${groupId}`);
    } catch (error) {
      handleSocketError('leaveGroup', error, { groupId });
    }
  });

  socket.on("sendGroupMessage", (data) => {
    try {
      if (!data || !data.groupId || !data.message) return;

      const { groupId, message } = data;
      socket.to(`group_${groupId}`).emit("newGroupMessage", { 
        groupId, 
        message, 
        timestamp: new Date() 
      });
    } catch (error) {
      handleSocketError('sendGroupMessage', error, data);
    }
  });

  socket.on("groupTyping", (data) => {
    try {
      if (!data || !data.groupId) return;

      const { groupId, userId, username, isTyping } = data;
      socket.to(`group_${groupId}`).emit("groupTypingStatus", { 
        groupId, 
        userId, 
        username, 
        isTyping 
      });
    } catch (error) {
      handleSocketError('groupTyping', error, data);
    }
  });

  socket.on("groupMessageReaction", (data) => {
    try {
      if (!data || !data.groupId || !data.messageId) return;

      const { groupId, messageId, userId, emoji } = data;
      socket.to(`group_${groupId}`).emit("groupReactionAdded", { 
        messageId, 
        userId, 
        emoji, 
        timestamp: new Date() 
      });
    } catch (error) {
      handleSocketError('groupMessageReaction', error, data);
    }
  });

  socket.on("memberAddedToGroup", (data) => {
    try {
      if (!data || !data.groupId || !data.newMembers) return;

      const { groupId, newMembers, addedBy } = data;
      socket.to(`group_${groupId}`).emit("groupMemberAdded", { 
        groupId, 
        newMembers, 
        addedBy, 
        timestamp: new Date() 
      });
      
      newMembers.forEach(memberId => {
        const socketId = users.get(memberId.toString());
        if (socketId) {
          socket.to(socketId).emit("addedToGroup", { 
            groupId, 
            addedBy, 
            timestamp: new Date() 
          });
        }
      });
    } catch (error) {
      handleSocketError('memberAddedToGroup', error, data);
    }
  });

  socket.on("memberRemovedFromGroup", (data) => {
    try {
      if (!data || !data.groupId || !data.removedMemberId) return;

      const { groupId, removedMemberId, removedBy } = data;
      socket.to(`group_${groupId}`).emit("groupMemberRemoved", { 
        groupId, 
        removedMemberId, 
        removedBy, 
        timestamp: new Date() 
      });
      
      const socketId = users.get(removedMemberId.toString());
      if (socketId) {
        socket.to(socketId).emit("removedFromGroup", { 
          groupId, 
          removedBy, 
          timestamp: new Date() 
        });
      }
    } catch (error) {
      handleSocketError('memberRemovedFromGroup', error, data);
    }
  });

  socket.on("groupInfoUpdated", (data) => {
    try {
      if (!data || !data.groupId || !data.updates) return;

      const { groupId, updates, updatedBy } = data;
      socket.to(`group_${groupId}`).emit("groupInfoChanged", { 
        groupId, 
        updates, 
        updatedBy, 
        timestamp: new Date() 
      });
    } catch (error) {
      handleSocketError('groupInfoUpdated', error, data);
    }
  });

  socket.on("memberLeftGroup", (data) => {
    try {
      if (!data || !data.groupId || !data.memberId) return;

      const { groupId, memberId } = data;
      socket.to(`group_${groupId}`).emit("groupMemberLeft", { 
        groupId, 
        memberId, 
        timestamp: new Date() 
      });
    } catch (error) {
      handleSocketError('memberLeftGroup', error, data);
    }
  });

  socket.on("groupMessageRead", (data) => {
    try {
      if (!data || !data.groupId || !data.messageIds) return;

      const { groupId, messageIds, userId } = data;
      socket.to(`group_${groupId}`).emit("groupMessagesRead", { 
        groupId, 
        messageIds, 
        userId, 
        readAt: new Date() 
      });
    } catch (error) {
      handleSocketError('groupMessageRead', error, data);
    }
  });

  socket.on("deleteGroupMessage", (data) => {
    try {
      if (!data || !data.groupId || !data.messageId) return;

      const { groupId, messageId, deletedBy } = data;
      socket.to(`group_${groupId}`).emit("groupMessageDeleted", { 
        groupId, 
        messageId, 
        deletedBy, 
        timestamp: new Date() 
      });
    } catch (error) {
      handleSocketError('deleteGroupMessage', error, data);
    }
  });

  socket.on("editGroupMessage", (data) => {
    try {
      if (!data || !data.groupId || !data.messageId || !data.newText) return;

      const { groupId, messageId, newText, editedBy } = data;
      socket.to(`group_${groupId}`).emit("groupMessageEdited", { 
        groupId, 
        messageId, 
        newText, 
        editedBy, 
        timestamp: new Date() 
      });
    } catch (error) {
      handleSocketError('editGroupMessage', error, data);
    }
  });

  socket.on("pinGroupMessage", (data) => {
    try {
      if (!data || !data.groupId || !data.messageId) return;

      const { groupId, messageId, pinnedBy } = data;
      socket.to(`group_${groupId}`).emit("groupMessagePinned", { 
        groupId, 
        messageId, 
        pinnedBy, 
        timestamp: new Date() 
      });
    } catch (error) {
      handleSocketError('pinGroupMessage', error, data);
    }
  });

  socket.on("groupCallStarted", (data) => {
    try {
      if (!data || !data.groupId || !data.callerId) return;

      const { groupId, callerId, callType } = data;
      socket.to(`group_${groupId}`).emit("incomingGroupCall", { 
        groupId, 
        callerId, 
        callType, 
        timestamp: new Date() 
      });
    } catch (error) {
      handleSocketError('groupCallStarted', error, data);
    }
  });
};

module.exports = SocketServer;