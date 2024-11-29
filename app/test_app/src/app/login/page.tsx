'use client';

import { useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const response = await axios.post('/api/user/login', {
        username,
        password,
        rememberMe,
      }, {
        baseURL: process.env.NEXT_PUBLIC_SITE_DOMAIN,
        headers: {
          'Content-Type': 'application/json;charset=utf-8'
        },
        withCredentials: true
      });

      if (response.data.success) {
        alert('ログイン成功');
        const cookies = response.headers['set-cookie'];
        if (cookies) {
          cookies.forEach((cookie: string) => {
            document.cookie = cookie;
          });
        } else {
          console.log(response);
          alert('Cookieへの保存失敗');
        }
        router.push('/'); // ログイン成功後にリダイレクト
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
        <h2 className="text-lg font-bold mb-4 dark:text-white">ログイン</h2>
        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label htmlFor="username" className="block mb-2 text-sm dark:text-white">
              ユーザー名
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:border-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600"
              required
            />
          </div>
          <div className="mb-4">
            <label htmlFor="password" className="block mb-2 text-sm dark:text-white">
              パスワード
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:border-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600"
              required
            />
          </div>
          <div className="mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm dark:text-white">ログイン状態を保持する</span>
            </label>
          </div>
          <button
            type="submit"
            className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 focus:outline-none"
          >
            ログイン
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
