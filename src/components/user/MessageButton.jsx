// src/components/user/MessageButton.jsx
import { FiMessageCircle } from "react-icons/fi";
import { useChatPopup } from "./ChatPopupManager";

export default function MessageButton({ user, className = "" }) {
  const { openChat } = useChatPopup();

  const handleMessage = () => {
    if (!user || !user._id) {
      console.error("Invalid user data:", user);
      return;
    }

    openChat({
      _id: user._id,
      fullname: user.fullname,
      username: user.username,
      avatar: user.avatar || "/avatar.png",
    });
  };

  return (
    <button
      onClick={handleMessage}
      className={`px-4 py-2 bg-gray-200 text-gray-700 rounded-lg flex items-center gap-2 hover:bg-gray-300 transition font-medium ${className}`}
    >
      <FiMessageCircle />
      Nhắn tin
    </button>
  );
}