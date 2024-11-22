'use client'

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

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
  onDelete: (event: React.MouseEvent, post_id: string) => void;
}

interface ImageData {
  file_id: string;
  url: string | null;
  error: boolean;
}

const Card = React.memo(({ post, isLoggedIn, handleDeleteClick, formatDate, formatHashtags, renderHashtagsContainer, className, onDelete }: Props) => {
  const [images, setImages] = useState<ImageData[]>([]);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notification, setNotification] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const renderText = (text: string | null): React.ReactNode => {
    if (!text) return null;
    return <p>{text}</p>;  // Default rendering of text
    // ...existing code...
  };

  useEffect(() => {
    let isMounted = true;
    const fetchImages = async () => {
      // ...existing code...
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

  const copyLink = (): void => {
    // ...existing code...
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

  return (
    <div className={`card ${className || ''}`}>
      <div className="card-content">
        {renderHashtagsContainer ? renderHashtagsContainer(post.post_text) : renderText(post.post_text)}
        {images.length > 0 && (
          <div className="images-container">
            {images.map((img) => (
              <img
                key={img.file_id}
                src={img.url || ''}
                alt="Post content"
                onClick={() => img.url && handleImageClick(img.url)}
              />
            ))}
          </div>
        )}
        <button onClick={(e) => onDelete(e, post.post_id)}>削除</button>
      </div>
    </div>
  );
});

Card.displayName = 'Card';

export default Card;
