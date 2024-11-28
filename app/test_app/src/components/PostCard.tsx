'use client'

import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useInView } from 'react-intersection-observer';
import { Post as PostFeedPost } from '@/components/PostFeed';  // 追加

const DeleteConfirmModal = dynamic(() => import('./DeleteConfirmModal'));
const ImageModal = dynamic(() => import('./ImageModal'));
const Notification = dynamic(() => import('./Notification'));

// 既存のPostインターフェースを削除し、PostFeedのものを使用
interface Props {
  post: PostFeedPost;  // 変更
  isLoggedIn: boolean;
  handleDeleteClick: (event: React.MouseEvent, postId: string) => void;
  formatDate: (date: string) => string;
  formatHashtags?: (text: string) => string;
  renderHashtagsContainer?: (text: string) => React.ReactNode;
  className?: string;
  onDelete: (event: React.MouseEvent, post_id: string) => Promise<boolean>;
  onRepost?: (post: PostFeedPost) => Promise<void>;  // 変更
}

interface ImageData {
  fileId: string;
  thumbnailUrl: string | null;
  fullUrl: string | null;
  loading: boolean;
  status: 'idle' | 'loading' | 'error';
}

const Card = memo(({ post, isLoggedIn, handleDeleteClick, formatDate, formatHashtags, renderHashtagsContainer, className, onDelete, onRepost }: Props) => {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1
  });

  // hydration errorを防ぐため、useEffectで初期化
  const [imageData, setImageData] = useState<Record<string, ImageData>>({});
  const [uiState, setUiState] = useState({
    menuOpen: false,
    deleteModalOpen: false, // 削除モーダル用の状態
    imageModalOpen: false,  // 画像モーダル用の状態
    selectedImage: null as string | null,
    repostModalOpen: false, // 追加
  });
  const [notifications, setNotifications] = useState<{ id: string, message: string }[]>([]);

  // リトライ回数を管理するための状態を追加
  const [retryCount, setRetryCount] = useState<Record<string, number>>({});
  const MAX_RETRY = 3;

  const handleHashtagClick = useCallback((hashtag: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const searchText = hashtag.slice(1); // # を除去
    router.push(`/search?searchText=${encodeURIComponent(searchText)}&searchType=hashtag`);
  }, [router]);

  const renderText = (text: string | null): React.ReactNode => {
    if (!text) return null;
    
    if (renderHashtagsContainer) {
      return renderHashtagsContainer(text);
    }
    
    const pattern = /(?<=^|\s)(#[^\s]+|https?:\/\/[^\s]+)(?=\s|$)/;
    const parts = text.split(pattern);
    
    return (
      <div className="whitespace-pre-wrap break-words text-base">
        {parts.map((part, index) => {
          if (part.match(/^#[^\s]+$/)) {
            const tag = part.slice(1); // # を除去
            return (
              <a
                key={index}
                href={`/search?searchText=${encodeURIComponent(tag)}&searchType=hashtag`}
                className="text-blue-500 font-bold hover:underline"
                onClick={(e) => {
                  e.preventDefault();
                  handleHashtagClick(part, e);
                }}
              >
                {part}
              </a>
            );
          } else if (part.match(/^https?:\/\/[^\s]+$/)) {
            return (
              <a
                key={index}
                href={part}
                className="text-blue-500 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
              >
                {part}
              </a>
            );
          }
          return <span key={index}>{part}</span>;
        })}
      </div>
    );
  };

  const loadThumbnail = useCallback(async (fileId: string) => {
    if (!inView) return;
    
    const thumbnailUrl = `${process.env.NEXT_PUBLIC_SITE_DOMAIN}/api/drive/file/${fileId}/thumbnail`;
    setImageData(prev => ({
      ...prev,
      [fileId]: {
        ...prev[fileId],
        thumbnailUrl,
        loading: false
      }
    }));
  }, [inView]);

  const loadFullImage = useCallback(async (fileId: string) => {
    try {
      setImageData(prev => ({
        ...prev,
        [fileId]: { ...prev[fileId], status: 'loading' }
      }));

      const fullUrl = `${process.env.NEXT_PUBLIC_SITE_DOMAIN}/api/drive/file/${fileId}`;
      
      setImageData(prev => ({
        ...prev,
        [fileId]: {
          ...prev[fileId],
          fullUrl,
          loading: false,
          status: 'idle'
        }
      }));

      return fullUrl;
    } catch (error) {
      console.error('Error loading full image:', error);
      setImageData(prev => ({
        ...prev,
        [fileId]: { ...prev[fileId], status: 'error' }
      }));
      return `${process.env.NEXT_PUBLIC_SITE_DOMAIN}/api/drive/file/${fileId}`;
    }
  }, []);

  const handleImageClick = useCallback(async (fileId: string) => {
    try {
      setUiState(prev => ({
        ...prev,
        imageModalOpen: true,
        selectedImage: imageData[fileId]?.thumbnailUrl // 最初にサムネイルを表示
      }));

      const fullImageUrl = await loadFullImage(fileId);
      if (fullImageUrl) {
        setUiState(prev => ({
          ...prev,
          selectedImage: fullImageUrl
        }));
      }
    } catch (error) {
      console.error('Error in handleImageClick:', error);
      // エラー時はサムネイルを維持
    }
  }, [loadFullImage, imageData]);

  const handleCloseModal = useCallback(() => {
    setUiState(prev => ({
      ...prev,
      imageModalOpen: false,
      selectedImage: null
    }));
  }, []);

  useEffect(() => {
    if (!post.post_file) return;

    const files = Array.isArray(post.post_file)
      ? post.post_file
      : post.post_file.split(',').map(file => file.trim().replace(/^"|"$/g, ''));

    if (inView) {
      files.forEach(file => {
        const fileId = typeof file === "string" ? file.replace(/^\{?"|"?\}$/g, '') : file;
        loadThumbnail(fileId);
      });
    }
  }, [inView, post.post_file, loadThumbnail]);

  useEffect(() => {
    const currentImageData = { ...imageData };

    return () => {
      Object.values(currentImageData).forEach(data => {
        if (data?.thumbnailUrl) {
          URL.revokeObjectURL(data.thumbnailUrl);
        }
        if (data?.fullUrl) {
          URL.revokeObjectURL(data.fullUrl);
        }
      });
    };
  }, []); // 空の依存配列で、コンポーネントのマウント解除時のみ実行

  // 画像データが更新されたときのクリーンアップ
  useEffect(() => {
    const cleanup = () => {
      Object.values(imageData).forEach(data => {
        if (!data) return;
        if (data.thumbnailUrl && !document.querySelector(`img[src="${data.thumbnailUrl}"]`)) {
          URL.revokeObjectURL(data.thumbnailUrl);
        }
        if (data.fullUrl && !uiState.imageModalOpen) {
          URL.revokeObjectURL(data.fullUrl);
        }
      });
    };

    return cleanup;
  }, [imageData, uiState.imageModalOpen]);

  const toggleMenu = (event: React.MouseEvent): void => {
    event.stopPropagation();
    setUiState(prev => ({
      ...prev,
      menuOpen: !prev.menuOpen
    }));
  };

  const addNotification = (message: string) => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { id, message }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(notification => notification.id !== id));
    }, 5000);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  const copyLink = (): void => {
    const domain = process.env.NEXT_PUBLIC_SITE_DOMAIN || window.location.origin;
    const url = `${domain}/post/${post.post_id}`;
    
    navigator.clipboard.writeText(url)
      .then(() => {
        addNotification("クリップボードにURLがコピーされました");
      })
      .catch((err) => {
        console.error("コピーに失敗しま���た", err);
        addNotification("コピーに失敗しました");
      });
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setUiState(prev => ({
          ...prev,
          menuOpen: false
        }));
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const formatText = (text: string | null): React.ReactNode => {
    if (!text) return null;
    return formatHashtags ? formatHashtags(text) : text;
  };

  const handleDelete = async (event: React.MouseEvent, postId: string) => {
    event.stopPropagation();
    setUiState(prev => ({
      ...prev,
      deleteModalOpen: false
    }));
    await onDelete(event, postId);
    setUiState(prev => ({
      ...prev,
      menuOpen: false
    }));
  };

  const handleImageLoad = useCallback((fileId: string) => {
    setImageData(prev => ({ ...prev, [fileId]: { ...prev[fileId], loading: false } }));
  }, []);

  const handleRepost = async (event: React.MouseEvent) => {
    event.stopPropagation();
    if (!onRepost) return;
    
    setUiState(prev => ({
      ...prev,
      repostModalOpen: false,
      menuOpen: false
    }));
    
    try {
      await onRepost(post);
      addNotification("投稿を再作成しました");
    } catch (error) {
      console.error("再投稿に失敗しました", error);
      addNotification("再投稿に失敗しました");
    }
  };

  const renderImages = useCallback(() => {
    if (!post.post_file) return null;

    const files = Array.isArray(post.post_file)
      ? post.post_file
      : post.post_file.split(',').map(file => file.trim().replace(/^"|"$/g, ''));

    return (
      <div className={`mt-4 ${files.length === 1 ? 'w-full' : 'grid grid-cols-2 gap-2'}`}>
        {files.map(file => {
          const fileId = typeof file === "string" ? file.replace(/^\{?"|"?\}$/g, '') : file;
          const data = imageData[fileId];

          return (
            <div key={fileId} className="relative w-full aspect-video bg-gray-200 rounded overflow-hidden">
              {(!data?.thumbnailUrl) ? (
                <div className="animate-pulse w-full h-full bg-gray-300 flex items-center justify-center">
                  <span className="text-gray-600">読み込み中...</span>
                </div>
              ) : (
                <div className="relative w-full h-full">
                  <Image
                    src={data.thumbnailUrl}
                    alt={`Post image ${fileId}`}
                    width={300}
                    height={200}
                    loading="lazy"
                    className="cursor-pointer object-contain w-full h-full"
                    onClick={() => handleImageClick(fileId)}
                    onLoad={() => handleImageLoad(fileId)}
                  />
                  {data.status === 'loading' && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                      <span className="text-white">画像を読み込み中...</span>
                    </div>
                  )}
                  {data.status === 'error' && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                      <span className="text-white">読み込みに失敗しました</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }, [post.post_file, imageData, handleImageClick, handleImageLoad]);

  return (
    <div ref={ref} className="w-full px-2 sm:px-4">
      <div className={`block bg-white dark:bg-gray-800 shadow-md rounded-lg p-3 sm:p-4 hover:bg-gray-50 dark:hover:bg-gray-700 relative mt-4 w-full max-w-3xl mx-auto break-words text-[color:rgb(var(--foreground))] ${className}`}>
        <Notification 
          notifications={notifications} 
          onClose={removeNotification}
        />

        <div className="absolute top-1 right-4 z-10">
          <button onClick={toggleMenu} className="p-2 text-gray-700 dark:text-gray-300">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
            </svg>
          </button>
        </div>

        {uiState.menuOpen && (
          <div ref={menuRef} className="absolute top-11 right-4 bg-white shadow-lg rounded-lg p-2 z-20 dark:bg-gray-900">
            <ul>
              <li className="text-sm py-2 px-4 hover:bg-gray-100 hover:rounded-lg cursor-pointer dark:text-gray-100 dark:hover:bg-gray-800"
                  onClick={copyLink}>
                リンクをコピー
              </li>
              {isLoggedIn && (
                <>
                  <li className="text-sm py-2 px-4 hover:bg-gray-100 hover:rounded-lg cursor-pointer dark:text-gray-100 dark:hover:bg-gray-800"
                      onClick={() => setUiState(prev => ({
                        ...prev,
                        deleteModalOpen: true
                      }))}>
                    削除
                  </li>
                  <li className="text-sm py-2 px-4 hover:bg-gray-100 hover:rounded-lg cursor-pointer dark:text-gray-100 dark:hover:bg-gray-800"
                      onClick={() => setUiState(prev => ({
                        ...prev,
                        repostModalOpen: true
                      }))}>
                    削除して再投稿
                  </li>
                </>
              )}
            </ul>
          </div>
        )}

        <DeleteConfirmModal
          isOpen={uiState.deleteModalOpen}
          onClose={() => setUiState(prev => ({
            ...prev,
            deleteModalOpen: false
          }))}
          onDelete={(e) => handleDelete(e, post.post_id)}
        />

        <DeleteConfirmModal
          isOpen={uiState.repostModalOpen}
          onClose={() => setUiState(prev => ({
            ...prev,
            repostModalOpen: false
          }))}
          onDelete={handleRepost}
          title="削除して再投稿"
          message="この投稿を削除して再投稿しますか？"
          confirmText="再投稿"
        />

        <ImageModal
          isOpen={uiState.imageModalOpen}
          imageUrl={uiState.selectedImage}
          onClose={handleCloseModal}
          className="z-49"  // z-indexを49に設定
        />

        <div>
          <div className="text-gray-500 text-sm break-words">
            Created at: {formatDate(post.post_createat)}
          </div>

          <div className="mt-2 break-words">
            {renderHashtagsContainer ? renderHashtagsContainer(post.post_text) : renderText(post.post_text)}
          </div>

          {inView && renderImages()}

        </div>
      </div>
    </div>
  );
});

Card.displayName = 'Card';

export default Card;
