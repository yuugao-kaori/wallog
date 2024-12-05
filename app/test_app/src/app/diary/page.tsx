'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import PostFeed from '@/components/PostFeed';
import PostForm from '@/components/PostForm';
import { FaTimes } from 'react-icons/fa';
import PostFormPopup from '@/components/PostFormPopup';
import NotificationComponent from '@/components/Notification';

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
  isExisting?: boolean; // 追加
}

// DriveFile インターフェースを修正
interface DriveFile {
  file_id: number;  // string から number に変更
  file_createat: string;
  content_type?: string;  // 追加
}

// 型定義に NotificationItem を追加
interface NotificationItem {
  id: string;
  message: string;
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

const NON_IMAGE_TYPES = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'zip', 'rar'];

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
  const [showFileSelector, setShowFileSelector] = useState(false);
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
  const [fixedHashtags, setFixedHashtags] = useState<string>('');  // 追加
  const [autoAppendTags, setAutoAppendTags] = useState<boolean>(false);  // 追加
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [repostData, setRepostData] = useState<Post | null>(null);
  const [repostText, setRepostText] = useState<string>('');  // 追加

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
        setSessionError('セッションの確認に失敗しました');
        setIsLoggedIn(false);
      }
    };

    checkSession();
  }, []);

  // SSE接続の修正
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let reconnectAttempt = 0;
    const maxReconnectAttempts = 5;
    const baseDelay = 1000; // 1秒

    const createEventSource = () => {
      const eventSource = new EventSource(
        `${process.env.NEXT_PUBLIC_SITE_DOMAIN}/api/post/post_sse`,
        { withCredentials: true }
      );
      
      eventSource.onmessage = (event) => {
        const newPosts = JSON.parse(event.data);
        setPosts((prevPosts: Post[]) => [...newPosts, ...prevPosts]);
        reconnectAttempt = 0; // 成功したらリセット
      };

      eventSource.onerror = (error) => {
        console.error('SSE接続エラー:', error);
        eventSource.close();
        
        if (reconnectAttempt < maxReconnectAttempts) {
          const delay = Math.min(baseDelay * Math.pow(2, reconnectAttempt), 30000); // 最大30秒
          console.log(`${delay}ms後に再接続を試みます(試行${reconnectAttempt + 1}/${maxReconnectAttempts})`);
          
          setTimeout(() => {
            reconnectAttempt++;
            createEventSource();
          }, delay);
        } else {
          console.error('最大再接続試行回数に達しました');
        }
      };

      return eventSource;
    };

    const eventSource = createEventSource();
    
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

        const metadataResponse = await api.get('/api/drive/file_list');
        const fileMetadata = metadataResponse.data.files.find(
          (f: DriveFile) => f.file_id === uploadResponse.data.file_id
        );
        
        const fileId = uploadResponse.data.file_id;
        const fileFormat = fileMetadata?.file_format?.toLowerCase() || '';
        const isImage = !NON_IMAGE_TYPES.includes(fileFormat);
        const url = `${process.env.NEXT_PUBLIC_SITE_DOMAIN}/api/drive/file/${fileId}`;
        
        setFiles(prev => [...prev, { 
          id: fileId, 
          url, 
          isImage,
          contentType: fileFormat,
          isExisting: false  // 追加: 新規アップロードファイルとしてマーク
        }]);
      } catch (error) {
        setStatus('ファイルのアップロードに失敗しました。');
      }
    }
  };

  const addNotification = useCallback((message: string) => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { id, message }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(notification => notification.id !== id));
    }, 3000);
  }, []);

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  const handleSubmit = useCallback(
    async (e: React.FormEvent, finalText?: string) => {
      e.preventDefault();
      try {
        // finalTextをそのまま使用し、追加の処理は行わない
        const payload = {
          post_text: finalText || postText,  // finalTextが渡された場合はそのまま使用
          ...(files.length > 0 && { post_file: files.map(file => file.id) })
        };

        const response = await api.post('/api/post/post_create', payload);
        addNotification('投稿が成功しました！');
        setPostText('');
        setFiles([]);
        
        if (response.data.post_text && response.data.post_createat !== 'Date unavailable') {
          setPosts(prevPosts => [response.data, ...prevPosts]);
        }
        
        setIsModalOpen(false);
      } catch (error) {
        addNotification('投稿に失敗しました。');
      }
    },
    [postText, files, addNotification]  // fixedHashtagsを依存配列から削除
  );

  const handleDelete = async (event: React.MouseEvent | number, postId?: string): Promise<boolean> => {
    if (typeof event === 'number') {
      // ファイル削除のケ���ス
      const fileId = event;
      const fileToDelete = files.find(file => file.id === fileId);
      
      if (!fileToDelete) return false;

      if (fileToDelete.isExisting) {
        setFiles((prev) => prev.filter((file) => file.id !== fileId));
        return true;
      } else {
        try {
          await api.post('/api/drive/file_delete', { file_id: fileId });
          setFiles((prev) => prev.filter((file) => file.id !== fileId));
          return true;
        } catch (error) {
          setStatus('ファイルの削除に失敗しました。');
          return false;
        }
      }
    } else {
      // 投稿削除のケース
      if (!postId) return false;
      
      try {
        const response = await fetch('/api/post/post_delete', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ post_id: postId }),
        });

        if (!response.ok) {
          throw new Error('削除に失敗しました');
        }

        setPosts(prevPosts => prevPosts.filter(post => post.post_id !== postId));
        addNotification('投稿を削除しました');
        return true;
      } catch (error) {
        console.error('Error deleting post:', error);
        addNotification('投稿の削除に失敗しました');
        return false;
      }
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        // Shift+Enterで送信
        e.preventDefault();
        handleSubmit(e as any);
      }
      // 通常のEnterは改行を許可
    }
  };

  const loadDriveFiles = async () => {
    try {
      const response = await api.get('/api/drive/file_list');
      setDriveFiles(response.data.files || []);
    } catch (error) {
      console.error('Failed to load drive files:', error);
    }
  };

  const handleSelectExistingFiles = () => {
    setShowFileSelector(true);
    loadDriveFiles();
  };

  const handleSelectFile = async (fileId: number) => {
    try {
      const metadataResponse = await api.get(`/api/drive/file_list`);
      const fileMetadata = metadataResponse.data.files.find(
        (file: DriveFile) => file.file_id === fileId
      );
      
      const fileFormat = fileMetadata?.file_format?.toLowerCase() || '';
      const isImage = !NON_IMAGE_TYPES.includes(fileFormat);
      const url = `${process.env.NEXT_PUBLIC_SITE_DOMAIN}/api/drive/file/${fileId}`;
      
      if (!files.some(file => file.id === fileId)) {
        setFiles(prev => [...prev, { 
          id: fileId, 
          url, 
          isImage,
          contentType: fileFormat,
          isExisting: true  // 追加: 既存ファイルとしてマーク
        }]);
      }

      setShowFileSelector(false);
    } catch (error) {
      console.error('Failed to select file:', error);
      setStatus('ファイルの選択に失敗しました。');
    }
  };

  const handleRepost = async (post: Post) => {
    setRepostData(post);
    setRepostText(post.post_text);
    setIsModalOpen(true);
  };

  return (
    <div className="fixed inset-0 flex bg-white dark:bg-gray-900 duration-300">
      {/* メインコンテンツ */}
      <main className="flex-1 relative md:ml-48 bg-white dark:bg-gray-900 duration-300">  {/* md:ml-64 から md:ml-48 に変更 */}
      <div className="absolute inset-0 md:pr-[300px]">
        <div className="h-full overflow-auto px-4 bg-white dark:bg-gray-900 duration-300 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
        <PostFeed
          posts={posts}
          setPosts={setPosts} /* md:ml-64 を追加 */
          isLoggedIn={isLoggedIn}
          loading={loading}
          hasMore={hasMore}
          loadMorePosts={loadMorePosts}
          onRepost={handleRepost}  // 追加
        />
        {loading && (
          <div className="w-full py-4 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent" />
          </div>
        )}
        <div ref={bottomBoundaryRef} className="h-10 w-full" />
        </div>
      </div>
      </main>

      {/* デスクトップ用投稿フォーム */}
      <aside className="hidden md:block fixed right-0 top-0 w-[300px] h-full bg-white dark:bg-gray-900 border-l dark:border-gray-800">
      <div className="h-full overflow-y-auto p-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
        {isLoggedIn ? (
        <>
          <PostForm
          postText={postText}
          setPostText={setPostText}
          handleSubmit={handleSubmit}
          files={files}
          handleFiles={handleFiles}
          handleDelete={handleDelete}
          onSelectExistingFiles={handleSelectExistingFiles}
          fixedHashtags={fixedHashtags}
          setFixedHashtags={setFixedHashtags}
          autoAppendTags={autoAppendTags}  // 追加
          setAutoAppendTags={setAutoAppendTags}  // 追加
          />
          {status && <p className="mt-4 text-red-500">{status}</p>}
        </>
        ) : (
        <p className="text-gray-500 mt-4">投稿するにはログインが必要です。</p>
        )}
      </div>
      </aside>

      {/* モバイル用フローティングボタン */}
      {isLoggedIn && (
      <button
        className="md:hidden fixed bottom-4 right-4 bg-blue-500 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg z-30"
        onClick={() => setIsModalOpen(true)}
      >
        +
      </button>
      )}

      {/* モバイル用モーダルをPostFormPopupに置き換え */}
      <PostFormPopup
      isOpen={isModalOpen}
      onClose={() => {
        setIsModalOpen(false);
        setRepostData(null);
        setRepostText('');  // 追加: クリーンアップ
      }}
      postText={repostData ? repostText : postText}  // 変更: repostText を使用
      setPostText={repostData ? setRepostText : setPostText}  // 変更: repostData に応じて setter を切り替え
      handleSubmit={async (e, finalText) => {
        if (repostData) {
          try {
            // React.MouseEventとして新しいイベントを作成
            const mouseEvent = { type: 'click' } as React.MouseEvent<Element, MouseEvent>;
            const deleteSuccess = await handleDelete(mouseEvent, repostData.post_id);
            
            if (deleteSuccess) {
              // 削除成功後に再投稿
              await handleSubmit(e, finalText);
            }
          } catch (error) {
            console.error('再投稿処理でエラーが発生しました:', error);
            addNotification('再投稿に失敗しました');
          }
        } else {
          await handleSubmit(e, finalText);
        }
      }}
      files={files}
      handleFiles={handleFiles}
      handleDelete={handleDelete}
      isLoggedIn={isLoggedIn}
      status={status}
      onSelectExistingFiles={handleSelectExistingFiles}
      fixedHashtags={fixedHashtags}
      setFixedHashtags={setFixedHashtags}
      autoAppendTags={autoAppendTags}  // 追加
      setAutoAppendTags={setAutoAppendTags}  // 追加
      repostMode={!!repostData}  // 追加
      />

      {/* ファイル選択モーダル */}
      {showFileSelector && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg w-11/12 max-w-2xl p-6 relative max-h-[80vh] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
        <button
          className="absolute top-4 right-4 text-gray-600 dark:text白"
          onClick={() => setShowFileSelector(false)}
        >
          <FaTimes />
        </button>
        <h2 className="text-xl font-bold mb-4 dark:text-white">ファイルを選択</h2>
        {driveFiles.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {driveFiles.map((file: DriveFile) => (
            <div
            key={file.file_id}
            className="border rounded p-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
            onClick={() => handleSelectFile(file.file_id)}
            >
            <div 
              className="w-full aspect-video mb-2 bg-gray-100 dark:bg-gray-700 relative overflow-hidden"
            >
              <img
              src={`${process.env.NEXT_PUBLIC_SITE_DOMAIN}/api/drive/file/${file.file_id}`}
              alt={`File ${file.file_id}`}
              className="w-full h-full object-contain"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                target.parentElement!.classList.add('flex', 'items-center', 'justify-center');
                target.parentElement!.innerHTML = '<span class="text-gray-500 text-xl">No Preview</span>';
              }}
              />
            </div>
            <div className="text-sm truncate dark:text-white">
              ファイルID: {file.file_id}
            </div>
            <div className="text-xs text-gray-500 dark:text白">
              {new Date(file.file_createat).toLocaleDateString()}
            </div>
            </div>
          ))}
          </div>
        ) : (
          <div className="text-center text-gray-500 dark:text白">
          ファイルが見つかりません
          </div>
        )}
        </div>
      </div>
      )}
      <NotificationComponent
      notifications={notifications}
      onClose={removeNotification}
      />
    </div>
  );
}

export default React.memo(Diary);
