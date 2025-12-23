// src/components/MessageDropdown.jsx
import React, { useState, useEffect, useRef } from "react";
import { FiMessageCircle, FiSend } from "react-icons/fi";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { Link } from "react-router-dom";
import { getConversations, getUnreadCount, getUnreadByConversation } from "../../api/message";
import { useSocket } from "../../context/SocketContext";

const MessageDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  const { socket, onlineUsers } = useSocket();
  const currentUserId = localStorage.getItem("userId");

  // Lấy người nhận trong conversation (không phải current user)
  const getRecipient = (recipients) => {
    return recipients.find((user) => user._id !== currentUserId);
  };

  // Lấy danh sách conversations với unread count riêng lẻ
  const fetchConversations = async () => {
    try {
      setLoading(true);
      const data = await getConversations(10);
      const conversationsData = data.conversations || [];

      // Lấy unread count cho từng conversation
      const conversationsWithUnread = await Promise.all(
        conversationsData.map(async (conv) => {
          const recipient = getRecipient(conv.recipients);
          if (!recipient) return { ...conv, unreadCount: 0 };

          try {
            const unreadData = await getUnreadByConversation(recipient._id);
            return {
              ...conv,
              unreadCount: unreadData.unreadCount || 0,
            };
          } catch (err) {
            console.error("Lỗi load unread cho conversation:", err);
            return { ...conv, unreadCount: 0 };
          }
        })
      );

      setConversations(conversationsWithUnread);
    } catch (err) {
      console.error("Lỗi load conversations:", err);
    } finally {
      setLoading(false);
    }
  };

  // Lấy số lượng tin nhắn chưa đọc tổng
  const fetchUnreadCount = async () => {
    try {
      const data = await getUnreadCount();
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      console.error("Lỗi load unread count:", err);
    }
  };

  // Socket listeners - Listen for new messages
  useEffect(() => {
    if (!socket) return;

    // Khi nhận tin nhắn mới
    socket.on("addMessageToClient", (msg) => {
      console.log("📨 New message received in dropdown:", msg);

      // Tăng unread count
      setUnreadCount((prev) => prev + 1);

      // Cập nhật conversation list
      setConversations((prev) => {
        // Tìm conversation với sender
        const convIndex = prev.findIndex((conv) => {
          const recipient = getRecipient(conv.recipients);
          return recipient?._id === msg.sender;
        });

        if (convIndex !== -1) {
          // Cập nhật conversation hiện có
          const updatedConvs = [...prev];
          const conv = updatedConvs[convIndex];
          
          updatedConvs[convIndex] = {
            ...conv,
            text: msg.text,
            media: msg.media || [],
            updatedAt: msg.createdAt || new Date().toISOString(),
            unreadCount: (conv.unreadCount || 0) + 1,
          };

          // Di chuyển conversation lên đầu
          const [updatedConv] = updatedConvs.splice(convIndex, 1);
          return [updatedConv, ...updatedConvs];
        } else {
          // Conversation mới - cần fetch lại để có đầy đủ thông tin
          fetchConversations();
          return prev;
        }
      });
    });

    // Khi tin nhắn được đánh dấu đã đọc
    socket.on("messageReadConfirm", ({ messageId }) => {
      console.log("✅ Message read confirmed:", messageId);
      // Có thể cập nhật UI nếu cần
    });

    return () => {
      socket.off("addMessageToClient");
      socket.off("messageReadConfirm");
    };
  }, [socket, currentUserId]);

  // Load conversations khi mở dropdown
  useEffect(() => {
    if (isOpen) {
      fetchConversations();
      fetchUnreadCount();
    }
  }, [isOpen]);

  // Load unread count ban đầu
  useEffect(() => {
    fetchUnreadCount();
    
    // Auto refresh mỗi 30s (backup cho trường hợp socket fail)
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // Đóng khi click ngoài
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Format thời gian
  const formatTime = (date) => {
    try {
      return formatDistanceToNow(new Date(date), {
        addSuffix: true,
        locale: vi,
      });
    } catch {
      return "";
    }
  };

  // Truncate text
  const truncateText = (text, maxLength = 50) => {
    if (!text) return "";
    return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
  };

  // Check if user is online
  const isUserOnline = (userId) => {
    return onlineUsers.includes(userId);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Message Icon */}
      <div className="relative cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
        <FiMessageCircle className="text-2xl text-gray-600 hover:text-gray-800 transition" />
        {unreadCount > 0 && (
          <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
            {unreadCount > 99 ? "99+" : unreadCount}
          </div>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 font-semibold text-lg flex items-center justify-between">
            <span>Đoạn chat</span>
            <Link
              to="/message"
              className="text-sm text-blue-500 hover:text-blue-600"
              onClick={() => setIsOpen(false)}
            >
              Xem tất cả
            </Link>
          </div>

          <div className="overflow-y-auto max-h-80">
            {loading ? (
              <div className="p-8 text-center text-gray-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <FiMessageCircle className="text-4xl mx-auto mb-2 opacity-50" />
                <p>Chưa có tin nhắn nào</p>
              </div>
            ) : (
              <ul>
                {conversations.map((conv) => {
                  const recipient = getRecipient(conv.recipients);
                  if (!recipient) return null;

                  const hasUnread = conv.unreadCount > 0;
                  const isOnline = isUserOnline(recipient._id);

                  return (
                    <li key={conv._id}>
                      <button
                        onClick={async () => {
                          // Mở chat popup
                          window.dispatchEvent(
                            new CustomEvent("openChatPopup", { detail: recipient })
                          );

                          // GỌI API markAllAsRead cho conversation này
                          if (hasUnread) {
                            try {
                              // Import API function
                              const { markAllAsRead } = await import("../../api/message");
                              
                              // Đánh dấu tất cả tin nhắn từ user này là đã đọc
                              await markAllAsRead(recipient._id);
                              
                              console.log(`Marked all messages from ${recipient.fullname} as read`);
                              
                              // Giảm unread count tổng
                              setUnreadCount((prev) => Math.max(prev - conv.unreadCount, 0));
                              
                              // Cập nhật conversation thành đã đọc
                              setConversations((prev) =>
                                prev.map((c) =>
                                  c._id === conv._id ? { ...c, unreadCount: 0 } : c
                                )
                              );
                            } catch (error) {
                              console.error("Error marking messages as read:", error);
                              // Vẫn cập nhật UI để UX tốt hơn
                              setUnreadCount((prev) => Math.max(prev - conv.unreadCount, 0));
                              setConversations((prev) =>
                                prev.map((c) =>
                                  c._id === conv._id ? { ...c, unreadCount: 0 } : c
                                )
                              );
                            }
                          }

                          // Đóng dropdown
                          setIsOpen(false);
                        }}
                        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition border-b border-gray-100 text-left"
                      >
                        {/* Avatar */}
                        <div className="relative">
                          <img
                            src={recipient.avatar}
                            alt={recipient.fullname}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                          {/* Online indicator */}
                          {isOnline && (
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h4
                              className={`text-sm truncate ${
                                hasUnread ? "font-bold text-gray-900" : "font-medium text-gray-700"
                              }`}
                            >
                              {recipient.fullname}
                            </h4>
                            <span className="text-xs text-gray-500 ml-2">
                              {formatTime(conv.updatedAt)}
                            </span>
                          </div>
                          <p
                            className={`text-sm truncate ${
                              hasUnread ? "font-semibold text-gray-900" : "text-gray-600"
                            }`}
                          >
                            {conv.media && conv.media.length > 0 ? (
                              <span className="flex items-center gap-1">
                                <FiSend className="text-xs" />
                                Đã gửi {conv.media.length} file đính kèm
                              </span>
                            ) : (
                              truncateText(conv.text)
                            )}
                          </p>
                        </div>

                        {/* Unread indicator */}
                        {hasUnread && (
                          <div className="flex flex-col items-center gap-1">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            {conv.unreadCount > 1 && (
                              <span className="text-xs text-blue-500 font-semibold">
                                {conv.unreadCount}
                              </span>
                            )}
                          </div>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageDropdown;