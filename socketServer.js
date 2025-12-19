const { Server } = require('socket.io');
const logger = require('./utils/logger');

let users = new Map();
let admins = new Map();

const SocketServer = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.SOCKET_CORS_ORIGIN || "http://localhost:3000",
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });


  const getUsersFromIds = (ids) => {
    try {
      if (!Array.isArray(ids)) return [];
      const result = [];
      for (const id of ids) {
        if (!id) continue;
        const socketId = users.get(id.toString());
        if (socketId) result.push({ id, socketId });
      }
      return result;
    } catch (error) {
      logger.error('Error in getUsersFromIds:', error);
      return [];
    }
  };

  const getFollowersArray = (followers) => Array.isArray(followers) ? followers : [];

  const cleanupStaleConnections = () => {
    const connectedSockets = Array.from(io.sockets.sockets.keys());
    for (const [userId, socketId] of users.entries()) {
      if (!connectedSockets.includes(socketId)) users.delete(userId);
    }
    for (const [adminId, socketId] of admins.entries()) {
      if (!connectedSockets.includes(socketId)) admins.delete(adminId);
    }
    logger.info(`🧹 Cleanup complete. Users: ${users.size}, Admins: ${admins.size}`);
  };

  setInterval(cleanupStaleConnections, 5 * 60 * 1000);


  io.on('connection', (socket) => {
    logger.info(`🔌 New socket connection: ${socket.id}`);

    const handleError = (eventName, error, data = {}) => {
      logger.error(`Socket error in ${eventName}:`, error, data);
      socket.emit('error', { event: eventName, message: 'Server error' });
    };

    socket.on("joinUser", (id) => {
      if (!id) return;
      const userId = id.toString();
      users.set(userId, socket.id);
      socket.broadcast.emit("userOnline", userId);
      socket.emit("connectionStatus", { connected: true, userId, onlineUsers: Array.from(users.keys()) });
      logger.info(`👤 User joined: ${userId}`);
    });

    socket.on("joinAdmin", (id) => {
      if (!id) return;
      admins.set(id.toString(), socket.id);
      socket.emit("activeUsers", users.size);
      logger.info(`👨‍💼 Admin joined: ${id}`);
    });

    socket.on("disconnect", () => {
      let disconnectedUserId = null;
      for (const [userId, socketId] of users.entries()) {
        if (socketId === socket.id) {
          disconnectedUserId = userId;
          users.delete(userId);
          break;
        }
      }
      for (const [adminId, socketId] of admins.entries()) {
        if (socketId === socket.id) {
          admins.delete(adminId);
          break;
        }
      }
      if (disconnectedUserId) socket.broadcast.emit("userOffline", disconnectedUserId);
      logger.info(`👋 Disconnected: ${socket.id}`);
    });

    const handlePostEvent = (newPost, clientEvent) => {
      if (!newPost?.user) return;
      const ids = [...getFollowersArray(newPost.user.followers), newPost.user._id];
      getUsersFromIds(ids).forEach(c => socket.to(c.socketId).emit(clientEvent, newPost));
    };

    socket.on("likePost", (p) => handlePostEvent(p, "likeToClient"));
    socket.on("unLikePost", (p) => handlePostEvent(p, "unLikeToClient"));
    socket.on("createComment", (p) => handlePostEvent(p, "createCommentToClient"));
    socket.on("deleteComment", (p) => handlePostEvent(p, "deleteCommentToClient"));

    socket.on("createNotify", (msg) => {
      if (!msg?.recipients) return;
      const recipients = Array.isArray(msg.recipients) ? msg.recipients : [msg.recipients];
      getUsersFromIds(recipients).forEach(c => socket.to(c.socketId).emit("createNotifyToClient", msg));
    });

    socket.on("addMessage", (msg) => {
      if (!msg?.recipient) return;
      const socketId = users.get(msg.recipient.toString());
      if (socketId) {
        socket.to(socketId).emit("addMessageToClient", msg);
        socket.emit("messageDelivered", { messageId: msg._id, deliveredAt: new Date() });
      }
    });

    socket.on("typing", (d) => {
      const sId = users.get(d?.recipientId?.toString());
      if (sId) socket.to(sId).emit("userTyping", { userId: d.userId, isTyping: d.isTyping });
    });

    socket.on("createStory", (d) => {
      if (!d?.story) return;
      getUsersFromIds(getFollowersArray(d.followers)).forEach(c => {
        socket.to(c.socketId).emit("newStoryAlert", { user: d.story.user, storyId: d.story._id });
      });
    });

    socket.on("joinGroup", (id) => { if(id) socket.join(`group_${id}`); });
    
    socket.on("sendGroupMessage", (d) => {
      if (d?.groupId) socket.to(`group_${d.groupId}`).emit("newGroupMessage", { ...d, timestamp: new Date() });
    });

    socket.on("groupCallStarted", (d) => {
      if (d?.groupId) socket.to(`group_${d.groupId}`).emit("incomingGroupCall", { ...d, timestamp: new Date() });
    });

    socket.on("groupTyping", (d) => {
      if (d?.groupId) socket.to(`group_${d.groupId}`).emit("groupTypingStatus", d);
    });

    socket.on("editGroupMessage", (d) => {
      if (d?.groupId) socket.to(`group_${d.groupId}`).emit("groupMessageEdited", d);
    });

    socket.on("pinGroupMessage", (d) => {
      if (d?.groupId) socket.to(`group_${d.groupId}`).emit("groupMessagePinned", d);
    });
    
  }); 

  io.getStats = () => ({
    totalUsers: users.size,
    totalAdmins: admins.size,
    connectedSockets: io.sockets.sockets.size,
    onlineUsers: Array.from(users.keys())
  });

  return io;
};

module.exports = SocketServer;