'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Notification from './Notification';

interface DriveCardProps {
  file: {
    file_id: string;
    file_size: number;
    file_createat: string;
  };
  handleDeleteClick: (file_id: string) => void;
  handleEditClick: (file_id: string) => void;
  handleCopyUrl: (file_id: string) => void;
}

export default function DriveCard({ file, handleDeleteClick, handleEditClick, handleCopyUrl }: DriveCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<{ id: string; message: string; }[]>([]);
  const [imageError, setImageError] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  const handleCopyUrlWithNotification = async (file_id: string) => {
    try {
      if (!process.env.NEXT_PUBLIC_SITE_DOMAIN) {
        throw new Error('Site domain is not configured');
      }
      
      const baseUrl = process.env.NEXT_PUBLIC_SITE_DOMAIN.replace(/\/+$/, '');
      const fileUrl = `${baseUrl}/api/drive/files/${file_id}`;
      
      await navigator.clipboard.writeText(fileUrl);
      addNotification('URLをクリップボードにコピーしました');
      handleCopyUrl(file_id); // 元の処理も維持
    } catch (err) {
      console.error('URLのコピーに失敗しました:', err);
      addNotification('URLのコピーに失敗しました');
    }
  };

  const handleDownload = async (file_id: string) => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_DOMAIN?.replace(/\/+$/, '');
      const fileUrl = `${baseUrl}/api/drive/file_download/${file_id}`;
      
      // download属性を追加し、target属性を削除
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = '';  // ブラウザにダウンロードを指示
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      addNotification('ダウンロードを開始しました');
    } catch (err) {
      console.error('ダウンロードに失敗しました:', err);
      addNotification('ダウンロードに失敗しました');
    }
  };

  const toggleMenu = (event?: React.MouseEvent) => {
    if (event && event.stopPropagation) {
      event.stopPropagation();
    }
    setMenuOpen(!menuOpen);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="flex items-center justify-between p-4 bg-white shadow rounded dark:bg-gray-800 relative">
      <Notification 
        notifications={notifications}
        onClose={removeNotification}
      />
      <div className="flex-1">
        <p className="text-lg font-medium text-gray-800 dark:text-gray-100"><strong>File ID:</strong> {file.file_id}</p>
        <p className="text-gray-600"><strong>File Size:</strong> {file.file_size} bytes</p>
        <p className="text-gray-600"><strong>Created At:</strong> {new Date(file.file_createat).toLocaleString()}</p>
      </div>
      <div className="w-24 h-24 ml-4 bg-gray-200 flex items-center justify-center rounded relative">
        {!imageError ? (
          <Image
            src={`${process.env.NEXT_PUBLIC_SITE_DOMAIN}/api/drive/file/${file.file_id}`}
            alt={`File ${file.file_id}`}
            width={96}  // 24 * 4
            height={96} // 24 * 4
            className="rounded object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <span className="text-gray-500 text-sm">No Image</span>
        )}
      </div>

      <div className="absolute top-2 right-2">
        <button onClick={toggleMenu} className="p-2 text-gray-700 dark:text-gray-300" aria-haspopup="true" aria-expanded={menuOpen}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
          </svg>
        </button>
        {menuOpen && (
          <div ref={menuRef} className="absolute top-14 right-4 bg-white shadow-lg rounded-lg p-2 z-10 dark:bg-gray-900">
            <ul>
              <li
                className="text-sm py-2 px-4 whitespace-nowrap hover:bg-gray-100 hover:rounded-lg cursor-pointer dark:text-gray-100 dark:hover:bg-gray-800"
                onClick={(event) => { toggleMenu(event); handleDeleteClick(file.file_id); }}
              >
                削除
              </li>
              <li
                className="text-sm py-2 px-4 whitespace-nowrap hover:bg-gray-100 hover:rounded-lg cursor-pointer dark:text-gray-100 dark:hover:bg-gray-800"
                onClick={(event) => { toggleMenu(event); handleEditClick(file.file_id); }}
              >
                修正
              </li>
              <li
                className="text-sm py-2 px-4 whitespace-nowrap hover:bg-gray-100 hover:rounded-lg cursor-pointer dark:text-gray-100 dark:hover:bg-gray-800"
                onClick={(event) => { toggleMenu(event); handleCopyUrlWithNotification(file.file_id); }}
              >
                URLコピー
              </li>
              <li
                className="text-sm py-2 px-4 whitespace-nowrap hover:bg-gray-100 hover:rounded-lg cursor-pointer dark:text-gray-100 dark:hover:bg-gray-800"
                onClick={(event) => { toggleMenu(event); handleDownload(file.file_id); }}
              >
                ダウンロード
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}