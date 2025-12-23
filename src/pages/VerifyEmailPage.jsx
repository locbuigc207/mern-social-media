import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export default function VerifyEmailPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // verifying, success, error
  const [message, setMessage] = useState('Đang xác thực email...');

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        const response = await fetch(`http://localhost:4000/api/verify-email/${token}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const data = await response.json();

        if (response.ok && data.access_token) {
          // Lưu token vào localStorage
          localStorage.setItem('accessToken', data.access_token);
          localStorage.setItem('user', JSON.stringify(data.user));
          
          setStatus('success');
          setMessage('Xác thực email thành công! Đang chuyển hướng...');
          
          // Redirect về trang chủ sau 2 giây
          setTimeout(() => {
            navigate('/home');
          }, 2000);
        } else {
          throw new Error(data.msg || 'Xác thực thất bại');
        }
      } catch (error) {
        setStatus('error');
        setMessage(
          error.message || 
          'Link xác thực không hợp lệ hoặc đã hết hạn. Vui lòng thử lại.'
        );
      }
    };

    if (token) {
      verifyEmail();
    }
  }, [token, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500">
      <div className="bg-white p-8 rounded-lg shadow-2xl max-w-md w-full text-center">
        {status === 'verifying' && (
          <>
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500 mx-auto mb-4"></div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Đang xác thực</h2>
            <p className="text-gray-600">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="text-green-500 text-6xl mb-4">✓</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Thành công!</h2>
            <p className="text-gray-600">{message}</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="text-red-500 text-6xl mb-4">✗</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Xác thực thất bại</h2>
            <p className="text-gray-600 mb-4">{message}</p>
            <button
              onClick={() => navigate('/signin')}
              className="bg-purple-500 text-white px-6 py-2 rounded-lg hover:bg-purple-600 transition"
            >
              Quay lại đăng nhập
            </button>
          </>
        )}
      </div>
    </div>
  );
}
