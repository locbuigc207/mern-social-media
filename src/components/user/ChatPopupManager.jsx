// src/components/ChatPopupManager.jsx
import React, { useEffect, useState } from "react";
import ChatPopup from "./ChatPopup";

/* ================================
   Hook để mở chat từ bất kỳ đâu
================================ */
export const useChatPopup = () => {
  const openChat = (recipient) => {
    window.dispatchEvent(
      new CustomEvent("openChatPopup", { detail: recipient })
    );
  };

  return { openChat };
};

/* ================================
   ChatPopupManager (DUY NHẤT)
================================ */
const ChatPopupManager = () => {
  const [openChats, setOpenChats] = useState([]);
  const [minimizedChats, setMinimizedChats] = useState([]);

  /* ================================
     Listen event mở chat (1 lần)
  ================================ */
  useEffect(() => {
    const handleOpenChat = (e) => {
      openChat(e.detail);
    };

    window.addEventListener("openChatPopup", handleOpenChat);
    return () =>
      window.removeEventListener("openChatPopup", handleOpenChat);
  }, []);

  /* ================================
     Mở chat (tối đa 2)
     Chat mới nằm bên phải
  ================================ */
  const openChat = (recipient) => {
    setOpenChats((prev) => {
      // bỏ nếu đã tồn tại
      const filtered = prev.filter(
        (c) => c._id !== recipient._id
      );

      // thêm chat mới vào CUỐI (bên phải)
      const updated = [...filtered, recipient];

      // chỉ giữ tối đa 2 chat
      return updated.slice(-2);
    });

    // nếu đang minimize thì bỏ
    setMinimizedChats((prev) =>
      prev.filter((c) => c._id !== recipient._id)
    );
  };

  /* ================================
     Đóng chat
  ================================ */
  const closeChat = (recipientId) => {
    setOpenChats((prev) =>
      prev.filter((c) => c._id !== recipientId)
    );
    setMinimizedChats((prev) =>
      prev.filter((c) => c._id !== recipientId)
    );
  };

  /* ================================
     Minimize chat
  ================================ */
  const minimizeChat = (recipientId) => {
    setOpenChats((prev) => {
      const chat = prev.find((c) => c._id === recipientId);
      if (!chat) return prev;

      setMinimizedChats((minPrev) => {
        if (minPrev.some((c) => c._id === recipientId)) return minPrev;
        return [...minPrev, chat];
      });

      return prev.filter((c) => c._id !== recipientId);
    });
  };

  /* ================================
     Restore chat
  ================================ */
  const restoreChat = (recipientId) => {
    const chat = minimizedChats.find(
      (c) => c._id === recipientId
    );
    if (!chat) return;

    setMinimizedChats((prev) =>
      prev.filter((c) => c._id !== recipientId)
    );

    setOpenChats((prev) => [...prev, chat].slice(-2));
  };

  return (
    <>
      {/* ================================
          Open Chat Popups
      ================================ */}
      <div className="fixed bottom-0 right-4 flex gap-4 z-50">
        {openChats.map((recipient) => (
          <ChatPopup
            key={recipient._id}
            recipient={recipient}
            onClose={() => closeChat(recipient._id)}
            onMinimize={() => minimizeChat(recipient._id)}
          />
        ))}
      </div>

      {/* ================================
          Minimized Chats
      ================================ */}
      {minimizedChats.length > 0 && (
        <div className="fixed bottom-0 right-4 flex gap-2 pb-2 z-40">
          {minimizedChats.map((chat) => (
            <button
              key={chat._id}
              onClick={() => restoreChat(chat._id)}
              className="flex items-center gap-2 px-3 py-2 bg-white rounded-t-lg shadow border hover:bg-gray-50 transition group"
            >
              <img
                src={chat.avatar}
                alt={chat.fullname}
                className="w-7 h-7 rounded-full object-cover"
              />
              <span className="text-sm max-w-[100px] truncate">
                {chat.fullname}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeChat(chat._id);
                }}
                className="opacity-0 group-hover:opacity-100 ml-1"
              >
                ×
              </button>
            </button>
          ))}
        </div>
      )}
    </>
  );
};

export default ChatPopupManager;