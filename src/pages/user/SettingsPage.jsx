import { useState, useEffect } from "react";
import {
  FiLock,
  FiEye,
  FiMessageSquare,
  FiUsers,
  FiSave,
  FiShield,
  FiKey,
} from "react-icons/fi";
import { toast } from "react-hot-toast";

import { getPrivacySettings, updatePrivacySettings } from "../../api/user";
import { changePassword } from "../../api/auth";
import Header from "../../components/user/Header";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);

  // State quản lý tab
  const [activeTab, setActiveTab] = useState("privacy");

  // State PRIVACY
  const [settings, setSettings] = useState({
    profileVisibility: "public",
    whoCanMessage: "everyone",
    whoCanComment: "everyone",
    whoCanTag: "everyone",
    showFollowers: true,
    showFollowing: true,
  });
  const [savingSettings, setSavingSettings] = useState(false);

  // State CHANGE PASSWORD
  const [passwordData, setPasswordData] = useState({
    oldPassword: "",
    newPassword: "",
    cnfNewPassword: "",
  });
  const [savingPassword, setSavingPassword] = useState(false);

  // Load dữ liệu khi vào trang
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await getPrivacySettings();
        // Merge dữ liệu từ server vào state
        if (res.privacySettings) {
          setSettings((prev) => ({ ...prev, ...res.privacySettings }));
        }
      } catch (err) {
        console.error("Lỗi tải cài đặt:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  //TODO HANDLE cho SETTING
  const handleSettingChange = (e) => {
    const { name, value } = e.target;
    setSettings((prev) => ({ ...prev, [name]: value }));
  };

  const handleToggle = (name) => {
    setSettings((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await updatePrivacySettings(settings);
      toast.success("Đã cập nhật cài đặt thành công!");
    } catch (err) {
      console.error(err);
      toast.error("Cập nhật thất bại.");
    } finally {
      setSavingSettings(false);
    }
  };

  //TODO HANDLE cho PASSWORD
  const handlePasswordInput = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
  };

  const handleChangePassword = async () => {
    if (!passwordData.oldPassword || !passwordData.newPassword) {
      return toast.error("Vui lòng nhập đầy đủ thông tin!");
    }
    if (passwordData.newPassword !== passwordData.cnfNewPassword) {
      return toast.error("Mật khẩu xác nhận không khớp!");
    }
    if (passwordData.newPassword.length < 6) {
      return toast.error("Mật khẩu mới phải có ít nhất 6 ký tự!");
    }

    setSavingPassword(true);
    try {
      await changePassword({
        oldPassword: passwordData.oldPassword,
        newPassword: passwordData.newPassword,
        cnfNewPassword: passwordData.cnfNewPassword,
      });
      toast.success("Đổi mật khẩu thành công!");
      setPasswordData({
        oldPassword: "",
        newPassword: "",
        cnfNewPassword: "",
      });
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Đổi mật khẩu thất bại.");
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50 pt-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-10 px-4">
      <Header />
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <FiSettingsIcon className="w-8 h-8 text-blue-600" />
          Cài đặt & Quyền riêng tư
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Sidebar Menu  */}
          <div className="col-span-1">
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <nav className="flex flex-col">
                <button
                  onClick={() => setActiveTab("privacy")}
                  className={`flex items-center gap-3 px-4 py-3 font-medium transition border-l-4 ${
                    activeTab === "privacy"
                      ? "bg-blue-50 text-blue-700 border-blue-600"
                      : "text-gray-600 hover:bg-gray-50 border-transparent"
                  }`}
                >
                  <FiShield className="text-xl" />
                  Quyền riêng tư
                </button>
                <button
                  onClick={() => setActiveTab("security")}
                  className={`flex items-center gap-3 px-4 py-3 font-medium transition border-l-4 ${
                    activeTab === "security"
                      ? "bg-blue-50 text-blue-700 border-blue-600"
                      : "text-gray-600 hover:bg-gray-50 border-transparent"
                  }`}
                >
                  <FiLock className="text-xl" />
                  Mật khẩu & Bảo mật
                </button>
              </nav>
            </div>
          </div>

          {/* Main Content Form */}
          <div className="col-span-1 md:col-span-2 space-y-6">
            {/* TAB 1: QUYỀN RIÊNG TƯ */}
            {activeTab === "privacy" && (
              <div className="space-y-6 animate-fadeIn">
                <Section title="Hiển thị trang cá nhân" icon={<FiEye />}>
                  <SelectGroup
                    label="Ai có thể xem trang cá nhân?"
                    name="profileVisibility"
                    value={settings.profileVisibility}
                    onChange={handleSettingChange}
                    options={[
                      { value: "public", label: "Công khai" },
                      { value: "private", label: "Riêng tư" },
                    ]}
                  />
                  <ToggleGroup
                    label="Hiển thị danh sách Followers"
                    checked={settings.showFollowers}
                    onClick={() => handleToggle("showFollowers")}
                  />
                  <ToggleGroup
                    label="Hiển thị danh sách Following"
                    checked={settings.showFollowing}
                    onClick={() => handleToggle("showFollowing")}
                  />
                </Section>

                <Section title="Tương tác" icon={<FiMessageSquare />}>
                  <SelectGroup
                    label="Ai có thể nhắn tin cho bạn?"
                    name="whoCanMessage"
                    value={settings.whoCanMessage}
                    onChange={handleSettingChange}
                    options={[
                      { value: "everyone", label: "Mọi người" },
                      { value: "friends", label: "Bạn bè" },
                      { value: "no_one", label: "Không ai cả" },
                    ]}
                  />
                  <SelectGroup
                    label="Ai có thể bình luận?"
                    name="whoCanComment"
                    value={settings.whoCanComment}
                    onChange={handleSettingChange}
                    options={[
                      { value: "everyone", label: "Mọi người" },
                      { value: "friends", label: "Bạn bè" },
                    ]}
                  />
                  <SelectGroup
                    label="Ai có thể gắn thẻ (Tag)?"
                    name="whoCanTag"
                    value={settings.whoCanTag}
                    onChange={handleSettingChange}
                    options={[
                      { value: "everyone", label: "Mọi người" },
                      { value: "friends", label: "Bạn bè" },
                    ]}
                  />
                </Section>

                <div className="flex justify-end">
                  <SaveButton
                    onClick={handleSaveSettings}
                    loading={savingSettings}
                    text="Lưu thay đổi"
                  />
                </div>
              </div>
            )}

            {/* TAB 2: MẬT KHẨU & BẢO MẬT */}
            {activeTab === "security" && (
              <div className="space-y-6 animate-fadeIn">
                <Section title="Đổi mật khẩu" icon={<FiKey />}>
                  <div className="space-y-4">
                    <InputGroup
                      label="Mật khẩu hiện tại"
                      name="oldPassword"
                      type="password"
                      placeholder="Nhập mật khẩu hiện tại"
                      value={passwordData.oldPassword}
                      onChange={handlePasswordInput}
                    />
                    <InputGroup
                      label="Mật khẩu mới"
                      name="newPassword"
                      type="password"
                      placeholder="Nhập mật khẩu mới"
                      value={passwordData.newPassword}
                      onChange={handlePasswordInput}
                    />
                    <InputGroup
                      label="Xác nhận mật khẩu mới"
                      name="cnfNewPassword"
                      type="password"
                      placeholder="Nhập lại mật khẩu mới"
                      value={passwordData.cnfNewPassword}
                      onChange={handlePasswordInput}
                    />
                  </div>
                </Section>

                <div className="flex justify-end">
                  <SaveButton
                    onClick={handleChangePassword}
                    loading={savingPassword}
                    text="Cập nhật mật khẩu"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

//! COMPONENT CON
function Section({ title, icon, children }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2 bg-gray-50/50">
        <span className="text-blue-600 text-lg">{icon}</span>
        <h2 className="font-semibold text-gray-800">{title}</h2>
      </div>
      <div className="p-6 space-y-6">{children}</div>
    </div>
  );
}

function InputGroup({
  label,
  name,
  type = "text",
  value,
  onChange,
  placeholder,
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition text-gray-800 text-sm"
      />
    </div>
  );
}

function SelectGroup({ label, name, value, onChange, options }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
      <label className="text-gray-700 font-medium">{label}</label>
      <select
        name={name}
        value={value}
        onChange={onChange}
        className="w-full sm:w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white text-gray-700 text-sm"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function ToggleGroup({ label, checked, onClick }) {
  return (
    <div
      className="flex items-center justify-between cursor-pointer group"
      onClick={onClick}
    >
      <span className="text-gray-700 font-medium group-hover:text-gray-900 transition">
        {label}
      </span>
      <div
        className={`w-12 h-6 flex items-center bg-gray-300 rounded-full p-1 duration-300 ease-in-out ${
          checked ? "bg-blue-600" : ""
        }`}
      >
        <div
          className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ease-in-out ${
            checked ? "translate-x-6" : ""
          }`}
        ></div>
      </div>
    </div>
  );
}

function SaveButton({ onClick, loading, text }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
    >
      {loading ? (
        <>
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          Đang xử lý...
        </>
      ) : (
        <>
          <FiSave /> {text}
        </>
      )}
    </button>
  );
}

function FiSettingsIcon(props) {
  return (
    <svg
      {...props}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}
