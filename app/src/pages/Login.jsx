import { useState } from 'react';
import React from 'react';

import axios from 'axios';
import { useNavigate } from 'react-router-dom';
axios.defaults.baseURL = `${process.env.REACT_APP_SITE_DOMAIN}`;
axios.defaults.headers.common['Content-Type'] = 'application/json;charset=utf-8';
axios.defaults.withCredentials = true; // Cookieを送受信できるように設定

// myuser mypassword
function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true); // Remember Meをデフォルト有効
  const navigate = useNavigate(); // ナビゲーションフックを使用して他のページに移動

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${process.env.REACT_APP_SITE_DOMAIN}/api/user/login`, {
        username,
        password,
        rememberMe,
      });

      if (response.data.success) {
        alert('ログイン成功');
        const cookies = response.headers['set-cookie'];
                if (cookies) {
                    cookies.forEach((cookie) => {
                        document.cookie = cookie;
                    }
                );
                } else {
                    console.log(response);
                    alert('Cookieへの保存失敗');
                  }
        navigate('/'); // ログイン成功後にリダイレクト
      } else {
        alert('ログイン失敗');
      }
    } catch (error) {
      console.error('ログイン中にエラーが発生しました', error);
      alert(error);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-800 bg-opacity-50">
      <div className="bg-white p-6 rounded shadow-lg w-1/3 dark:bg-gray-800">
        <h2 className="text-lg font-bold mb-4">ログイン</h2>
        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label className="block text-gray-700 dark:text-white">ユーザ名</label>
            <input
              type="text"
              className="w-full p-2 border border-gray-300 rounded dark:text-gray-700"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 dark:text-white">パスワード</label>
            <input
              type="password"
              className="w-full p-2 border border-gray-300 rounded dark:text-gray-700"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="mb-4">
            <label>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              /> Remember Me
            </label>
          </div>
          <div className="flex justify-end">
            <button type="submit" className="bg-blue-500 text-white p-2 rounded">
              ログイン
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;
