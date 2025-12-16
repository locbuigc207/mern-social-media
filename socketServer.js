let users = new Map();
let admins = new Map();

const SocketServer = (socket) => {
  // --- HỆ THỐNG KẾT NỐI ---
  socket.on("joinUser", (id) => {
    users.set(id, socket.id);
    console.log(`👤 User joined: ${id}, Total users: ${users.size}`);
    socket.broadcast.emit("userOnline", id);
  });

  socket.on("joinAdmin", (id) => {
    admins.set(id, socket.id);
    console.log(`👨‍💼 Admin joined: ${id}, Total admins: ${admins.size}`);
    socket.to(socket.id).emit("activeUsers", users.size);
  });

  socket.on("disconnect", () => {
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
      console.log(`👋 User disconnected: ${disconnectedUserId}`);
      socket.broadcast.emit("userOffline", disconnectedUserId);
    }

    if (disconnectedAdminId) {
      console.log(`👋 Admin disconnected: ${disconnectedAdminId}`);
    }

    console.log(`📊 Remaining - Users: ${users.size}, Admins: ${admins.size}`);
  });

  // --- HELPER FUNCTIONS ---
  const getUsersFromIds = (ids) => {
    const result = [];
    for (const id of ids) {
      const socketId = users.get(id);
      if (socketId) {
        result.push({ id, socketId });
      }
    }
    return result;
  };

  // --- TƯƠNG TÁC BÀI VIẾT (LIKE, COMMENT) ---
  socket.on("likePost", (newPost) => {
    let ids = [...newPost.user.followers, newPost.user._id];
    const clients = getUsersFromIds(ids);
    clients.forEach((client) => {
      socket.to(client.socketId).emit("likeToClient", newPost);
    });
  });

  socket.on("unLikePost", (newPost) => {
    let ids = [...newPost.user.followers, newPost.user._id];
    const clients = getUsersFromIds(ids);
    clients.forEach((client) => {
      socket.to(client.socketId).emit("unLikeToClient", newPost);
    });
  });

  socket.on("createComment", (newPost) => {
    let ids = [...newPost.user.followers, newPost.user._id];
    const clients = getUsersFromIds(ids);
    clients.forEach((client) => {
      socket.to(client.socketId).emit("createCommentToClient", newPost);
    });
  });

  socket.on("deleteComment", (newPost) => {
    let ids = [...newPost.user.followers, newPost.user._id];
    const clients = getUsersFromIds(ids);
    clients.forEach((client) => {
      socket.to(client.socketId).emit("deleteCommentToClient", newPost);
    });
  });

  // --- FOLLOW & THÔNG BÁO ---
  socket.on("follow", (newUser) => {
    const socketId = users.get(newUser._id);
    if (socketId) socket.to(socketId).emit("followToClient", newUser);
  });

  socket.on("unFollow", (newUser) => {
    const socketId = users.get(newUser._id);
    if (socketId) socket.to(socketId).emit("unFollowToClient", newUser);
  });

  socket.on("createNotify", (msg) => {
    const clients = getUsersFromIds(msg.recipients);
    clients.forEach((client) => {
      socket.to(client.socketId).emit("createNotifyToClient", msg);
    });
  });

  socket.on("removeNotify", (msg) => {
    const clients = getUsersFromIds(msg.recipients);
    clients.forEach((client) => {
      socket.to(client.socketId).emit("removeNotifyToClient", msg);
    });
  });

  // --- TIN NHẮN (MESSAGE) ---
  socket.on("addMessage", (msg) => {
    const socketId = users.get(msg.recipient);
    if (socketId) {
      socket.to(socketId).emit("addMessageToClient", msg);
      socket.emit("messageDelivered", { messageId: msg._id, deliveredAt: new Date() });
    } else {
      socket.emit("messageOffline", { messageId: msg._id, recipient: msg.recipient });
    }
  });

  socket.on("markMessageRead", (data) => {
    const { messageId, senderId } = data;
    const socketId = users.get(senderId);
    if (socketId) {
      socket.to(socketId).emit("messageReadConfirm", { messageId, readAt: new Date() });
    }
  });

  socket.on("typing", (data) => {
    const { recipientId, isTyping } = data;
    const socketId = users.get(recipientId);
    if (socketId) {
      socket.to(socketId).emit("userTyping", { userId: data.userId, isTyping });
    }
  });

  socket.on("deleteMessage", (data) => {
    const { messageId, recipientId } = data;
    const socketId = users.get(recipientId);
    if (socketId) {
      socket.to(socketId).emit("messageDeleted", { messageId });
    }
  });

  // --- TRẠNG THÁI ONLINE & ADMIN ---
  socket.on("getActiveUsers", (id) => {
    const adminSocketId = admins.get(id);
    if (adminSocketId) {
      socket.to(adminSocketId).emit("getActiveUsersToClient", users.size);
    }
  });

  socket.on("checkUserOnline", (userId) => {
    const isOnline = users.has(userId);
    socket.emit("userOnlineStatus", { userId, isOnline });
  });

  socket.on("getOnlineUsers", () => {
    const onlineUserIds = Array.from(users.keys());
    socket.emit("onlineUsersList", onlineUserIds);
  });

  // --- CHẶN NGƯỜI DÙNG ---
  socket.on("userBlocked", (data) => {
    const socketId = users.get(data.blockedUserId);
    if (socketId) {
      socket.to(socketId).emit("youWereBlocked", { blockerId: data.blockerId });
    }
  });

  socket.on("userUnblocked", (data) => {
    const socketId = users.get(data.unblockedUserId);
    if (socketId) {
      socket.to(socketId).emit("youWereUnblocked", { unblockerId: data.unblockerId });
    }
  });

  // --- LỊCH TRÌNH BÀI VIẾT ---
  socket.on("postScheduled", (data) => {
    const { userId, post } = data;
    const socketId = users.get(userId);
    if (socketId) {
      socket.to(socketId).emit("scheduleConfirmed", { post, scheduledDate: post.scheduledDate });
    }
  });

  socket.on("scheduledPostPublished", (data) => {
    const { post } = data;
    const ownerSocketId = users.get(post.user._id);
    if (ownerSocketId) {
      socket.to(ownerSocketId).emit("yourScheduledPostPublished", { postId: post._id, publishedAt: new Date() });
    }
    if (post.user.followers) {
      const followers = getUsersFromIds(post.user.followers);
      followers.forEach(follower => {
        socket.to(follower.socketId).emit("newPostFromFollowing", { post });
      });
    }
  });

  // --- STORIES ---
  socket.on("createStory", (data) => {
    const { story, followers } = data;
    const clients = getUsersFromIds(followers);
    clients.forEach((client) => {
      socket.to(client.socketId).emit("newStoryAlert", { user: story.user, storyId: story._id, hasUnviewed: true });
    });
  });

  socket.on("viewStory", (data) => {
    const { storyId, viewerId, storyOwnerId } = data;
    const ownerSocketId = users.get(storyOwnerId);
    if (ownerSocketId) {
      socket.to(ownerSocketId).emit("storyViewed", { storyId, viewer: viewerId, viewedAt: new Date() });
    }
  });

  socket.on("replyToStory", (data) => {
    const { storyOwnerId, reply } = data;
    const ownerSocketId = users.get(storyOwnerId);
    if (ownerSocketId) {
      socket.to(ownerSocketId).emit("storyReply", { reply, timestamp: new Date() });
    }
  });

  socket.on("deleteStory", (data) => {
    const { storyId, followers } = data;
    const clients = getUsersFromIds(followers);
    clients.forEach((client) => {
      socket.to(client.socketId).emit("storyDeleted", { storyId });
    });
  });

  socket.on("checkStoriesUpdate", (userId) => {
    socket.emit("storiesUpdateStatus", { hasNewStories: true, timestamp: new Date() });
  });

  // --- NHÓM (GROUPS) ---
  socket.on("joinGroup", (groupId) => {
    socket.join(`group_${groupId}`);
    console.log(`User joined group room: ${groupId}`);
  });

  socket.on("leaveGroup", (groupId) => {
    socket.leave(`group_${groupId}`);
    console.log(`User left group room: ${groupId}`);
  });

  socket.on("sendGroupMessage", (data) => {
    const { groupId, message } = data;
    socket.to(`group_${groupId}`).emit("newGroupMessage", { groupId, message, timestamp: new Date() });
  });

  socket.on("groupTyping", (data) => {
    const { groupId, userId, username, isTyping } = data;
    socket.to(`group_${groupId}`).emit("groupTypingStatus", { groupId, userId, username, isTyping });
  });

  socket.on("groupMessageReaction", (data) => {
    const { groupId, messageId, userId, emoji } = data;
    socket.to(`group_${groupId}`).emit("groupReactionAdded", { messageId, userId, emoji, timestamp: new Date() });
  });

  socket.on("memberAddedToGroup", (data) => {
    const { groupId, newMembers, addedBy } = data;
    socket.to(`group_${groupId}`).emit("groupMemberAdded", { groupId, newMembers, addedBy, timestamp: new Date() });
    newMembers.forEach(memberId => {
      const socketId = users.get(memberId);
      if (socketId) socket.to(socketId).emit("addedToGroup", { groupId, addedBy, timestamp: new Date() });
    });
  });

  socket.on("memberRemovedFromGroup", (data) => {
    const { groupId, removedMemberId, removedBy } = data;
    socket.to(`group_${groupId}`).emit("groupMemberRemoved", { groupId, removedMemberId, removedBy, timestamp: new Date() });
    const socketId = users.get(removedMemberId);
    if (socketId) socket.to(socketId).emit("removedFromGroup", { groupId, removedBy, timestamp: new Date() });
  });

  socket.on("groupInfoUpdated", (data) => {
    const { groupId, updates, updatedBy } = data;
    socket.to(`group_${groupId}`).emit("groupInfoChanged", { groupId, updates, updatedBy, timestamp: new Date() });
  });

  socket.on("memberLeftGroup", (data) => {
    const { groupId, memberId } = data;
    socket.to(`group_${groupId}`).emit("groupMemberLeft", { groupId, memberId, timestamp: new Date() });
  });

  socket.on("groupMessageRead", (data) => {
    const { groupId, messageIds, userId } = data;
    socket.to(`group_${groupId}`).emit("groupMessagesRead", { groupId, messageIds, userId, readAt: new Date() });
  });

  socket.on("deleteGroupMessage", (data) => {
    const { groupId, messageId, deletedBy } = data;
    socket.to(`group_${groupId}`).emit("groupMessageDeleted", { groupId, messageId, deletedBy, timestamp: new Date() });
  });

  socket.on("editGroupMessage", (data) => {
    const { groupId, messageId, newText, editedBy } = data;
    socket.to(`group_${groupId}`).emit("groupMessageEdited", { groupId, messageId, newText, editedBy, timestamp: new Date() });
  });

  socket.on("pinGroupMessage", (data) => {
    const { groupId, messageId, pinnedBy } = data;
    socket.to(`group_${groupId}`).emit("groupMessagePinned", { groupId, messageId, pinnedBy, timestamp: new Date() });
  });

  socket.on("groupCallStarted", (data) => {
    const { groupId, callerId, callType } = data;
    socket.to(`group_${groupId}`).emit("incomingGroupCall", { groupId, callerId, callType, timestamp: new Date() });
  });
};

module.exports = SocketServer;