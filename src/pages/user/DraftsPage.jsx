// src/pages/user/DraftsPage.jsx
import { useState, useEffect } from 'react';
import { getDrafts, deleteDraft, publishDraft } from '../../api/post';
import { FiEdit, FiTrash2, FiSend, FiClock } from 'react-icons/fi';
import Header from '../../components/user/Header';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export default function DraftsPage() {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDrafts();
  }, []);

  const fetchDrafts = async () => {
    try {
      setLoading(true);
      const res = await getDrafts();
      setDrafts(res.drafts || []);
    } catch (err) {
      toast.error('Không thể tải danh sách nháp');
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async (draftId) => {
    if (!confirm('Bạn muốn đăng bài nháp này?')) return;

    try {
      await publishDraft(draftId);
      toast.success('Đã đăng bài thành công!');
      setDrafts(drafts.filter(d => d._id !== draftId));
    } catch (err) {
      toast.error('Đăng bài thất bại');
    }
  };

  const handleDelete = async (draftId) => {
    if (!confirm('Bạn muốn xóa bài nháp này?')) return;

    try {
      await deleteDraft(draftId);
      toast.success('Đã xóa nháp');
      setDrafts(drafts.filter(d => d._id !== draftId));
    } catch (err) {
      toast.error('Xóa thất bại');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 pt-16">
      <Header />
      
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="bg-white rounded-xl shadow-sm p-6 mb-4">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FiEdit className="text-blue-600" />
            Bài viết nháp
          </h1>
          <p className="text-gray-600 text-sm mt-1">
            {drafts.length} bài nháp
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : drafts.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <FiEdit className="text-6xl text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              Chưa có bài nháp nào
            </h3>
            <p className="text-gray-500">
              Các bài viết chưa hoàn thành sẽ xuất hiện ở đây
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {drafts.map((draft) => (
              <div
                key={draft._id}
                className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <p className="text-gray-800 line-clamp-3 mb-2">
                      {draft.content || '(Không có nội dung)'}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <FiClock />
                      <span>
                        Đã lưu lúc {new Date(draft.updatedAt).toLocaleString('vi-VN')}
                      </span>
                    </div>
                  </div>

                  {draft.images && draft.images.length > 0 && (
                    <img
                      src={draft.images[0].url}
                      className="w-20 h-20 object-cover rounded-lg ml-4"
                      alt="preview"
                    />
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handlePublish(draft._id)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                  >
                    <FiSend />
                    Đăng ngay
                  </button>
                  
                  <button
                    onClick={() => {/* Open edit modal */}}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                  >
                    <FiEdit />
                  </button>
                  
                  <button
                    onClick={() => handleDelete(draft._id)}
                    className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition"
                  >
                    <FiTrash2 />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}