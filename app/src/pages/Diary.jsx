import React, { useState } from 'react';
import axios from 'axios';
import PostFeed from './PostFeed'; // PostFeedをインポート

axios.defaults.baseURL = 'http://192.168.1.148:25000';
axios.defaults.headers.common['Content-Type'] = 'application/json;charset=utf-8';
axios.defaults.withCredentials = true; // Cookieを送受信できるように設定

function Diary() {
  const [postText, setPostText] = useState('');
  const [status, setStatus] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://192.168.1.148:25000/api/post/post_create', {
        post_text: postText,
      });
      setStatus('投稿が成功しました！');
      setPostText(''); // 投稿後にフォームをクリア
    } catch (error) {
      setStatus('投稿に失敗しました。');
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-3xl font-bold mb-4">Diary</h1>
      <p className="text-lg">ここに日記の投稿を表示します。</p>

      {/* 投稿作成フォーム */}
      <form onSubmit={handleSubmit} className="mt-4">
        <textarea
          className="w-full p-2 border rounded"
          value={postText}
          onChange={(e) => setPostText(e.target.value)}
          placeholder="ここに投稿内容を入力してください"
          rows="4"
        />
        <button
          type="submit"
          className="mt-2 p-2 bg-blue-500 text-white rounded hover:bg-blue-700"
        >
          投稿
        </button>
      </form>

      {/* ステータスメッセージ */}
      {status && <p className="mt-4 text-red-500">{status}</p>}

      {/* 投稿一覧を表示するコンポーネント */}
      <div className="mt-8">
        <PostFeed /> {/* 投稿表示 */}
      </div>
    </div>
  );
}

export default Diary;
