// app/diary/page.jsx
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import PostFeed from '../../components/PostFeed';
import PostForm from '../../components/PostForm';

// Next.jsではprocess.envの代わりにenvを直接使用
const API_BASE_URL = process.env.NEXT_PUBLIC_SITE_DOMAIN;

// axios defaults設定
axios.defaults.baseURL = API_BASE_URL;
axios.defaults.headers.common['Content-Type'] = 'application/json;charset=utf-8';
axios.defaults.withCredentials = true;

export default function DiaryPage() {
  const [postText, setPostText] = useState('');
  const [status, setStatus] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  interface Post {
    post_id: string;
    post_text?: string;
    title?: string;
    created_at: string;
    post_file?: number[];
    [key: string]: any;
  }
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [startId, setStartId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadingRef = useRef(false);
  const bottomBoundaryRef = useRef(null);
  const lastRequestTimeRef = useRef(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/user/login_check`);
        if (response.status === 200) {
          setIsLoggedIn(true);
        }
      } catch (err) {
        setSessionError(`セッションの確認に失敗しました。`);
      }
    };

    checkSession();
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
      const params: { limit: number; start_id?: number } = { limit: 20 };
      if (startId !== null) {
        params.start_id = startId;
      }

      const response = await axios.get(`${API_BASE_URL}/api/post/post_list`, { params });
      const newPosts = Array.isArray(response.data) ? response.data : [];

      if (newPosts.length > 0) {
        setPosts((prevPosts) => [...prevPosts, ...newPosts]);
        const lastPostId = newPosts[newPosts.length - 1].post_id;
        setStartId(lastPostId - 1000000);
        setHasMore(newPosts.length >= params.limit);
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
  }, [hasMore, startId]);

  useEffect(() => {
    loadMorePosts();

    const options = {
      root: null,
      rootMargin: '500px',
      threshold: 0.1
    };

    interface IntersectionObserverEntry {
      isIntersecting: boolean;
    }

    const handleObserver = (entries: IntersectionObserverEntry[]) => {
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
  useEffect(() => {
    const eventSource = new EventSource(`${API_BASE_URL}/api/post/post_sse`);
    eventSource.onmessage = (event) => {
      const newPosts = JSON.parse(event.data);
      setPosts((prevPosts) => [...newPosts, ...prevPosts]);
    };

    eventSource.onerror = (error) => {
      console.error('SSE接続エラー:', error);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, []);

interface UploadedFile {
    id: string;
    url: string;
    isImage: boolean;
}

interface FileCreateResponse {
    file_id: number;
}

const handleFiles = async (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;
    
    const fileArray = Array.from(selectedFiles);
    for (const file of fileArray) {
        try {
            const formData = new FormData();
            formData.append('file', file);
            const uploadResponse = await axios.post<FileCreateResponse>(`${API_BASE_URL}/api/drive/file_create`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            const fileId = uploadResponse.data.file_id.toString();
            const fileDataResponse = await axios.get(`${API_BASE_URL}/api/drive/file/${fileId}`, {
                headers: { 'Content-Type': 'application/octet-stream' },
                responseType: 'blob',
            });
            const isImage = file.type.startsWith('image/');
            const url = URL.createObjectURL(new Blob([fileDataResponse.data]));
            setFiles((prev: UploadedFile[]) => [...prev, { id: fileId, url, isImage }]);
        } catch (error) {
            setStatus('ファイルのアップロードに失敗しました。');
        }
    }
};

interface PostPayload {
    post_text: string;
    post_file?: number[];
}

interface PostResponse {
    post_id: number;
    post_text: string;
    post_createat: string;
    post_file?: number[];
}

const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    try {
        const payload: PostPayload = {
            post_text: postText,
            post_file: files.length > 0 ? files.map((file) => parseInt(file.id)) : undefined,
        };
        
        const response = await axios.post<PostResponse>(`${API_BASE_URL}/api/post/post_create`, payload);
        setStatus('投稿が成功しました！');
        setPostText('');
        setFiles([]);
        
        if (response.data.post_text && response.data.post_createat !== 'Date unavailable') {
            const newPost: Post = {
                post_id: response.data.post_id.toString(),
                post_text: response.data.post_text,
                created_at: response.data.post_createat,
                post_file: response.data.post_file
            };
            setPosts((prevPosts) => [newPost, ...prevPosts]);
        }
        
        setIsModalOpen(false);
    } catch (error) {
        setStatus('投稿に失敗しました。');
    }
}, [postText, files]);

interface FileDeleteResponse {
    success: boolean;
}

const handleDelete = async (fileId: string): Promise<void> => {
    try {
        await axios.post<FileDeleteResponse>(`${API_BASE_URL}/api/drive/file_delete`, { file_id: parseInt(fileId) });
        setFiles((prev: UploadedFile[]) => prev.filter((file) => file.id !== fileId));
    } catch (error) {
        setStatus('ファイルの削除に失敗しました。');
    }
};

interface DragEvent {
    preventDefault: () => void;
}

const handleDragOver = (e: DragEvent): void => {
    e.preventDefault();
    dropRef.current?.classList.add('drag-over');
};

  const handleDragLeave = () => {
    dropRef.current?.classList.remove('drag-over');
  };

interface DropEvent extends DragEvent {
    dataTransfer: DataTransfer;
}

const handleDrop = (e: DropEvent): void => {
    e.preventDefault();
    dropRef.current?.classList.remove('drag-over');
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
        onChange={(e) => setPostText(e.target.value)}
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
    <div className="px-4 dark:bg-gray-900 dark:text-gray-100 min-h-screen overflow-y-auto flex relative">
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
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
            </div>
          )}
          <div 
            id="page-bottom-boundary" 
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