'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import PostFeed from '@/components/PostFeed';
import PostForm from '@/components/PostForm';
import { FaTimes } from 'react-icons/fa';
import PostFormPopup from '@/components/PostFormPopup';
import NotificationComponent from '@/components/Notification';
import Tagcloud from '@/components/Tagcloud';
import { getTags, type TagData } from '@/lib/api';  // 追加
import { FileItem } from '@/types';  // 追加

// 型定義
interface Post {
  post_id: string;
  post_text: string;
  post_file?: string | string[];
  post_createat: string;
  title?: string;
  created_at: string;
}

// DriveFile インターフェースを修正
interface DriveFile {
  file_id: number;  // string から number に変更
  file_createat: string;
  content_type?: string;  // 追加
}

// ������������定義に NotificationItem を追加
interface NotificationItem {
  id: string;
  message: string;
  action?: { label: string; onClick: () => void }; // 追加
}

const api = axios.create({
  baseURL: 'https://wallog.seitendan.com',
  headers: { 
    'Content-Type': 'application/json;charset=utf-8',
    // CORSリ���エストのためのヘッダーを追加
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
  const [activeTab, setActiveTab] = useState<'post' | 'tags'>('post');
  const [tagData, setTagData] = useState<TagData[]>([]);  // 追加

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

  // タグデータを取得するための useEffect を追加
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const tags = await getTags();
        setTagData(tags);
      } catch (error) {
        console.error('Failed to fetch tags:', error);
      }
    };
    
    fetchTags();
  }, []);

  const loadMorePosts = useCallback(async (retryCount = 0) => {
    const now = Date.now();
    const TIME_BETWEEN_REQUESTS = 2000;

    if (loadingRef.current || !hasMore) return;
    
    // 前回のリクエストからの経過時間をチェック
    if (now - lastRequestTimeRef.current < TIME_BETWEEN_REQUESTS) {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      // 次のリクエストを遅延実行
      retryTimeoutRef.current = setTimeout(() => {
        loadMorePosts(retryCount);
      }, TIME_BETWEEN_REQUESTS - (now - lastRequestTimeRef.current));
      return;
    }

    loadingRef.current = true;
    setLoading(true);
    lastRequestTimeRef.current = now;

    try {
      const response = await api.get('/api/post/post_list', {
        params: {
          limit: 20,
          ...(start_id != null && { start_id })  // nullの場合は最新の投稿を取得
        }
      });
      
      setTimeout(() => {
        const newPosts = Array.isArray(response.data) ? response.data : [];

        if (newPosts.length > 0) {
          setPosts((prevPosts: Post[]) => {
            const existingIds = new Set(prevPosts.map(post => post.post_id));
            const uniqueNewPosts = newPosts.filter(post => !existingIds.has(post.post_id));
            // 新しい投稿を追加し、post_idで降順にソート
            const updatedPosts = [...prevPosts, ...uniqueNewPosts]
                .sort((a, b) => Number(BigInt(b.post_id) - BigInt(a.post_id)));
            return updatedPosts;
          });
          
          // 次のstart_idを設定
          if (newPosts.length >= 20) {
            const lastPost = newPosts[newPosts.length - 1];
            setstart_id(lastPost.post_id);
          }
          setHasMore(newPosts.length >= 20);
        } else {
          setHasMore(false);
        }
        
        loadingRef.current = false;
        setLoading(false);
      }, 1000);

    } catch (error) {
      console.error('Failed to load posts', error);
      setStatus('投稿の読み込みに失敗しました。');
      if (retryCount < 3) {
        retryTimeoutRef.current = setTimeout(() => {
          loadMorePosts(retryCount + 1);
        }, 1000 * (retryCount + 1));
      }
      loadingRef.current = false;
      setLoading(false);
    }
  }, [hasMore, start_id]);

  // SSE接続とinitial loadの設定を修正
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let eventSource: EventSource | null = null;
    let reconnectAttempt = 0;
    const maxReconnectAttempts = 2;
    const baseDelay = 5000;

    const createEventSource = () => {
      // 既存のSSE接続があれば閉じる
      if (eventSource) {
        eventSource.close();
      }

      eventSource = new EventSource(
        `${process.env.NEXT_PUBLIC_SITE_DOMAIN}/api/post/post_sse`,
        { withCredentials: true }
      );
      
      eventSource.onmessage = (event) => {
        const newPosts = JSON.parse(event.data);
        setPosts((prevPosts: Post[]) => {
          // 重複を排除して新しい投稿を追加
          const existingIds = new Set(prevPosts.map(post => post.post_id));
          const uniqueNewPosts = newPosts.filter((post: Post) => !existingIds.has(post.post_id));
          // 新しい投稿を追加し、post_idで降順にソート
          return [...uniqueNewPosts, ...prevPosts]
              .sort((a, b) => Number(BigInt(b.post_id) - BigInt(a.post_id)));
        });
        reconnectAttempt = 0;
      };

      eventSource.onerror = (error) => {
        eventSource?.close();
        
        reconnectAttempt++;

        if (reconnectAttempt >= maxReconnectAttempts) {
          addNotification('接続が切断されました。', {
            label: 'リロード',
            onClick: () => {
              removeNotification('connection-error'); // 既存の接続エラー通知を削除
              addNotification('再接続中...', {
                label: 'キャンセル',
                onClick: () => {}
              });
              createEventSource();
            }
          }, 'connection-error', false); // ID と auto-dismiss を指定
        }
        if (reconnectAttempt < maxReconnectAttempts) {
          const delay = Math.min(baseDelay * Math.pow(2, reconnectAttempt - 1), 30000);
          setTimeout(() => {
            createEventSource();
          }, delay);
        } else {
          console.info('最大再接続試行回数に達しました');
        }
      };
    };

    // 初期ロード時にstart_idをnullに設定してから読み込み
    setstart_id(null);
    loadMorePosts();

    // SSE接続の確立
    createEventSource();
    
    // クリーンアップ関数
    return () => {
      if (eventSource) {
        console.log('Closing SSE connection');
        eventSource.close();
        eventSource = null;
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []); // 依存配列を空に

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
          isExisting: false  // 追加: 新規アップロードファイルとしてマー��
        }]);
      } catch (error) {
        setStatus('ファイルのアップロードに失敗��ました。');
      }
    }
  };

  const addNotification = useCallback((
    message: string,
    action?: { label: string; onClick: () => void },
    id?: string,
    autoDismiss: boolean = true
  ) => {
    const notificationId = id || Date.now().toString();
    setNotifications(prev => [...prev.filter(n => n.id !== notificationId), { id: notificationId, message, action }]);
    
    if (autoDismiss) {
      setTimeout(() => {
        setNotifications(prev => prev.filter(notification => notification.id !== notificationId));
      }, 5000);
    }
  }, []);

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  const handleSubmit = useCallback(
    async (e: React.FormEvent, finalText?: string) => {
      e.preventDefault();
      try {
        const payload = {
          post_text: finalText || postText,
          ...(files.length > 0 && { post_file: files.map(file => file.id) })
        };

        const response = await api.post('/api/post/post_create', payload);
        addNotification('投稿が成功しました！');
        setPostText('');
        setFiles([]); // 既存のファイル配列をクリア
        
        if (response.data.post_text && response.data.post_createat !== 'Date unavailable') {
          setPosts(prevPosts => [response.data, ...prevPosts]);
        }
        
        // モーダルを閉じる
        setIsModalOpen(false);

        // ファイル選択状態をリセット
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } catch (error) {
        addNotification('投稿に失敗しました。');
      }
    },
    [postText, files, addNotification]
  );

