'use client'

import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useInView } from 'react-intersection-observer';

const DeleteConfirmModal = dynamic(() => import('./DeleteConfirmModal'));
const ImageModal = dynamic(() => import('./ImageModal'));
const Notification = dynamic(() => import('./Notification'));

interface Post {
  post_id: string;
  post_text: string;
  post_file?: string | string[];
  post_createat: string;
}

interface Props {
  post: Post;
  isLoggedIn: boolean;
  handleDeleteClick: (event: React.MouseEvent, postId: string) => void;
  formatDate: (date: string) => string;
  formatHashtags?: (text: string) => string;
  renderHashtagsContainer?: (text: string) => React.ReactNode;
  className?: string;
  onDelete: (event: React.MouseEvent, post_id: string) => Promise<boolean>;
}

interface ImageData {
  fileId: string;
  thumbnailUrl: string | null;
  fullUrl: string | null;
  loading: boolean;
}

const Card = memo(({ post, isLoggedIn, handleDeleteClick, formatDate, formatHashtags, renderHashtagsContainer, className, onDelete }: Props) => {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1
  });

  const [imageData, setImageData] = useState<Record<string, ImageData>>({});
  const [uiState, setUiState] = useState({
    menuOpen: false,
    deleteModalOpen: false, // 削除モーダル用の状態
    imageModalOpen: false,  // 画像モーダル用の状態
    selectedImage: null as string | null,
  });
  const [notifications, setNotifications] = useState<{ id: string, message: string }[]>([]);

  const handleHashtagClick = (hashtag: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const searchText = hashtag.slice(1); // # を除去
    router.push(`/search?searchText=${encodeURIComponent(searchText)}&searchType=タグ検索`);
  };

  const renderText = (text: string | null): React.ReactNode => {
    if (!text) return null;
    
    if (renderHashtagsContainer) {
      return renderHashtagsContainer(text);
    }
    
    const pattern = /(?<=^|\s)(#[^\s]+|https?:\/\/[^\s]+)(?=\s|$)/;
    const parts = text.split(pattern);
    
    return (
      <div className="whitespace-pre-wrap break-words text-gray-800 text-base dark:text-gray-100">
        {parts.map((part, index) => {
          if (part.match(/^#[^\s]+$/)) {
            const searchText = encodeURIComponent(part.slice(1));
            return (
              <a
                key={index}
                href={`/search?searchText=${searchText}&searchType=タグ検索`}
                className="text-blue-500 font-bold hover:underline"
                onClick={(e) => handleHashtagClick(part, e)}
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
    if (!inView || imageData[fileId]?.thumbnailUrl) return;

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_DOMAIN}/api/drive/file/${fileId}/thumbnail`);
      if (!response.ok) throw new Error('Fetch failed');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      setImageData(prev => ({
        ...prev,
        [fileId]: {
          ...prev[fileId],
          thumbnailUrl: url,
          loading: false
        }
      }));
    } catch (error) {
      console.error('Error loading thumbnail:', error);
      setImageData(prev => ({
        ...prev,
        [fileId]: {
          ...prev[fileId],
          loading: false
        }
      }));
    }
  }, [inView, imageData]);

  const loadFullImage = useCallback(async (fileId: string) => {
    try {
      // すでに読み込み済みの場合は早期リターン
      if (imageData[fileId]?.fullUrl) {
        return imageData[fileId].fullUrl;
      }
  
      const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_DOMAIN}/api/drive/file/${fileId}`, {
        credentials: 'include',
        cache: 'force-cache', // キャッシュを強制的に使用
      });
      
      if (!response.ok) throw new Error('Fetch failed');
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      // 状態を更新する前に既存のfullUrlがあれば解放
      if (imageData[fileId]?.fullUrl) {
        URL.revokeObjectURL(imageData[fileId].fullUrl);
      }

      setImageData(prev => ({
        ...prev,
        [fileId]: {
          ...prev[fileId],
          fullUrl: url,
          loading: false
        }
      }));
  
      return url;
    } catch (error) {
      console.error('Error loading full image:', error);
      return null;
    }
  }, [imageData]);

  const handleImageClick = useCallback(async (fileId: string) => {
    try {
      // すでに完全な画像URLが存在する場合はそれを使用
      if (imageData[fileId]?.fullUrl) {
        setUiState(prev => ({
          ...prev,
          imageModalOpen: true,
          selectedImage: imageData[fileId].fullUrl
        }));
        return;
      }

      // モーダルを開く前に画像の読み込みを開始
      const fullImageUrl = await loadFullImage(fileId);
      if (!fullImageUrl) {
        throw new Error('Failed to load image');
      }

      // 読み込みが完了してからモーダルを開く
      setUiState(prev => ({
        ...prev,
        imageModalOpen: true,
        selectedImage: fullImageUrl
      }));
    } catch (error) {
      console.error('Error in handleImageClick:', error);
      // エラー時にはサムネイルを表示
      setUiState(prev => ({
        ...prev,
        imageModalOpen: true,
        selectedImage: imageData[fileId]?.thumbnailUrl || null
      }));
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

    return () => {
      // クリーンアップ時に未使用のBlobURLを解放
      files.forEach(file => {
        const fileId = typeof file === "string" ? file.replace(/^\{?"|"?\}$/g, '') : file;
        const data = imageData[fileId];
        if (data?.thumbnailUrl) URL.revokeObjectURL(data.thumbnailUrl);
        if (data?.fullUrl) URL.revokeObjectURL(data.fullUrl);
      });
    };
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
        console.error("コピーに失敗しました", err);
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
              {!data?.thumbnailUrl ? (
                <div className="animate-pulse w-full h-full bg-gray-300" />
              ) : (
                <Image
                  src={data.thumbnailUrl}
                  alt={`Post image ${fileId}`}
                  width={300}
                  height={200}
                  loading="lazy"
                  className="transition-opacity duration-300 cursor-pointer object-contain w-full h-full"
                  onClick={() => handleImageClick(fileId)}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  }, [post.post_file, imageData, handleImageClick]);

  return (
    <div ref={ref} className="w-full px-2 sm:px-4">
      <div className={`block bg-white shadow-md rounded-lg p-3 sm:p-4 hover:bg-gray-700 hover:text-gray-100 transition-all dark:text-gray-100 dark:bg-gray-800 duration-200 cursor-pointer relative mt-4 w-full max-w-3xl mx-auto break-words ${className}`}>
        <Notification 
          notifications={notifications} 
          onClose={removeNotification}
        />

        <div className="absolute top-4 right-4 z-10">
          <button onClick={toggleMenu} className="p-2 text-gray-700 dark:text-gray-300">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
            </svg>
          </button>
        </div>

        {uiState.menuOpen && (
          <div ref={menuRef} className="absolute top-14 right-4 bg-white shadow-lg rounded-lg p-2 z-20 dark:bg-gray-900">
            <ul>
              <li className="text-sm py-2 px-4 hover:bg-gray-100 hover:rounded-lg cursor-pointer dark:text-gray-100 dark:hover:bg-gray-800"
                  onClick={copyLink}>
                リンクをコピー
              </li>
              {isLoggedIn && (
                <li className="text-sm py-2 px-4 hover:bg-gray-100 hover:rounded-lg cursor-pointer dark:text-gray-100 dark:hover:bg-gray-800"
                    onClick={() => setUiState(prev => ({
                      ...prev,
                      deleteModalOpen: true
                    }))}>
                  削除
                </li>
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

        <ImageModal
          isOpen={uiState.imageModalOpen}
          imageUrl={uiState.selectedImage}
          onClose={handleCloseModal}
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
