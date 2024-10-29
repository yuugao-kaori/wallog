import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import PostFeed from './PostFeed';
import useWebSocket from './useWebSocket';

axios.defaults.baseURL = 'http://192.168.1.148:25000';
axios.defaults.headers.common['Content-Type'] = 'application/json;charset=utf-8';
axios.defaults.withCredentials = true;

function Diary() {
  const [postText, setPostText] = useState('');
  const [status, setStatus] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [sessionError, setSessionError] = useState(null);
  const [files, setFiles] = useState([]);
  const fileInputRef = useRef(null);
  const dropRef = useRef(null);
  const { posts, setPosts, loading, hasMore, loadMorePosts } = useWebSocket('ws://192.168.1.148:25000/api/post/post_ws');

  // モーダルの状態
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await axios.get('/api/user/login_check');
        if (response.status === 200) {
          setIsLoggedIn(true);
        }
      } catch (err) {
        setSessionError('セッションの確認に失敗しました。');
      }
    };

    checkSession();
  }, []);

  const handleFiles = async (selectedFiles) => {
    const fileArray = Array.from(selectedFiles);
    for (const file of fileArray) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        const uploadResponse = await axios.post('/api/drive/file_create', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        const fileId = uploadResponse.data.file_id;
        const fileDataResponse = await axios.get(`/api/drive/file/${fileId}`, {
          'Content-Type': 'application/octet-stream',
          responseType: 'blob',  // レスポンスタイプをblobに指定
        });
        const isImage = file.type.startsWith('image/');
        const url = URL.createObjectURL(new Blob([fileDataResponse.data]));
        setFiles((prev) => [...prev, { id: fileId, url, isImage }]);
      } catch (error) {
        setStatus('ファイルのアップロードに失敗しました。');
      }
    }
  };

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    try {
      const payload = {
        post_text: postText,
      };
      if (files.length > 0) {
        payload.post_file = files.map((file) => file.id);
      }
      const response = await axios.post('/api/post/post_create', payload);
      setStatus('投稿が成功しました！');
      setPostText('');
      setFiles([]);
      // Add the new post to the beginning of the posts array
      setPosts(prevPosts => [response.data, ...prevPosts]);
      // モーダルを閉じる（モバイルのみ）
      setIsModalOpen(false);
    } catch (error) {
      setStatus('投稿に失敗しました。');
    }
  }, [postText, files, setPosts]);

  const handleDelete = async (fileId) => {
    try {
      await axios.post('/api/drive/file_delete', { file_id: fileId });
      setFiles((prev) => prev.filter((file) => file.id !== fileId));
    } catch (error) {
      setStatus('ファイルの削除に失敗しました。');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    dropRef.current.classList.add('drag-over');
  };

  const handleDragLeave = () => {
    dropRef.current.classList.remove('drag-over');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    dropRef.current.classList.remove('drag-over');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
      e.dataTransfer.clearData();
    }
  };

  // 新規投稿フォームのコンポーネント化
  const NewPostForm = () => (
    <form onSubmit={handleSubmit} className="mt-2">
      <textarea
        className="w-full p-2 border rounded dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700"
        value={postText}
        onChange={(e) => setPostText(e.target.value)}
        placeholder="ここに投稿内容を入力してください"
        rows="4"
      />
      <div
        ref={dropRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className="mt-2 p-4 border-dashed border-2 border-gray-400 rounded text-center cursor-pointer"
        onClick={() => fileInputRef.current.click()}
      >
        ファイルをドラッグ＆ドロップするか、クリックして選択
        <input
          type="file"
          multiple
          ref={fileInputRef}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
      {files.length > 0 && (
        <div className="mt-4 grid grid-cols-3 gap-2">
          {files.map((file) => (
            <div key={file.id} className="relative w-24 h-24 bg-gray-200">
              {file.isImage ? (
                <img src={file.url} alt="preview" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gray-400 flex items-center justify-center">
                  <span>ファイル</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => handleDelete(file.id)}
                className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      <button
        type="submit"
        className={`mt-2 p-2 text-white rounded ${
          postText.trim() === '' && files.length === 0
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-blue-500 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-800'
        }`}
        disabled={postText.trim() === '' && files.length === 0}
      >
        投稿
      </button>
    </form>
  );

  return (
    <div className="px-4 dark:bg-gray-900 dark:text-gray-100 h-screen overflow-y-auto flex relative">
      
      {/* デスクトップ用投稿フォーム */}
      <nav className="hidden md:block w-1/5 fixed right-0 px-4 pt-12 min-h-full z-10 bg-white dark:bg-gray-900">
        <h2 className="text-xl font-bold mb-2">新規投稿</h2>
        {isLoggedIn ? (
          <>
            <NewPostForm />
            {status && <p className="mt-4 text-red-500">{status}</p>}
          </>
        ) : (
          <p className="text-gray-500 mt-4">投稿を作成するにはログインしてください。</p>
        )}
      </nav>

      {/* 投稿一覧 */}
      <div className="flex-1 mr-0 md:mr-1/5 z-0">
        {sessionError && <p className="text-red-500">{sessionError}</p>}
        <div className="mt-4">
          <PostFeed
            posts={posts}
            setPosts={setPosts}
            isLoggedIn={isLoggedIn}
            loading={loading}
            hasMore={hasMore}
            loadMorePosts={loadMorePosts}
          />
        </div>
      </div>

      {/* モバイル用フローティングボタン */}
      {isLoggedIn && (
        <button
          className="md:hidden fixed bottom-4 left-4 bg-blue-500 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg z-20"
          onClick={() => setIsModalOpen(true)}
        >
          +
        </button>
      )}

      {/* モバイル用モーダル */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-30">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-11/12 max-w-md p-6 relative">
            <button
              className="absolute top-2 right-2 text-gray-600 dark:text-gray-300"
              onClick={() => setIsModalOpen(false)}
            >
              ×
            </button>
            <h2 className="text-xl font-bold mb-4">新規投稿</h2>
            {isLoggedIn ? (
              <>
                <NewPostForm />
                {status && <p className="mt-4 text-red-500">{status}</p>}
              </>
            ) : (
              <p className="text-gray-500">投稿を作成するにはログインしてください。</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default React.memo(Diary);
