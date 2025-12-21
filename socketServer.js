const { Server } = require('socket.io');
const logger = require('./utils/logger');

const users = new Map();
const admins = new Map();
const userSockets = new Map();

const SocketServer = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.SOCKET_CORS_ORIGIN || "http://localhost:3000",
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    maxHttpBufferSize: 1e8,
    transports: ['websocket', 'polling']
  });

  let cleanupIntervalId = null;

  const getUsersFromIds = (ids) => {
    try {
      if (!ids || !Array.isArray(ids)) {
        logger.warn('getUsersFromIds called with invalid ids', { ids });
        return [];
      }

      const result = [];
      for (const id of ids) {
        if (!id) continue;

        const idStr = id.toString();
        const socketId = users.get(idStr);

        if (socketId && io.sockets.sockets.has(socketId)) {
          result.push({ id: idStr, socketId });
        } else if (socketId) {
          users.delete(idStr);
          userSockets.delete(socketId);
        }
      }
      return result;
    } catch (error) {
      logger.error('Error in getUsersFromIds:', error);
      return [];
    }
  };

  const getFollowersArray = (followers) => {
    if (!followers) return [];
    return Array.isArray(followers) ? followers : [];
  };

  const cleanupStaleConnections = () => {
    try {
      const connectedSockets = new Set(io.sockets.sockets.keys());
      let cleanedUsers = 0;
      let cleanedAdmins = 0;

      for (const [userId, socketId] of users.entries()) {
        if (!connectedSockets.has(socketId)) {
          users.delete(userId);
          userSockets.delete(socketId);
          cleanedUsers++;
        }
      }

      for (const [adminId, socketId] of admins.entries()) {
        if (!connectedSockets.has(socketId)) {
          admins.delete(adminId);
          cleanedAdmins++;
        }
      }

      if (cleanedUsers > 0 || cleanedAdmins > 0) {
        logger.info(` Cleanup: ${cleanedUsers} users, ${cleanedAdmins} admins removed. Current: ${users.size} users, ${admins.size} admins`);
      }
    } catch (error) {
      logger.error('Error in cleanupStaleConnections:', error);
    }
  };

  cleanupIntervalId = setInterval(cleanupStaleConnections, 5 * 60 * 1000);

  const handleSocketError = (socket, eventName, error, data = {}) => {
    logger.error(`Socket error in ${eventName}:`, error, {
      socketId: socket.id,
      userId: userSockets.get(socket.id),
      ...data
    });

    socket.emit('error', {
      event: eventName,
      message: 'Server error occurred',
      timestamp: new Date().toISOString()
    });
  };

  const safeEmitToUsers = (socket, userIds, event, data) => {
    try {
      const recipients = getUsersFromIds(userIds);
      recipients.forEach(({ socketId }) => {
        try {
          socket.to(socketId).emit(event, data);
        } catch (err) {
          logger.error(`Failed to emit ${event} to ${socketId}:`, err);
        }
      });
    } catch (error) {
      logger.error(`Error in safeEmitToUsers for event ${event}:`, error);
    }
  };

  io.on('connection', (socket) => {
    logger.info(`🔌 New socket connection: ${socket.id}`);

    socket.on("joinUser", (id) => {
      try {
        if (!id) {
          logger.warn('joinUser called without id', { socketId: socket.id });
          return;
        }

        const userId = id.toString();

        const existingSocketId = users.get(userId);
        if (existingSocketId && existingSocketId !== socket.id) {
          const oldSocket = io.sockets.sockets.get(existingSocketId);
          if (oldSocket) {
            oldSocket.emit('duplicateConnection', {
              message: 'You have been connected from another device'
            });
            oldSocket.disconnect(true);
          }
          userSockets.delete(existingSocketId);
        }

        users.set(userId, socket.id);
        userSockets.set(socket.id, userId);

        socket.broadcast.emit("userOnline", userId);

        socket.emit("connectionStatus", {
          connected: true,
          userId,
          onlineUsers: Array.from(users.keys()),
          timestamp: new Date().toISOString()
        });

        logger.info(`👤 User joined: ${userId} (socket: ${socket.id})`);
      } catch (error) {
        handleSocketError(socket, 'joinUser', error, { id });
      }
    });

    socket.on("joinAdmin", (id) => {
      try {
        if (!id) {
          logger.warn('joinAdmin called without id');
          return;
        }

        const adminId = id.toString();
        admins.set(adminId, socket.id);

        socket.emit("activeUsers", {
          count: users.size,
          timestamp: new Date().toISOString()
        });

        logger.info(`👨‍💼 Admin joined: ${adminId} (socket: ${socket.id})`);
      } catch (error) {
        handleSocketError(socket, 'joinAdmin', error, { id });
      }
    });

    socket.on("disconnect", (reason) => {
      try {
        let disconnectedUserId = null;

        const userId = userSockets.get(socket.id);
        if (userId) {
          users.delete(userId);
          userSockets.delete(socket.id);
          disconnectedUserId = userId;
        }

        for (const [adminId, socketId] of admins.entries()) {
          if (socketId === socket.id) {
            admins.delete(adminId);
            break;
          }
        }

        if (disconnectedUserId) {
          socket.broadcast.emit("userOffline", {
            userId: disconnectedUserId,
            timestamp: new Date().toISOString()
          });
        }

        logger.info(`👋 Disconnected: ${socket.id} (reason: ${reason}, user: ${disconnectedUserId || 'N/A'})`);
      } catch (error) {
        logger.error('Error in disconnect handler:', error);
      }
    });

    const handlePostEvent = (eventName, clientEvent) => {
      socket.on(eventName, (newPost) => {
        try {
          if (!newPost || !newPost.user) {
            logger.warn(`${eventName} called with invalid data`);
            return;
          }

          const followers = getFollowersArray(newPost.user.followers);
          const recipientIds = [...followers, newPost.user._id];

          safeEmitToUsers(socket, recipientIds, clientEvent, newPost);
        } catch (error) {
          handleSocketError(socket, eventName, error, { newPost });
        }
      });
    };

    handlePostEvent("likePost", "likeToClient");
    handlePostEvent("unLikePost", "unLikeToClient");
    handlePostEvent("createComment", "createCommentToClient");
    handlePostEvent("deleteComment", "deleteCommentToClient");

    socket.on("sharePost", (data) => {
      try {
        if (!data || !data.sharedPost || !data.originalPost) {
          logger.warn('sharePost called with invalid data');
          return;
        }

        if (data.originalPost.user &&
          data.originalPost.user._id !== data.sharedPost.user._id) {
          const originalPostOwnerId = data.originalPost.user._id.toString();
          const socketId = users.get(originalPostOwnerId);

          if (socketId && io.sockets.sockets.has(socketId)) {
            socket.to(socketId).emit("postSharedNotification", {
              sharedBy: {
                _id: data.sharedPost.user._id,
                username: data.sharedPost.user.username,
                avatar: data.sharedPost.user.avatar
              },
              sharedPost: data.sharedPost,
              originalPost: data.originalPost,
              timestamp: new Date().toISOString()
            });
          }
        }

        const followers = Array.isArray(data.sharedPost.user.followers)
          ? data.sharedPost.user.followers
          : [];

        safeEmitToUsers(socket, followers, "newSharedPostToClient", {
          sharedPost: data.sharedPost,
          originalPost: data.originalPost,
          timestamp: new Date().toISOString()
        });

        logger.info('Post shared event emitted', {
          sharedPostId: data.sharedPost._id,
          originalPostId: data.originalPost._id,
          userId: data.sharedPost.user._id
        });
      } catch (error) {
        handleSocketError(socket, 'sharePost', error, { data });
      }
    });

    socket.on("unsharePost", (data) => {
      try {
        if (!data || !data.postId || !data.originalPostId) {
          logger.warn('unsharePost called with invalid data');
          return;
        }

        if (data.originalPostOwnerId &&
          data.originalPostOwnerId !== data.userId) {
          const socketId = users.get(data.originalPostOwnerId.toString());

          if (socketId && io.sockets.sockets.has(socketId)) {
            socket.to(socketId).emit("postUnsharedNotification", {
              unsharedBy: data.userId,
              postId: data.postId,
              originalPostId: data.originalPostId,
              timestamp: new Date().toISOString()
            });
          }
        }

        if (data.followers && Array.isArray(data.followers)) {
          safeEmitToUsers(socket, data.followers, "sharedPostRemovedToClient", {
            postId: data.postId,
            originalPostId: data.originalPostId,
            timestamp: new Date().toISOString()
          });
        }

        logger.info('Post unshared event emitted', {
          postId: data.postId,
          originalPostId: data.originalPostId,
          userId: data.userId
        });
      } catch (error) {
        handleSocketError(socket, 'unsharePost', error, { data });
      }
    });

    socket.on("updateShareCount", (data) => {
      try {
        if (!data || !data.postId || typeof data.shareCount !== 'number') {
          logger.warn('updateShareCount called with invalid data');
          return;
        }

        socket.broadcast.emit("shareCountUpdated", {
          postId: data.postId,
          shareCount: data.shareCount,
          timestamp: new Date().toISOString()
        });

        logger.debug('Share count updated', {
          postId: data.postId,
          shareCount: data.shareCount
        });
      } catch (error) {
        handleSocketError(socket, 'updateShareCount', error, { data });
      }
    });

    socket.on("createNotify", (msg) => {
      try {
        if (!msg || !msg.recipients) {
          logger.warn('createNotify called without recipients');
          return;
        }

        const recipients = Array.isArray(msg.recipients) ? msg.recipients : [msg.recipients];
        safeEmitToUsers(socket, recipients, "createNotifyToClient", msg);
      } catch (error) {
        handleSocketError(socket, 'createNotify', error, { msg });
      }
    });

    socket.on("addMessage", (msg) => {
      try {
        if (!msg || !msg.recipient) {
          logger.warn('addMessage called without recipient');
          return;
        }

        const recipientId = msg.recipient.toString();
        const socketId = users.get(recipientId);

        if (socketId && io.sockets.sockets.has(socketId)) {
          socket.to(socketId).emit("addMessageToClient", msg);
          socket.emit("messageDelivered", {
            messageId: msg._id,
            deliveredAt: new Date().toISOString()
          });
        } else {
          socket.emit("messageOffline", {
            messageId: msg._id,
            recipient: recipientId
          });
        }
      } catch (error) {
        handleSocketError(socket, 'addMessage', error, { msg });
      }
    });

    socket.on("typing", (data) => {
      try {
        if (!data || !data.recipientId) {
          return;
        }

        const socketId = users.get(data.recipientId.toString());
        if (socketId && io.sockets.sockets.has(socketId)) {
          socket.to(socketId).emit("userTyping", {
            userId: data.userId,
            isTyping: data.isTyping,
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        handleSocketError(socket, 'typing', error, { data });
      }
    });

    socket.on("createStory", (data) => {
      try {
        if (!data || !data.story) {
          logger.warn('createStory called without story data');
          return;
        }

        const followers = getFollowersArray(data.followers);
        safeEmitToUsers(socket, followers, "newStoryAlert", {
          user: data.story.user,
          storyId: data.story._id,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        handleSocketError(socket, 'createStory', error, { data });
      }
    });

    socket.on("joinGroup", (groupId) => {
      try {
        if (!groupId) {
          logger.warn('joinGroup called without groupId');
          return;
        }

        const roomName = `group_${groupId}`;
        socket.join(roomName);

        socket.emit("joinedGroup", {
          groupId,
          timestamp: new Date().toISOString()
        });

        logger.info(`User joined group: ${groupId} (socket: ${socket.id})`);
      } catch (error) {
        handleSocketError(socket, 'joinGroup', error, { groupId });
      }
    });

    socket.on("leaveGroup", (groupId) => {
      try {
        if (!groupId) return;

        const roomName = `group_${groupId}`;
        socket.leave(roomName);

        logger.info(`User left group: ${groupId} (socket: ${socket.id})`);
      } catch (error) {
        handleSocketError(socket, 'leaveGroup', error, { groupId });
      }
    });

    socket.on("sendGroupMessage", (data) => {
      try {
        if (!data || !data.groupId) {
          logger.warn('sendGroupMessage called without groupId');
          return;
        }

        const roomName = `group_${data.groupId}`;
        socket.to(roomName).emit("newGroupMessage", {
          ...data,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        handleSocketError(socket, 'sendGroupMessage', error, { data });
      }
    });

    socket.on("groupTyping", (data) => {
      try {
        if (!data || !data.groupId) return;

        const roomName = `group_${data.groupId}`;
        socket.to(roomName).emit("groupTypingStatus", {
          ...data,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        handleSocketError(socket, 'groupTyping', error, { data });
      }
    });

    socket.on("editGroupMessage", (data) => {
      try {
        if (!data || !data.groupId) return;

        const roomName = `group_${data.groupId}`;
        socket.to(roomName).emit("groupMessageEdited", data);
      } catch (error) {
        handleSocketError(socket, 'editGroupMessage', error, { data });
      }
    });

    socket.on("pinGroupMessage", (data) => {
      try {
        if (!data || !data.groupId) return;

        const roomName = `group_${data.groupId}`;
        socket.to(roomName).emit("groupMessagePinned", data);
      } catch (error) {
        handleSocketError(socket, 'pinGroupMessage', error, { data });
      }
    });

    socket.on("groupCallStarted", (data) => {
      try {
        if (!data || !data.groupId) return;

        const roomName = `group_${data.groupId}`;
        socket.to(roomName).emit("incomingGroupCall", {
          ...data,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        handleSocketError(socket, 'groupCallStarted', error, { data });
      }
    });

    socket.on('error', (error) => {
      logger.error('Socket error:', error, { socketId: socket.id });
    });
  });

  io.getStats = () => ({
    totalUsers: users.size,
    totalAdmins: admins.size,
    connectedSockets: io.sockets.sockets.size,
    onlineUsers: Array.from(users.keys()),
    timestamp: new Date().toISOString()
  });

  io.shutdown = async () => {
    try {
      if (cleanupIntervalId) {
        clearInterval(cleanupIntervalId);
        cleanupIntervalId = null;
      }

      io.emit('serverShutdown', {
        message: 'Server is shutting down',
        timestamp: new Date().toISOString()
      });

      const sockets = await io.fetchSockets();
      for (const socket of sockets) {
        socket.disconnect(true);
      }

      users.clear();
      admins.clear();
      userSockets.clear();

      logger.info(' Socket.IO shutdown complete');
    } catch (error) {
      logger.error('Error during socket shutdown:', error);
    }
  };

  logger.info(' Socket.IO server initialized');

  return io;
};

module.exports = SocketServer;