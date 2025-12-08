let users = [];
let admins = [];

const SocketServer = (socket) => {
  socket.on("joinUser", (id) => {
    users = users.filter(user => user.id !== id);
    
    users.push({ id, socketId: socket.id });
    
    console.log(` User joined: ${id}, Total users: ${users.length}`);
    
    socket.broadcast.emit("userOnline", id);
  });

  socket.on("joinAdmin", (id) => {
    admins = admins.filter(admin => admin.id !== id);
    
    admins.push({ id, socketId: socket.id });
    
    const admin = admins.find((admin) => admin.id === id);
    let totalActiveUsers = users.length;

    socket.to(`${admin.socketId}`).emit("activeUsers", totalActiveUsers);
    
    console.log(` Admin joined: ${id}, Total admins: ${admins.length}`);
  });

  socket.on("disconnect", () => {
    const disconnectedUser = users.find(user => user.socketId === socket.id);
    const disconnectedAdmin = admins.find(admin => admin.socketId === socket.id);
    
    if (disconnectedUser) {
      console.log(` User disconnected: ${disconnectedUser.id}`);
      socket.broadcast.emit("userOffline", disconnectedUser.id);
    }
    
    if (disconnectedAdmin) {
      console.log(` Admin disconnected: ${disconnectedAdmin.id}`);
    }
    
    users = users.filter((user) => user.socketId !== socket.id);
    admins = admins.filter((admin) => admin.socketId !== socket.id);
    
    console.log(` Remaining users: ${users.length}, admins: ${admins.length}`);
  });

  socket.on("likePost", (newPost) => {
    let ids = [...newPost.user.followers, newPost.user._id];
    const clients = users.filter((user) => ids.includes(user.id));
    if (clients.length > 0) {
      clients.forEach((client) => {
        socket.to(`${client.socketId}`).emit("likeToClient", newPost);
      });
    }
  });

  socket.on("unLikePost", (newPost) => {
    let ids = [...newPost.user.followers, newPost.user._id];
    const clients = users.filter((user) => ids.includes(user.id));
    if (clients.length > 0) {
      clients.forEach((client) => {
        socket.to(`${client.socketId}`).emit("unLikeToClient", newPost);
      });
    }
  });

  socket.on("createComment", (newPost) => {
    let ids = [...newPost.user.followers, newPost.user._id];
    const clients = users.filter((user) => ids.includes(user.id));
    if (clients.length > 0) {
      clients.forEach((client) => {
        socket.to(`${client.socketId}`).emit("createCommentToClient", newPost);
      });
    }
  });

  socket.on("deleteComment", (newPost) => {
    let ids = [...newPost.user.followers, newPost.user._id];
    const clients = users.filter((user) => ids.includes(user.id));
    if (clients.length > 0) {
      clients.forEach((client) => {
        socket.to(`${client.socketId}`).emit("deleteCommentToClient", newPost);
      });
    }
  });

  socket.on("follow", (newUser) => {
    const user = users.find((user) => user.id === newUser._id);
    user && socket.to(`${user.socketId}`).emit("followToClient", newUser);
  });

  socket.on("unFollow", (newUser) => {
    const user = users.find((user) => user.id === newUser._id);
    user && socket.to(`${user.socketId}`).emit("unFollowToClient", newUser);
  });

  socket.on("createNotify", (msg) => {
    const clients = users.filter((user) => msg.recipients.includes(user.id));
    if (clients.length > 0) {
      clients.forEach((client) => {
        socket.to(`${client.socketId}`).emit("createNotifyToClient", msg);
      });
    }
  });

  socket.on("removeNotify", (msg) => {
    const clients = users.filter((user) => msg.recipients.includes(user.id));
    if (clients.length > 0) {
      clients.forEach((client) => {
        socket.to(`${client.socketId}`).emit("removeNotifyToClient", msg);
      });
    }
  });

  socket.on("getActiveUsers", (id) => {
    const admin = admins.find((user) => user.id === id);
    const totalActiveUsers = users.length;

    if (admin) {
      socket
        .to(`${admin.socketId}`)
        .emit("getActiveUsersToClient", totalActiveUsers);
    }
  });

  socket.on("addMessage", (msg) => {
    const user = users.find(user => user.id === msg.recipient);
    
    if (user) {
      socket.to(`${user.socketId}`).emit("addMessageToClient", msg);
      
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
  });

  socket.on("markMessageRead", (data) => {
    const { messageId, senderId } = data;
    
    const sender = users.find(user => user.id === senderId);
    
    if (sender) {
      socket.to(`${sender.socketId}`).emit("messageReadConfirm", {
        messageId,
        readAt: new Date()
      });
    }
  });

  socket.on("typing", (data) => {
    const { recipientId, isTyping } = data;
    
    const recipient = users.find(user => user.id === recipientId);
    
    if (recipient) {
      socket.to(`${recipient.socketId}`).emit("userTyping", {
        userId: data.userId,
        isTyping
      });
    }
  });

  socket.on("deleteMessage", (data) => {
    const { messageId, recipientId } = data;
    
    const recipient = users.find(user => user.id === recipientId);
    
    if (recipient) {
      socket.to(`${recipient.socketId}`).emit("messageDeleted", {
        messageId
      });
    }
  });

  socket.on("checkUserOnline", (userId) => {
    const user = users.find(u => u.id === userId);
    socket.emit("userOnlineStatus", {
      userId,
      isOnline: !!user
    });
  });

  
  socket.on("userBlocked", (data) => {
    const { blockedUserId } = data;
    const blockedUser = users.find(user => user.id === blockedUserId);
    
    if (blockedUser) {
      socket.to(`${blockedUser.socketId}`).emit("youWereBlocked", {
        blockerId: data.blockerId
      });
    }
  });

  socket.on("userUnblocked", (data) => {
    const { unblockedUserId } = data;
    const unblockedUser = users.find(user => user.id === unblockedUserId);
    
    if (unblockedUser) {
      socket.to(`${unblockedUser.socketId}`).emit("youWereUnblocked", {
        unblockerId: data.unblockerId
      });
    }
  });

  
  socket.on("postScheduled", (data) => {
    const { userId, post } = data;
    const user = users.find(u => u.id === userId);
    
    if (user) {
      socket.to(`${user.socketId}`).emit("scheduleConfirmed", {
        post,
        scheduledDate: post.scheduledDate
      });
    }
  });

  socket.on("scheduledPostPublished", (data) => {
    const { post } = data;
    const postOwner = users.find(u => u.id === post.user._id);
    
    if (postOwner) {
      socket.to(`${postOwner.socketId}`).emit("yourScheduledPostPublished", {
        postId: post._id,
        publishedAt: new Date()
      });
    }
    
    if (post.user.followers) {
      const followers = users.filter(u => 
        post.user.followers.includes(u.id)
      );
      
      followers.forEach(follower => {
        socket.to(`${follower.socketId}`).emit("newPostFromFollowing", {
          post
        });
      });
    }
  });


  
  socket.on("getOnlineUsers", () => {
    const onlineUserIds = users.map(u => u.id);
    socket.emit("onlineUsersList", onlineUserIds);
  });

};

module.exports = SocketServer;