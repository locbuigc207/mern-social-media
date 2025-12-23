// src/pages/user/EnhancedPrivacyPage.jsx
import { useState, useEffect } from 'react';
import { FiEye, FiEyeOff, FiShield, FiLock } from 'react-icons/fi';
import { getPrivacySettings, updatePrivacySettings, getCurrentUser } from '../../api/user';
import Header from '../../components/user/Header';
import toast from 'react-hot-toast';

export default function EnhancedPrivacyPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [settings, setSettings] = useState({
    // Profile visibility
    profileVisibility: 'public', // public, friends, private
    
    // Posts & Content
    whoCanSeeMyPosts: 'public', // public, friends, only_me
    whoCanCommentOnMyPosts: 'everyone', // everyone, friends, no_one
    whoCanShareMyPosts: 'everyone', // everyone, friends, no_one
    
    // Interactions
    whoCanTagMe: 'everyone', // everyone, friends, no_one
    whoCanSendFriendRequests: 'everyone', // everyone, friends_of_friends, no_one
    whoCanMessageMe: 'everyone', // everyone, friends, no_one
    
    // Story settings
    whoCanViewMyStory: 'everyone', // everyone, friends, close_friends
    whoCanReplyToMyStory: 'everyone', // everyone, friends, close_friends, no_one
    
    // Profile elements
    showFollowersList: true,
    showFollowingList: true,
    showEmail: false,
    showBirthday: false,
    showLocation: true,
    
    // Activity status
    showOnlineStatus: true,
    showLastSeen: true,
    showTypingIndicator: true,
    showReadReceipts: true,
    
    // Search & Discovery
    allowSearchByEmail: true,
    allowSearchByPhone: false,
    suggestToFriendsOfFriends: true,
  });
  
  const [viewAsMode, setViewAsMode] = useState(null); // null, 'public', 'friend'
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const [userRes, settingsRes] = await Promise.all([
        getCurrentUser(),
        getPrivacySettings()
      ]);
      
      setCurrentUser(userRes.user || userRes);
      
      if (settingsRes.privacySettings) {
        setSettings(prev => ({ ...prev, ...settingsRes.privacySettings }));
      }
    } catch (err) {
      toast.error('Không thể tải cài đặt');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updatePrivacySettings(settings);
      toast.success('Đã lưu cài đặt!');
    } catch (err) {
      toast.error('Lưu thất bại');
    } finally {
      setSaving(false);
    }
  };

  const PrivacyOption = ({ label, name, options, description }) => (
    <div className="py-4 border-b border-gray-100 last:border-0">
      <div className="flex justify-between items-start mb-2">
        <div>
          <p className="font-medium text-gray-900">{label}</p>
          {description && (
            <p className="text-sm text-gray-500 mt-1">{description}</p>
          )}
        </div>
        <select
          value={settings[name]}
          onChange={(e) => setSettings({...settings, [name]: e.target.value})}
          className="px-3 py-2 border rounded-lg text-sm bg-white"
        >
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
    </div>
  );

  const ToggleOption = ({ label, name, description }) => (
    <div className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0">
      <div>
        <p className="font-medium text-gray-900">{label}</p>
        {description && (
          <p className="text-sm text-gray-500 mt-1">{description}</p>
        )}
      </div>
      <button
        onClick={() => setSettings({...settings, [name]: !settings[name]})}
        className={`w-12 h-6 rounded-full transition ${
          settings[name] ? 'bg-blue-600' : 'bg-gray-300'
        }`}
      >
        <div className={`w-5 h-5 bg-white rounded-full shadow transform transition ${
          settings[name] ? 'translate-x-6' : 'translate-x-0.5'
        }`}></div>
      </button>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-16">
        <Header />
        <div className="flex justify-center items-center h-screen">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <Header />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <FiShield className="text-2xl text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Quyền riêng tư & Bảo mật
                </h1>
                <p className="text-sm text-gray-600">
                  Quản lý ai có thể xem và tương tác với bạn
                </p>
              </div>
            </div>

            {/* View As Button */}
            <div className="flex gap-2">
              <button
                onClick={() => setViewAsMode(viewAsMode === 'public' ? null : 'public')}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition ${
                  viewAsMode === 'public' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <FiEye />
                Xem như người lạ
              </button>
            </div>
          </div>
        </div>

        {viewAsMode && (
          <div className="bg-blue-50 border-l-4 border-blue-600 p-4 mb-6 rounded">
            <p className="text-blue-900 font-medium">
              Bạn đang xem trang cá nhân như {viewAsMode === 'public' ? 'người lạ' : 'bạn bè'}
            </p>
            <button
              onClick={() => setViewAsMode(null)}
              className="text-blue-600 hover:underline text-sm mt-1"
            >
              Thoát chế độ xem
            </button>
          </div>
        )}

        {/* Profile Visibility */}
        <Section title="Hiển thị trang cá nhân" icon={<FiEye />}>
          <PrivacyOption
            label="Ai có thể xem trang cá nhân?"
            name="profileVisibility"
            options={[
              { value: 'public', label: 'Công khai' },
              { value: 'friends', label: 'Chỉ bạn bè' },
              { value: 'private', label: 'Riêng tư (chỉ mình tôi)' }
            ]}
          />
          <ToggleOption
            label="Hiển thị danh sách người theo dõi"
            name="showFollowersList"
          />
          <ToggleOption
            label="Hiển thị danh sách đang theo dõi"
            name="showFollowingList"
          />
          <ToggleOption
            label="Hiển thị email"
            name="showEmail"
          />
        </Section>

        {/* Posts & Content */}
        <Section title="Bài viết & Nội dung" icon={<FiLock />}>
          <PrivacyOption
            label="Ai có thể xem bài viết của tôi?"
            name="whoCanSeeMyPosts"
            options={[
              { value: 'public', label: 'Công khai' },
              { value: 'friends', label: 'Bạn bè' },
              { value: 'only_me', label: 'Chỉ mình tôi' }
            ]}
          />
          <PrivacyOption
            label="Ai có thể bình luận?"
            name="whoCanCommentOnMyPosts"
            options={[
              { value: 'everyone', label: 'Mọi người' },
              { value: 'friends', label: 'Bạn bè' },
              { value: 'no_one', label: 'Không ai' }
            ]}
          />
          <PrivacyOption
            label="Ai có thể chia sẻ bài viết?"
            name="whoCanShareMyPosts"
            options={[
              { value: 'everyone', label: 'Mọi người' },
              { value: 'friends', label: 'Bạn bè' },
              { value: 'no_one', label: 'Không ai' }
            ]}
          />
        </Section>

        {/* Story Settings */}
        <Section title="Cài đặt Story">
          <PrivacyOption
            label="Ai có thể xem story?"
            name="whoCanViewMyStory"
            options={[
              { value: 'everyone', label: 'Mọi người' },
              { value: 'friends', label: 'Bạn bè' },
              { value: 'close_friends', label: 'Bạn thân' }
            ]}
          />
          <PrivacyOption
            label="Ai có thể phản hồi story?"
            name="whoCanReplyToMyStory"
            options={[
              { value: 'everyone', label: 'Mọi người' },
              { value: 'friends', label: 'Bạn bè' },
              { value: 'close_friends', label: 'Bạn thân' },
              { value: 'no_one', label: 'Không ai' }
            ]}
          />
        </Section>

        {/* Activity Status */}
        <Section title="Trạng thái hoạt động">
          <ToggleOption
            label="Hiển thị trạng thái online"
            name="showOnlineStatus"
            description="Cho phép người khác thấy bạn đang online"
          />
          <ToggleOption
            label="Hiển thị lần online cuối"
            name="showLastSeen"
            description="Cho phép người khác biết lần cuối bạn online"
          />
          <ToggleOption
            label="Hiển thị đang nhập"
            name="showTypingIndicator"
            description="Cho phép người khác thấy khi bạn đang nhập tin nhắn"
          />
          <ToggleOption
            label="Thông báo đã đọc"
            name="showReadReceipts"
            description="Cho phép người khác biết bạn đã đọc tin nhắn"
          />
        </Section>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50"
          >
            {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, icon, children }) {
  return (
    <div className="bg-white rounded-xl shadow-sm mb-6 overflow-hidden">
      <div className="px-6 py-4 bg-gray-50 border-b flex items-center gap-2">
        {icon && <span className="text-blue-600">{icon}</span>}
        <h2 className="font-semibold text-gray-900">{title}</h2>
      </div>
      <div className="px-6">
        {children}
      </div>
    </div>
  );
}