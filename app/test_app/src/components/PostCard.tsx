'use client'

import React, { useState, useEffect, useRef } from 'react';
import Notification from './Notification';
import DeleteConfirmModal from './DeleteConfirmModal';
import ImageModal from './ImageModal';
import { useRouter } from 'next/navigation';


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
  file_id: string;
  url: string | null;
  error: boolean;
}

const Card = React.memo(({ post, isLoggedIn, handleDeleteClick, formatDate, formatHashtags, renderHashtagsContainer, className, onDelete }: Props) => {
  const router = useRouter();
  const [images, setImages] = useState<ImageData[]>([]);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<{ id: string; message: string; }[]>([]);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    let isMounted = true;
    const fetchImages = async () => {
      const files = post.post_file
        ? (Array.isArray(post.post_file)
          ? post.post_file 
          : post.post_file.split(',').map(file => file.trim().replace(/^"|"$/g, '')))
        : [];

      const fetchedImages = await Promise.all(
        files.map(async (file) => {
          const file_id = typeof file === "string" ? file.replace(/^\{?"|"?\}$/g, '') : file;
          try {
            const response = await fetch(`/api/drive/file/${file_id}`);
            if (!response.ok) throw new Error('Fetch failed');
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            return { file_id, url, error: false };
          } catch (error) {
            return { file_id, url: null, error: true };
          }
        })
      );

      if (isMounted) {
        setImages(fetchedImages);
      }
    };

    fetchImages();

    return () => {
      isMounted = false;
      images.forEach((img) => {
        if (img.url) URL.revokeObjectURL(img.url);
      });
    };
  }, [post.post_file]);

  const handleImageClick = (url: string): void => {
    setSelectedImage(url);
    setImageModalOpen(true);
  };

  const closeImageModal = (): void => {
    setImageModalOpen(false);
    setSelectedImage(null);
  };

  const toggleMenu = (event: React.MouseEvent): void => {
    event.stopPropagation();
    setMenuOpen(!menuOpen);
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
        setMenuOpen(false);
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
    setDeleteModalOpen(false);
    await onDelete(event, postId);
    setMenuOpen(false);
  };

  return (
    <div className="w-full px-2 sm:px-4">
      <div className={`block bg-white shadow-md rounded-lg p-3 sm:p-4 hover:bg-gray-700 hover:text-gray-100 transition-all dark:text-gray-100 dark:bg-gray-800 duration-200 cursor-pointer relative mt-4 w-full max-w-3xl mx-auto break-words ${className}`}>
        {/* 既存のカードコンテンツ */}
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

        {menuOpen && (
          <div ref={menuRef} className="absolute top-14 right-4 bg-white shadow-lg rounded-lg p-2 z-20 dark:bg-gray-900">
            <ul>
              <li className="text-sm py-2 px-4 hover:bg-gray-100 hover:rounded-lg cursor-pointer dark:text-gray-100 dark:hover:bg-gray-800"
                  onClick={copyLink}>
                リンクをコピー
              </li>
              {isLoggedIn && (
                <li className="text-sm py-2 px-4 hover:bg-gray-100 hover:rounded-lg cursor-pointer dark:text-gray-100 dark:hover:bg-gray-800"
                    onClick={() => setDeleteModalOpen(true)}>
                  削除
                </li>
              )}
            </ul>
          </div>
        )}

        <DeleteConfirmModal
          isOpen={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          onDelete={(e) => handleDelete(e, post.post_id)}
        />

        <ImageModal
          isOpen={imageModalOpen}
          imageUrl={selectedImage}
          onClose={closeImageModal}
        />

        <div>
          <div className="text-gray-500 text-sm break-words">
            Created at: {formatDate(post.post_createat)}
          </div>

          <div className="mt-2 break-words">
            {renderHashtagsContainer ? renderHashtagsContainer(post.post_text) : renderText(post.post_text)}
          </div>

          {images.length > 0 && (
            <div className={`mt-4 ${images.length === 1 ? 'w-full' : 'grid grid-cols-2 gap-2'}`}>
              {images.map((img) => (
                <div key={img.file_id} className="relative w-full aspect-video bg-gray-200 rounded overflow-hidden">
                  {img.error ? (
                    <div className="flex items-center justify-center h-full text-red-500 text-sm">
                      画像を表示できませんでした。
                    </div>
                  ) : (
                    <img
                      src={img.url || ''}
                      alt={`Post image ${img.file_id}`}
                      className="object-contain w-full h-full cursor-pointer bg-gray-700"
                      onClick={(e) => { e.stopPropagation(); img.url && handleImageClick(img.url); }}
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          <ImageModal
            isOpen={imageModalOpen}
            imageUrl={selectedImage}
            onClose={closeImageModal}
          />
        </div>
      </div>
    </div>
  );
});

Card.displayName = 'Card';

export default Card;