// ファイル削除用の関数を修正
const handleDeleteFile = async (fileId: string | number): Promise<boolean> => {
  const numericFileId = typeof fileId === 'string' ? parseInt(fileId, 10) : fileId;
  const fileToDelete = files.find(f => f.id === numericFileId);
  
  if (!fileToDelete) return false;

  try {
    if (fileToDelete.isExisting) {
      // 既存ファイルの場合は添付のみ解除
      setFiles(prevFiles => prevFiles.filter(f => f.id !== numericFileId));
      addNotification('ファイルの添付を取り消しました');
      return true;
    } else {
      // 新規アップロードファイルの場合はMinIOとDBから削除
      await api.post('/api/drive/file_delete', {
        file_id: numericFileId
      });
      setFiles(prevFiles => prevFiles.filter(f => f.id !== numericFileId));
      addNotification('ファイルを削除しました');
      return true;
    }
  } catch (error) {
    console.error('Failed to delete file:', error);
    addNotification('ファイルの削除に失敗しました');
    return false;
  }
}

// 投稿削除用の関数を修正
const handleDeletePost = async (event: React.MouseEvent, postId: string): Promise<boolean> => {
  try {
    const response = await api.delete('/api/post/post_delete', {
      data: { post_id: postId }
    });

    if (response.status === 200) {
      setPosts(prevPosts => prevPosts.filter(post => post.post_id !== postId));
      addNotification('投稿を削除しました');
      return true;
    }
    throw new Error('削除に失敗しました');
  } catch (error) {
    console.error('Error deleting post:', error);
    addNotification('投稿の削除に失敗しました');
    return false;
  }
}

  const handleCancelAttach = (fileId: string | number) => {
    setFiles(prevFiles => prevFiles.filter(f => f.id !== fileId));
  };

  const handleDeletePermanently = async (fileId: string | number) => {
    try {
      await api.post('/api/drive/file_delete', { file_id: fileId });
      setFiles(prevFiles => prevFiles.filter(f => f.id !== fileId));
      addNotification('ファイルを削除しました');
    } catch (error) {
      console.error('Failed to delete file:', error);
      addNotification('ファイルの削除に失敗しました');
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

  // モーダルの開閉処理を明確に分離
  const openModal = (isRepost: boolean = false) => {
    setIsModalOpen(true);
    if (!isRepost) {
      // 新規投稿の場合は repost 関連の状態をクリア
      setRepostData(null);
      setRepostText('');
      setPostText('');
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    // モーダルを閉じる時に必ず全ての状態をリセット
    setRepostData(null);
    setRepostText('');
    setPostText('');
  };

  // 再投稿ハンドラーを修正
  const handleRepost = async (post: Post) => {
    setRepostData(post);
    setRepostText(post.post_text);
    openModal(true);
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
        </div>
      </div>
      </main>

      {/* デスクトップ用サイドバーを修正 */}
      <aside className="hidden md:block fixed right-0 top-0 w-[300px] h-full bg-white dark:bg-gray-900 border-l dark:border-gray-800">
        {isLoggedIn ? (
          <>
            <div className="flex border-b dark:border-gray-800">
              <button
                className={`flex-1 p-3 text-center ${
                  activeTab === 'post'
                    ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-300'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
                onClick={() => setActiveTab('post')}
              >
                投稿
              </button>
              <button
                className={`flex-1 p-3 text-center ${
                  activeTab === 'tags'
                    ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-300'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
                onClick={() => setActiveTab('tags')}
              >
                タグ
              </button>
            </div>
            <div className="h-full overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
              
              {activeTab === 'post' ? (
                <div className="p-4">
                  <PostForm
                    postText={postText}
                    setPostText={setPostText}
                    handleSubmit={handleSubmit}
                    files={files}
                    handleFiles={handleFiles}
                    handleDelete={handleDeleteFile}
                    onSelectExistingFiles={handleSelectExistingFiles}
                    fixedHashtags={fixedHashtags}
                    setFixedHashtags={setFixedHashtags}
                    autoAppendTags={autoAppendTags}
                    setAutoAppendTags={setAutoAppendTags}
                    handleCancelAttach={handleCancelAttach}        // 追加
                    handleDeletePermanently={handleDeletePermanently}   // 追加
                  />
                </div>
              ) : (
                <Tagcloud tags={tagData} />  
              )}
            </div>
          </>
        ) : (
          <div className="h-full overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
            <Tagcloud tags={tagData} />  {/* タグデータを渡す */}
          </div>
        )}
      </aside>

      {/* モバイル用フローティングボタン */}
      {isLoggedIn && (
      <button
        className="md:hidden fixed bottom-4 right-4 bg-blue-500 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg z-30"
        onClick={() => openModal()}
      >
        +
      </button>
      )}

      {/* ��バイル用モーダルをPostFormPopupに置き換え */}
      <PostFormPopup
      isOpen={isModalOpen}
      onClose={closeModal}
      postText={repostData ? repostText : postText}  // 変更: repostText を使用
      setPostText={repostData ? setRepostText : setPostText}  // 変更: repostData に応じて setter を切り替え
      setFiles={(files: FileItem[]) => setFiles(files)}
      handleSubmit={async (e, finalText) => {
        e.preventDefault();
        try {
          if (repostData) {
            // 古い投稿を削除
            const deleteSuccess = await handleDeletePost(
              { stopPropagation: () => {} } as React.MouseEvent,
              repostData.post_id
            );
            
            if (!deleteSuccess) {
              addNotification('古い投稿の削除に失敗しました');
              return;
            }
          }

          // 新しい投稿を作成
          const payload = {
            post_text: finalText,
            ...(files.length > 0 && { post_file: files.map(file => file.id) })
          };

          const response = await api.post('/api/post/post_create', payload);
          addNotification('投稿が成功しました！');
          setPostText('');
          setFiles([]);
          setRepostData(null);
          
          if (response.data.post_text && response.data.post_createat !== 'Date unavailable') {
            setPosts(prevPosts => [response.data, ...prevPosts]);
          }
          
          closeModal();
        } catch (error) {
          console.error('投稿処理でエラーが発生しました:', error);
          addNotification('投稿に失敗しました');
        }
      }}
      files={files}
      handleFiles={handleFiles}
      handleDeletePermanently={handleDeletePermanently} // 追加
      isLoggedIn={isLoggedIn}
      status={status}
      onSelectExistingFiles={handleSelectExistingFiles}
      fixedHashtags={fixedHashtags}
      setFixedHashtags={setFixedHashtags}
      autoAppendTags={autoAppendTags}  // ���加
      setAutoAppendTags={setAutoAppendTags}  // 追加
      repostMode={!!repostData}  // 追加
      handleCancelAttach={handleCancelAttach} // 追加
      />

      {/* ファ���ル選択モーダル */}
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
