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


  socket.on("createStory", (data) => {
    const { story, followers } = data;
    
    const followerClients = users.filter((user) => 
      followers.includes(user.id)
    );
    
    if (followerClients.length > 0) {
      followerClients.forEach((client) => {
        socket.to(`${client.socketId}`).emit("newStoryAlert", {
          user: story.user,
          storyId: story._id,
          hasUnviewed: true
        });
      });
    }
  });

  socket.on("viewStory", (data) => {
    const { storyId, viewerId, storyOwnerId } = data;
    
    const owner = users.find((user) => user.id === storyOwnerId);
    
    if (owner) {
      socket.to(`${owner.socketId}`).emit("storyViewed", {
        storyId,
        viewer: viewerId,
        viewedAt: new Date()
      });
    }
  });

  socket.on("replyToStory", (data) => {
    const { storyOwnerId, reply } = data;
    
    const owner = users.find((user) => user.id === storyOwnerId);
    
    if (owner) {
      socket.to(`${owner.socketId}`).emit("storyReply", {
        reply,
        timestamp: new Date()
      });
    }
  });

  socket.on("deleteStory", (data) => {
    const { storyId, followers } = data;
    
    const followerClients = users.filter((user) => 
      followers.includes(user.id)
    );
    
    if (followerClients.length > 0) {
      followerClients.forEach((client) => {
        socket.to(`${client.socketId}`).emit("storyDeleted", {
          storyId
        });
      });
    }
  });

  socket.on("checkStoriesUpdate", (userId) => {
    socket.emit("storiesUpdateStatus", {
      hasNewStories: true, 
      timestamp: new Date()
    });
  });


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
    
    socket.to(`group_${groupId}`).emit("newGroupMessage", {
      groupId,
      message,
      timestamp: new Date()
    });
  });

  socket.on("groupTyping", (data) => {
    const { groupId, userId, username, isTyping } = data;
    
    socket.to(`group_${groupId}`).emit("groupTypingStatus", {
      groupId,
      userId,
      username,
      isTyping
    });
  });

  socket.on("groupMessageReaction", (data) => {
    const { groupId, messageId, userId, emoji } = data;
    
    socket.to(`group_${groupId}`).emit("groupReactionAdded", {
      messageId,
      userId,
      emoji,
      timestamp: new Date()
    });
  });

  socket.on("memberAddedToGroup", (data) => {
    const { groupId, newMembers, addedBy } = data;
    
    socket.to(`group_${groupId}`).emit("groupMemberAdded", {
      groupId,
      newMembers,
      addedBy,
      timestamp: new Date()
    });
    
    newMembers.forEach(memberId => {
      const newMember = users.find(u => u.id === memberId);
      if (newMember) {
        socket.to(`${newMember.socketId}`).emit("addedToGroup", {
          groupId,
          addedBy,
          timestamp: new Date()
        });
      }
    });
  });

  socket.on("memberRemovedFromGroup", (data) => {
    const { groupId, removedMemberId, removedBy } = data;
    
    socket.to(`group_${groupId}`).emit("groupMemberRemoved", {
      groupId,
      removedMemberId,
      removedBy,
      timestamp: new Date()
    });
    
    const removedMember = users.find(u => u.id === removedMemberId);
    if (removedMember) {
      socket.to(`${removedMember.socketId}`).emit("removedFromGroup", {
        groupId,
        removedBy,
        timestamp: new Date()
      });
    }
  });

  socket.on("groupInfoUpdated", (data) => {
    const { groupId, updates, updatedBy } = data;
    
    socket.to(`group_${groupId}`).emit("groupInfoChanged", {
      groupId,
      updates,
      updatedBy,
      timestamp: new Date()
    });
  });

  socket.on("memberLeftGroup", (data) => {
    const { groupId, memberId } = data;
    
    socket.to(`group_${groupId}`).emit("groupMemberLeft", {
      groupId,
      memberId,
      timestamp: new Date()
    });
  });

  socket.on("groupMessageRead", (data) => {
    const { groupId, messageIds, userId } = data;
    
    socket.to(`group_${groupId}`).emit("groupMessagesRead", {
      groupId,
      messageIds,
      userId,
      readAt: new Date()
    });
  });

  socket.on("deleteGroupMessage", (data) => {
    const { groupId, messageId, deletedBy } = data;
    
    socket.to(`group_${groupId}`).emit("groupMessageDeleted", {
      groupId,
      messageId,
      deletedBy,
      timestamp: new Date()
    });
  });

  socket.on("editGroupMessage", (data) => {
    const { groupId, messageId, newText, editedBy } = data;
    
    socket.to(`group_${groupId}`).emit("groupMessageEdited", {
      groupId,
      messageId,
      newText,
      editedBy,
      timestamp: new Date()
    });
  });

  socket.on("pinGroupMessage", (data) => {
    const { groupId, messageId, pinnedBy } = data;
    
    socket.to(`group_${groupId}`).emit("groupMessagePinned", {
      groupId,
      messageId,
      pinnedBy,
      timestamp: new Date()
    });
  });

  socket.on("groupCallStarted", (data) => {
    const { groupId, callerId, callType } = data;
    
    socket.to(`group_${groupId}`).emit("incomingGroupCall", {
      groupId,
      callerId,
      callType,
      timestamp: new Date()
    });
  });
};

module.exports = SocketServer;