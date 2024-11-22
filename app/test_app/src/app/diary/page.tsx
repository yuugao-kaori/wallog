'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import PostFeed from '@/components/PostFeed';
import PostForm from '@/components/PostForm';

// 型定義
interface Post {
  post_id: string;
  post_text: string;
  post_file?: string | string[];
  post_createat: string;
  title?: string;
  created_at: string;
}

interface FileItem {
  id: number;
  url: string;
  isImage: boolean;
}

const api = axios.create({
  baseURL: 'https://wallog.seitendan.com',
  headers: { 
    'Content-Type': 'application/json;charset=utf-8',
    // CORSリクエストのためのヘッダーを追加
    'Access-Control-Allow-Credentials': 'true'
  },
  withCredentials: true
});

function Diary() {
  const [postText, setPostText] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [start_id, setstart_id] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadingRef = useRef<boolean>(false);
  const bottomBoundaryRef = useRef<HTMLDivElement>(null);
  const lastRequestTimeRef = useRef<number>(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await api.get('/api/user/login_check');
        if (response.status === 200) {
          setIsLoggedIn(true);
        }
      } catch (err) {
        setSessionError('セッションの確認に失敗しました。');
        setIsLoggedIn(false);
      }
    };

    checkSession();
  }, []);

  // SSE接続の修正
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const eventSource = new EventSource(
      `${process.env.NEXT_PUBLIC_SITE_DOMAIN}/api/post/post_sse`,
      { 
        withCredentials: true
      }
    );
    
    eventSource.onmessage = (event) => {
      const newPosts = JSON.parse(event.data);
      setPosts((prevPosts: Post[]) => [...newPosts, ...prevPosts]);
    };

    eventSource.onerror = (error) => {
      console.error('SSE接続エラー:', error);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const loadMorePosts = useCallback(async (retryCount = 0) => {
    const now = Date.now();
    const TIME_BETWEEN_REQUESTS = 500;

    if (loadingRef.current || !hasMore) return;
    
    if (now - lastRequestTimeRef.current < TIME_BETWEEN_REQUESTS) {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      retryTimeoutRef.current = setTimeout(() => {
        loadMorePosts(retryCount);
      }, TIME_BETWEEN_REQUESTS);
      return;
    }

    loadingRef.current = true;
    setLoading(true);
    lastRequestTimeRef.current = now;

    try {
      const response = await api.get('/api/post/post_list', {
        params: {
          limit: 20,
          ...(start_id !== null && { start_id })
        }
      });
      
      const newPosts = Array.isArray(response.data) ? response.data : [];

      if (newPosts.length > 0) {
        setPosts((prevPosts: Post[]) => [...prevPosts, ...newPosts]);
        setstart_id(newPosts[newPosts.length - 1].post_id - 1000000);
        setHasMore(newPosts.length >= 20);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Failed to load posts', error);
      setStatus('投稿の読み込みに失敗しました。');
      if (retryCount < 3) {
        retryTimeoutRef.current = setTimeout(() => {
          loadMorePosts(retryCount + 1);
        }, 1000 * (retryCount + 1));
      }
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [hasMore, start_id]);

  useEffect(() => {
    loadMorePosts();

    const options: IntersectionObserverInit = {
      root: null,
      rootMargin: '500px',
      threshold: 0.1
    };

    const handleObserver: IntersectionObserverCallback = (entries) => {
      const target = entries[0];
      if (target.isIntersecting && !loadingRef.current && hasMore) {
        loadMorePosts();
      }
    };

    observerRef.current = new IntersectionObserver(handleObserver, options);

    if (bottomBoundaryRef.current) {
      observerRef.current.observe(bottomBoundaryRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [loadMorePosts, hasMore]);

  const handleFiles = async (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;
    const fileArray = Array.from(selectedFiles);
    for (const file of fileArray) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        
        const uploadResponse = await api.post('/api/drive/file_create', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        
        const fileId = uploadResponse.data.file_id;
        const fileDataResponse = await api.get(`/api/drive/file/${fileId}`, {
          responseType: 'blob'
        });
        
        const isImage = file.type.startsWith('image/');
        const url = URL.createObjectURL(new Blob([fileDataResponse.data]));
        setFiles(prev => [...prev, { id: fileId, url, isImage }]);
      } catch (error) {
        setStatus('ファイルのアップロードに失敗しました。');
      }
    }
  };

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        const payload = {
          post_text: postText,
          ...(files.length > 0 && { post_file: files.map(file => file.id) })
        };

        const response = await api.post('/api/post/post_create', payload);
        setStatus('投稿が成功しました！');
        setPostText('');
        setFiles([]);
        
        if (response.data.post_text && response.data.post_createat !== 'Date unavailable') {
          setPosts(prevPosts => [response.data, ...prevPosts]);
        }
        
        setIsModalOpen(false);
      } catch (error) {
        setStatus('投稿に失敗しました。');
      }
    },
    [postText, files]
  );

  const handleDelete = async (fileId: number) => {
    try {
      await api.post('/api/drive/file_delete', { file_id: fileId });
      setFiles((prev) => prev.filter((file) => file.id !== fileId));
    } catch (error) {
      setStatus('ファイルの削除に失敗しました。');
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (dropRef.current) {
      dropRef.current.classList.add('drag-over');
    }
  };

  const handleDragLeave = () => {
    if (dropRef.current) {
      dropRef.current.classList.remove('drag-over');
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (dropRef.current) {
      dropRef.current.classList.remove('drag-over');
    }
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
      e.dataTransfer.clearData();
    }
  };

  const NewPostForm = () => (
    <form onSubmit={handleSubmit} className="mt-2">
      <textarea
        className="w-full p-2 border rounded dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700"
        value={postText}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setPostText(e.target.value)}
        placeholder="ここに投稿内容を入力してください"
        rows={4}
      />
      <div
        ref={dropRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className="mt-2 p-4 border-dashed border-2 border-gray-400 rounded text-center cursor-pointer"
        onClick={() => fileInputRef.current?.click()}
      >
        ファイルをドラッグ＆ドロップするか、クリックして選択
        <input
          type="file"
          multiple
          ref={fileInputRef}
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
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
            <PostForm
              postText={postText}
              setPostText={setPostText}
              handleSubmit={handleSubmit}
              files={files}
              handleFiles={handleFiles}
              handleDelete={handleDelete}
            />
            {status && <p className="mt-4 text-red-500">{status}</p>}
          </>
        ) : (
          <p className="text-gray-500 mt-4">投稿を作成するにはログインしてください。</p>
        )}
      </nav>

      {/* 投稿一覧 */}
      <div className="flex-1 mr-0 md:mr-1/5 z-0">
        <div className="mt-4">
          <PostFeed
            posts={posts}
            setPosts={setPosts}
            isLoggedIn={isLoggedIn}
            loading={loading}
            hasMore={hasMore}
            loadMorePosts={loadMorePosts}
          />
          {loading && (
            <div className="w-full py-4 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent" />
            </div>
          )}
          <div 
            ref={bottomBoundaryRef}
            className="h-10 w-full"
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
