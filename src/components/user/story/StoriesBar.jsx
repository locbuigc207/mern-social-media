// src/components/story/StoriesBar.jsx
import { useState, useEffect } from "react";
import { FiPlus } from "react-icons/fi";
import { getStoriesFeed } from "../../../api/story";
import CreateStoryModal from "./CreateStoryModal";
import StoryViewer from "./StoryViewer";

export default function StoriesBar({ currentUser }) {
  const [storiesFeed, setStoriesFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedUserStories, setSelectedUserStories] = useState(null);

  useEffect(() => {
    fetchStories();
  }, []);

  const fetchStories = async () => {
    try {
      setLoading(true);
      const data = await getStoriesFeed();
      setStoriesFeed(data.storiesFeed || []);
    } catch (error) {
      console.error("Fetch stories error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStoryCreated = (newStory) => {
    fetchStories(); // Refresh stories
  };

  const handleClickStory = (userStories) => {
    setSelectedUserStories(userStories);
  };

  // Callback khi đóng StoryViewer - Refresh danh sách
  const handleCloseViewer = () => {
    setSelectedUserStories(null);
    fetchStories(); // Refresh để xóa story đã bị xóa
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow p-4 mb-6 mt-15">
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {/* Create Story Card */}
          <div
            onClick={() => setShowCreateModal(true)}
            className="shrink-0 w-28 cursor-pointer group"
          >
            <div className="relative w-28 h-44 bg-linear-to-b from-gray-200 to-gray-100 rounded-lg overflow-hidden border-2 border-blue-500">
              <img
                src={currentUser?.avatar}
                className="w-full h-32 object-cover"
                alt="Your story"
              />
              <div className="absolute bottom-0 left-0 right-0 h-12 bg-white flex items-center justify-center">
                <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center border-4 border-white">
                  <FiPlus className="text-white text-xl" />
                </div>
                <p className="text-xs font-semibold mt-4">Tạo story</p>
              </div>
            </div>
          </div>

          {/* Stories from Following */}
          {loading ? (
            <div className="flex gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="shrink-0 w-28 h-44 bg-gray-200 rounded-lg animate-pulse"
                />
              ))}
            </div>
          ) : (
            storiesFeed.map((userStory) => (
              <div
                key={userStory.user._id}
                onClick={() => handleClickStory(userStory)}
                className="shrink-0 w-28 cursor-pointer group"
              >
                <div
                  className={`relative w-28 h-44 rounded-lg overflow-hidden ${
                    userStory.hasUnviewed
                      ? "ring-4 ring-blue-500"
                      : "ring-2 ring-gray-300"
                  }`}
                >
                  {/* Background Image */}
                  <img
                    src={userStory.stories[0].media.url}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    alt={userStory.user.fullname}
                  />
                  
                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-linear-to-b from-black/30 via-transparent to-black/60" />
                  
                  {/* User Avatar */}
                  <div className="absolute top-2 left-2">
                    <img
                      src={userStory.user.avatar}
                      className={`w-10 h-10 rounded-full object-cover border-4 ${
                        userStory.hasUnviewed
                          ? "border-blue-500"
                          : "border-gray-400"
                      }`}
                      alt={userStory.user.fullname}
                    />
                  </div>

                  {/* User Name */}
                  <div className="absolute bottom-2 left-2 right-2">
                    <p className="text-white text-xs font-semibold truncate drop-shadow-lg">
                      {userStory.user.fullname}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modals */}
      <CreateStoryModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        currentUser={currentUser}
        onStoryCreated={handleStoryCreated}
      />

      {selectedUserStories && (
        <StoryViewer
          userStories={selectedUserStories}
          onClose={handleCloseViewer}
        />
      )}
    </>
  );
}