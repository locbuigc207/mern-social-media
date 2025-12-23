// src/components/ChatPopup.jsx
import React, { useState, useEffect, useRef } from "react";
import {
  FiX,
  FiMinus,
  FiSend,
  FiImage,
  FiSmile,
  FiPhone,
  FiVideo,
} from "react-icons/fi";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import {
  getMessages,
  createMessageWithMedia,
  markAllAsRead,
} from "../../api/message";
import { useSocket } from "../../context/SocketContext";

const ChatPopup = ({ recipient, onClose, onMinimize }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedImages, setSelectedImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const { socket, onlineUsers } = useSocket();
  const currentUserId = localStorage.getItem("userId");

  const isOnline = onlineUsers.includes(recipient._id);

  // Cleanup previews on unmount
  useEffect(() => {
    return () => {
      imagePreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [imagePreviews]);

  useEffect(() => {
    if (recipient) {
      fetchMessages();
      inputRef.current?.focus();
      markAllAsRead(recipient._id).catch((err) =>
        console.error("Error marking as read:", err)
      );
    }
  }, [recipient]);

  // Socket listeners
  useEffect(() => {
    if (!socket) return;

    socket.on("addMessageToClient", (msg) => {
      if (msg.sender === recipient._id) {
        setMessages((prev) => [...prev, msg]);
        scrollToBottom();
        markAllAsRead(recipient._id).catch((err) =>
          console.error("Error marking as read:", err)
        );
      }
    });

    socket.on("userTyping", ({ userId, isTyping }) => {
      if (userId === recipient._id) {
        setIsTyping(isTyping);
      }
    });

    socket.on("messageReadConfirm", ({ messageId, readAt }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === messageId ? { ...msg, isRead: true, readAt } : msg
        )
      );
    });

    socket.on("messageDeleted", ({ messageId }) => {
      setMessages((prev) => prev.filter((msg) => msg._id !== messageId));
    });

    return () => {
      socket.off("addMessageToClient");
      socket.off("userTyping");
      socket.off("messageReadConfirm");
      socket.off("messageDeleted");
    };
  }, [socket, recipient]);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const data = await getMessages(recipient._id);
      const validMessages = (data.messages || [])
        .filter((msg) => msg && msg.sender)
        .reverse();

      setMessages(validMessages);
      scrollToBottom();
    } catch (err) {
      console.error("Lỗi load messages:", err);
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleTyping = () => {
    if (!socket) return;

    socket.emit("typing", {
      userId: currentUserId,
      recipientId: recipient._id,
      isTyping: true,
    });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("typing", {
        userId: currentUserId,
        recipientId: recipient._id,
        isTyping: false,
      });
    }, 2000);
  };

  // Handle image selection
  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    if (selectedImages.length + files.length > 5) {
      alert("Chỉ được gửi tối đa 5 ảnh/video!");
      return;
    }

    setSelectedImages((prev) => [...prev, ...files]);

    const newPreviews = files.map((file) => URL.createObjectURL(file));
    setImagePreviews((prev) => [...prev, ...newPreviews]);
  };

  // Remove image
  const removeImage = (index) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
    URL.revokeObjectURL(imagePreviews[index]);
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  // Send message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() && selectedImages.length === 0) return;

    const messageText = newMessage;
    const images = selectedImages;

    setNewMessage("");
    setSelectedImages([]);
    imagePreviews.forEach((url) => URL.revokeObjectURL(url));
    setImagePreviews([]);
    setSending(true);

    try {
      const formData = new FormData();
      formData.append("recipient", recipient._id);
      formData.append("text", messageText);

      images.forEach((img) => {
        formData.append("files", img);
      });

      const result = await createMessageWithMedia(formData);

      setMessages((prev) => [...prev, result.message]);
      scrollToBottom();

      if (socket) {
        socket.emit("addMessage", result.message);
      }
    } catch (err) {
      console.error("Lỗi gửi tin nhắn:", err);
      alert("Không thể gửi tin nhắn. Vui lòng thử lại!");
    } finally {
      setSending(false);
    }
  };

  if (!recipient) return null;

  return (
    <div
      className="
      w-[90vw] sm:w-80
      h-[60vh] sm:h-[420px]
      min-h-[380px]
      max-h-[70vh]
      bg-white rounded-t-lg
      flex flex-col
      shadow-2xl border border-gray-300
      animate-slideUp
    "
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-blue-500 text-white rounded-t-lg">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="relative">
            <img
              src={recipient.avatar}
              alt={recipient.fullname}
              className="w-10 h-10 rounded-full object-cover border-2 border-white"
            />
            {isOnline && (
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm truncate">
              {recipient.fullname}
            </h3>
            <p className="text-xs opacity-90">
              {isOnline ? "Đang hoạt động" : "Không hoạt động"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            className="hover:bg-white/20 p-1.5 rounded-full transition"
            title="Gọi điện thoại"
          >
            <FiPhone className="text-base" />
          </button>

          <button
            className="hover:bg-white/20 p-1.5 rounded-full transition"
            title="Gọi video"
          >
            <FiVideo className="text-base" />
          </button>

          <button
            onClick={onMinimize}
            className="hover:bg-white/20 p-1.5 rounded-full transition"
            title="Thu nhỏ"
          >
            <FiMinus className="text-base" />
          </button>

          <button
            onClick={onClose}
            className="hover:bg-white/20 p-1.5 rounded-full transition"
            title="Đóng"
          >
            <FiX className="text-base" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <FiSmile className="text-4xl mb-2 opacity-50" />
            <p className="text-sm">Chưa có tin nhắn nào</p>
            <p className="text-xs">Gửi tin nhắn đầu tiên nào!</p>
          </div>
        ) : (
          messages.map((msg) => {
            // So sánh sender._id nếu sender là object, hoặc sender nếu là string
            const senderId =
              typeof msg.sender === "object" ? msg.sender._id : msg.sender;
            const isOwn = senderId === currentUserId;

            return (
              <div
                key={msg._id}
                className={`flex w-full ${
                  isOwn ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`flex flex-col ${
                    isOwn ? "items-end" : "items-start"
                  } max-w-[75%]`}
                >
                  {/* Images */}
                  {msg.media && msg.media.length > 0 && (
                    <div
                      className={`${
                        msg.media.length === 1 ? "flex" : "grid grid-cols-2"
                      } gap-1 mb-1`}
                    >
                      {msg.media.map((item, idx) => (
                        <img
                          key={idx}
                          src={item.url}
                          alt="media"
                          className={`rounded-lg object-cover cursor-pointer hover:opacity-90 ${
                            msg.media.length === 1
                              ? "max-w-[200px] max-h-[300px]"
                              : "w-full h-32"
                          }`}
                          onClick={() => window.open(item.url, "_blank")}
                        />
                      ))}
                    </div>
                  )}

                  {/* Text */}
                  {msg.text && (
                    <div className="flex flex-col gap-1">
                      {/* Story Reply Badge */}
                      {msg.storyReply && (
                        <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                          <span>📖</span>
                          <span className="italic">Phản hồi story</span>
                        </div>
                      )}

                      <div
                        className={`px-4 py-2 rounded-2xl ${
                          isOwn
                            ? "bg-blue-600 text-white rounded-br-md"
                            : "bg-gray-200 text-gray-800 rounded-bl-md"
                        }`}
                        style={{
                          wordBreak: "break-word",
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        <p className="text-sm">{msg.text}</p>
                      </div>
                    </div>
                  )}

                  {msg.createdAt && (
                    <span className="text-xs text-gray-500 mt-1">
                      {formatDistanceToNow(new Date(msg.createdAt), {
                        addSuffix: true,
                        locale: vi,
                      })}
                      {isOwn && msg.isRead && " • Đã xem"}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}

        {isTyping && (
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <div className="flex gap-1">
              <span
                className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                style={{ animationDelay: "0ms" }}
              ></span>
              <span
                className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                style={{ animationDelay: "150ms" }}
              ></span>
              <span
                className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                style={{ animationDelay: "300ms" }}
              ></span>
            </div>
            <span>đang gõ...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Image Previews */}
      {imagePreviews.length > 0 && (
        <div className="px-3 py-2 border-t bg-gray-50">
          <div className="flex gap-2 overflow-x-auto">
            {imagePreviews.map((preview, idx) => (
              <div key={idx} className="relative shrink-0">
                <img
                  src={preview}
                  alt="preview"
                  className="w-16 h-16 object-cover rounded"
                />
                <button
                  onClick={() => removeImage(idx)}
                  className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={handleSendMessage}
        className="p-3 bg-white border-t border-gray-200"
      >
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={handleImageSelect}
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-blue-500 hover:bg-blue-50 p-2 rounded-full transition"
            title="Thêm ảnh"
          >
            <FiImage className="text-xl" />
          </button>

          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                handleTyping();
              }}
              placeholder="Aa"
              disabled={sending}
              className="w-full px-4 py-2 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm disabled:opacity-50"
            />
          </div>

          <button
            type="button"
            className="text-blue-500 hover:bg-blue-50 p-2 rounded-full transition"
            title="Emoji"
          >
            <FiSmile className="text-xl" />
          </button>

          <button
            type="submit"
            disabled={
              sending || (!newMessage.trim() && selectedImages.length === 0)
            }
            className={`p-2 rounded-full transition ${
              sending || (!newMessage.trim() && selectedImages.length === 0)
                ? "text-gray-400 cursor-not-allowed"
                : "text-blue-500 hover:bg-blue-50"
            }`}
            title="Gửi"
          >
            <FiSend className="text-xl" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatPopup;
