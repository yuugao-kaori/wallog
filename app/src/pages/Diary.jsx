import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PostFeed from './PostFeed'; // PostFeedをインポート

axios.defaults.baseURL = 'http://192.168.1.148:25000';
axios.defaults.headers.common['Content-Type'] = 'application/json;charset=utf-8';
axios.defaults.withCredentials = true; // Cookieを送受信できるように設定

function Diary() {
  const [postText, setPostText] = useState('');
  const [status, setStatus] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [sessionError, setSessionError] = useState(null);

  useEffect(() => {
    // コンポーネントがマウントされたときにセッション確認APIを呼び出す
    const checkSession = async () => {
      try {
        const response = await axios.get('/api/user/login_check');
        if (response.status === 200) {
          setIsLoggedIn(true);
        }
      } catch (err) {
        // エラーハンドリング
        setSessionError('セッションの確認に失敗しました。');
      }
    };

    checkSession();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('/api/post/post_create', {
        post_text: postText,
      });
      setStatus('投稿が成功しました！');
      setPostText(''); // 投稿後にフォームをクリア
    } catch (error) {
      setStatus('投稿に失敗しました。');
    }
  };

  return (
    <div className="p-4 dark:bg-gray-900 dark:text-gray-100 h-screen overflow-y-auto flex">
      {/* 投稿フォーム */}
      <nav className="w-1/5 fixed right-0 p-4 min-h-full ">
        <h2 className="text-xl font-bold mb-2">新規投稿</h2>
        {isLoggedIn ? (
          <form onSubmit={handleSubmit} className="mt-2">
            <textarea
              className="w-full p-2 border rounded dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700"
              value={postText}
              onChange={(e) => setPostText(e.target.value)}
              placeholder="ここに投稿内容を入力してください"
              rows="4"
            />
            <button
              type="submit"
              className={`mt-2 p-2 text-white rounded ${
                postText.trim() === '' 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-500 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-800'
              }`}
              disabled={postText.trim() === ''}
            >
              投稿
            </button>
          </form>
        ) : (
          <p className="text-gray-500 mt-4">投稿を作成するにはログインしてください。</p>
        )}
        {status && <p className="mt-4 text-red-500">{status}</p>}
      </nav>

      {/* 投稿一覧 */}
      <div className="flex-1 mr-1/5">
        <h2 className="text-xl font-bold">日記-Diary-</h2>
        <p className="text-lg">全ての記事が一覧になっています。</p>
        {sessionError && <p className="text-red-500">{sessionError}</p>}
        <div className="mt-4">
          <PostFeed isLoggedIn={isLoggedIn} /> {/* 投稿表示 */}
        </div>
      </div>
    </div>
  );
}

export default Diary;
