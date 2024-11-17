// page.tsx
"use client";

import { useState, FormEvent, ChangeEvent } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function Page() {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [error, setError] = useState<string>(''); // エラーメッセージ用の状態を追加
  const router = useRouter();

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(''); // エラーメッセージをリセット

    try {
      const result = await signIn('credentials', {
        username,
        password,
        redirect: false,
        callbackUrl: '/dashboard', // リダイレクト先を明示的に指定
      });

      console.log('Login result:', result); // デバッグ用

      if (result?.error) {
        setError('ログインに失敗しました。認証情報を確認してください。');
        console.error('ログインエラー:', result.error);
        return;
      }

      if (result?.ok) {
        // ログイン成功時の処理
        router.push('/dashboard');
        router.refresh();
      }
    } catch (error) {
      setError('ログイン処理中にエラーが発生しました');
      console.error('ログイン処理中にエラーが発生しました:', error);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-800 bg-opacity-50">
      <div className="bg-white p-6 rounded shadow-lg w-full max-w-md mx-auto dark:bg-gray-800">
        <h2 className="text-lg font-bold mb-4">ログイン</h2>
        {error && ( // エラーメッセージの表示
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}
        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label className="block text-gray-700 dark:text-white">ユーザ名</label>
            <input
              type="text"
              className="w-full p-2 border border-gray-300 rounded dark:text-gray-700"
              value={username}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 dark:text-white">パスワード</label>
            <input
              type="password"
              className="w-full p-2 border border-gray-300 rounded dark:text-gray-700"
              value={password}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
            />
          </div>
          <div className="mb-4">
            <label>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setRememberMe(e.target.checked)}
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