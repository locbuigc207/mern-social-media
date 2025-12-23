// src/hooks/useRealtimeUpdates.js
import { useEffect, useCallback } from 'react';
import { useSocket } from '../context/SocketContext';
import toast from 'react-hot-toast';

/**
 * Comprehensive real-time updates hook
 * Handles all Socket.IO events for the application
 */
export function useRealtimeUpdates({
  onNewPost,
  onPostUpdated,
  onPostDeleted,
  onNewComment,
  onCommentDeleted,
  onNewLike,
  onNewFollower,
  onNewMessage,
  onMessageRead,
  onMessageDeleted,
  onUserOnline,
  onUserOffline,
  onTyping,
  onNewNotification,
  onScheduledPostPublished,
}) {
  const { socket, onlineUsers } = useSocket();

  // Post Events
  useEffect(() => {
    if (!socket) return;

    // New post from following users
    socket.on('newPost', (data) => {
      console.log('📝 New post:', data);
      if (onNewPost) onNewPost(data.post);
      
      toast.success(`${data.user.fullname} đã đăng bài mới`, {
        duration: 3000,
        icon: '📝',
      });
    });

    // Post updated
    socket.on('postUpdated', (data) => {
      console.log('✏️ Post updated:', data);
      if (onPostUpdated) onPostUpdated(data.post);
    });

    // Post deleted
    socket.on('postDeleted', (data) => {
      console.log('🗑️ Post deleted:', data);
      if (onPostDeleted) onPostDeleted(data.postId);
    });

    // Scheduled post published
    socket.on('scheduledPostPublished', (data) => {
      console.log('⏰ Scheduled post published:', data);
      if (onScheduledPostPublished) onScheduledPostPublished(data.post);
      
      toast.success('Bài viết đã lên lịch được đăng!', {
        icon: '⏰',
      });
    });

    return () => {
      socket.off('newPost');
      socket.off('postUpdated');
      socket.off('postDeleted');
      socket.off('scheduledPostPublished');
    };
  }, [socket, onNewPost, onPostUpdated, onPostDeleted, onScheduledPostPublished]);

  // Comment Events
  useEffect(() => {
    if (!socket) return;

    socket.on('newComment', (data) => {
      console.log('💬 New comment:', data);
      if (onNewComment) onNewComment(data.comment);
    });

    socket.on('commentDeleted', (data) => {
      console.log('🗑️ Comment deleted:', data);
      if (onCommentDeleted) onCommentDeleted(data.commentId);
    });

    return () => {
      socket.off('newComment');
      socket.off('commentDeleted');
    };
  }, [socket, onNewComment, onCommentDeleted]);

  // Like Events
  useEffect(() => {
    if (!socket) return;

    socket.on('newLike', (data) => {
      console.log('❤️ New like:', data);
      if (onNewLike) onNewLike(data);
    });

    return () => {
      socket.off('newLike');
    };
  }, [socket, onNewLike]);

  // Follow Events
  useEffect(() => {
    if (!socket) return;

    socket.on('newFollower', (data) => {
      console.log('👤 New follower:', data);
      if (onNewFollower) onNewFollower(data.follower);
      
      toast.success(`${data.follower.fullname} đã theo dõi bạn`, {
        icon: '👤',
      });
    });

    return () => {
      socket.off('newFollower');
    };
  }, [socket, onNewFollower]);

  // Message Events
  useEffect(() => {
    if (!socket) return;

    socket.on('addMessageToClient', (data) => {
      console.log('💌 New message:', data);
      if (onNewMessage) onNewMessage(data);
    });

    socket.on('messageReadConfirm', (data) => {
      console.log('✓✓ Message read:', data);
      if (onMessageRead) onMessageRead(data);
    });

    socket.on('messageDeleted', (data) => {
      console.log('🗑️ Message deleted:', data);
      if (onMessageDeleted) onMessageDeleted(data.messageId);
    });

    return () => {
      socket.off('addMessageToClient');
      socket.off('messageReadConfirm');
      socket.off('messageDeleted');
    };
  }, [socket, onNewMessage, onMessageRead, onMessageDeleted]);

  // Typing Indicators
  useEffect(() => {
    if (!socket) return;

    socket.on('userTyping', (data) => {
      console.log('⌨️ User typing:', data);
      if (onTyping) onTyping(data);
    });

    return () => {
      socket.off('userTyping');
    };
  }, [socket, onTyping]);

  // Online/Offline Status
  useEffect(() => {
    if (!socket) return;

    socket.on('userOnline', (userId) => {
      console.log('🟢 User online:', userId);
      if (onUserOnline) onUserOnline(userId);
    });

    socket.on('userOffline', (userId) => {
      console.log('⚫ User offline:', userId);
      if (onUserOffline) onUserOffline(userId);
    });

    return () => {
      socket.off('userOnline');
      socket.off('userOffline');
    };
  }, [socket, onUserOnline, onUserOffline]);

  // Notification Events
  useEffect(() => {
    if (!socket) return;

    socket.on('newNotification', (data) => {
      console.log('🔔 New notification:', data);
      if (onNewNotification) onNewNotification(data);
      
      // Show toast based on notification type
      const notifIcons = {
        like: '❤️',
        comment: '💬',
        follow: '👤',
        mention: '@',
        reply: '↩️',
        share: '🔄',
      };
      
      toast(data.text, {
        icon: notifIcons[data.type] || '🔔',
        duration: 4000,
      });
    });

    return () => {
      socket.off('newNotification');
    };
  }, [socket, onNewNotification]);

  return {
    socket,
    onlineUsers,
    isConnected: socket?.connected || false,
  };
}

// Helper hook for emitting events
export function useSocketEmit() {
  const { socket } = useSocket();

  const emitTyping = useCallback((recipientId, isTyping) => {
    if (!socket) return;
    socket.emit('typing', {
      userId: localStorage.getItem('userId'),
      recipientId,
      isTyping,
    });
  }, [socket]);

  const emitMessageRead = useCallback((messageId) => {
    if (!socket) return;
    socket.emit('messageRead', { messageId });
  }, [socket]);

  const joinRoom = useCallback((roomId) => {
    if (!socket) return;
    socket.emit('joinRoom', roomId);
  }, [socket]);

  const leaveRoom = useCallback((roomId) => {
    if (!socket) return;
    socket.emit('leaveRoom', roomId);
  }, [socket]);

  return {
    emitTyping,
    emitMessageRead,
    joinRoom,
    leaveRoom,
  };
}