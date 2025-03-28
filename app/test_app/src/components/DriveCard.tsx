'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Notification from './Notification';
import EditTitleModal from './EditTitleModal';

interface DriveCardProps {
  file: {
    file_id: string;
    file_size: number;
    file_createat: string;
    file_exif_public?: boolean;
    file_exif_gps_public?: boolean;
    file_exif_datetime?: string;
    file_exif_make?: string;
    file_exif_model?: string;
    file_exif_exposure_time?: string;
    file_exif_fnumber?: string;
    file_exif_iso?: string;
    file_exif_focal_length?: string;
    file_exif_gps_latitude?: string;
    file_exif_gps_longitude?: string;
    file_exif_gps_altitude?: string;
    file_exif_title?: string; // file_exif_titleプロパティ
  };
  handleDeleteClick: (file_id: string) => void;
  handleEditClick: (file_id: string) => void;
  handleCopyUrl: (file_id: string) => void;
  onFileUpdate?: (updatedFile: any) => void; // ファイル更新後のコールバック
}

export default function DriveCard({ file, handleDeleteClick, handleEditClick, handleCopyUrl, onFileUpdate }: DriveCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<{ id: string; message: string; }[]>([]);
  const [imageError, setImageError] = useState(false);
  const [showExif, setShowExif] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentFile, setCurrentFile] = useState(file);
  const menuRef = useRef<HTMLDivElement>(null);

  // ファイル情報が更新されたら、現在のファイル情報も更新
  useEffect(() => {
    setCurrentFile(file);
  }, [file]);

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

  const toggleExif = () => {
    setShowExif(!showExif);
  };

  // 編集モーダルを開く
  const openEditModal = () => {
    setIsEditModalOpen(true);
  };

  // 編集モーダルを閉じる
  const closeEditModal = () => {
    setIsEditModalOpen(false);
  };

  // タイトルを保存する
  const saveTitle = async (file_id: string, title: string) => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_DOMAIN?.replace(/\/+$/, '');
      const response = await fetch(`${baseUrl}/api/drive/file_update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file_id,
          file_exif_title: title,
        }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('タイトルの更新に失敗しました');
      }

      const result = await response.json();
      
      // 更新されたファイル情報で現在のファイルを更新
      setCurrentFile(prev => ({
        ...prev,
        file_exif_title: title,
      }));

      // 通知を表示
      addNotification('タイトルが更新されました');
      
      // 親コンポーネントに更新を通知
      if (onFileUpdate) {
        onFileUpdate(result.file);
      }
      
    } catch (error) {
      console.error('Error updating title:', error);
      throw error;
    }
  };

  // GPS情報があれば位置情報へのリンクを生成
  const getGoogleMapsUrl = () => {
    if (currentFile.file_exif_gps_latitude && currentFile.file_exif_gps_longitude) {
      return `https://www.google.com/maps?q=${currentFile.file_exif_gps_latitude},${currentFile.file_exif_gps_longitude}`;
    }
    return null;
  };

  const hasExifData = currentFile.file_exif_public && (
    currentFile.file_exif_datetime || 
    currentFile.file_exif_make || 
    currentFile.file_exif_model || 
    currentFile.file_exif_exposure_time || 
    currentFile.file_exif_fnumber ||
    currentFile.file_exif_iso ||
    currentFile.file_exif_focal_length ||
    currentFile.file_exif_title // file_exif_titleも含める
  );

  const hasGpsData = currentFile.file_exif_public && currentFile.file_exif_gps_public && (
    currentFile.file_exif_gps_latitude || 
    currentFile.file_exif_gps_longitude || 
    currentFile.file_exif_gps_altitude
  );

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
    <div className="flex flex-col p-4 bg-white shadow rounded dark:bg-gray-800 relative">
      <Notification 
        notifications={notifications}
        onClose={removeNotification}
      />
      <EditTitleModal
        isOpen={isEditModalOpen}
        onClose={closeEditModal}
        file={currentFile}
        onSave={saveTitle}
      />
      <div className="flex items-center justify-between">
        <div className="flex-1">
          {/* タイトルは表示せず、常にfile_idを表示 */}
          <p className="text-lg font-medium text-gray-800 dark:text-gray-100"><strong>File ID:</strong> {currentFile.file_id}</p>
          <p className="text-gray-600 dark:text-gray-300"><strong>File Size:</strong> {currentFile.file_size} bytes</p>
          <p className="text-gray-600 dark:text-gray-300"><strong>Created At:</strong> {new Date(currentFile.file_createat).toLocaleString()}</p>
          {(hasExifData || hasGpsData) && (
            <button 
              onClick={toggleExif}
              className="text-blue-500 text-sm mt-2 flex items-center"
            >
              {showExif ? '▼ EXIF情報を隠す' : '▶ EXIF情報を表示'}
            </button>
          )}
        </div>
        <div className="w-24 h-24 ml-4 bg-gray-200 flex items-center justify-center rounded relative overflow-hidden">
          {!imageError ? (
            <Image
              src={`${process.env.NEXT_PUBLIC_SITE_DOMAIN}/api/drive/file/${currentFile.file_id}`}
              alt={`File ${currentFile.file_id}`} // タイトルは使用せずにfile_idを代替テキストとして使用
              fill
              sizes="96px"
              className="rounded object-cover object-center"
              onError={() => setImageError(true)}
              style={{ objectFit: 'contain' }}
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
                  onClick={(event) => { toggleMenu(event); handleDeleteClick(currentFile.file_id); }}
                >
                  削除
                </li>
                <li
                  className="text-sm py-2 px-4 whitespace-nowrap hover:bg-gray-100 hover:rounded-lg cursor-pointer dark:text-gray-100 dark:hover:bg-gray-800"
                  onClick={(event) => { toggleMenu(event); openEditModal(); }}
                >
                  修正
                </li>
                <li
                  className="text-sm py-2 px-4 whitespace-nowrap hover:bg-gray-100 hover:rounded-lg cursor-pointer dark:text-gray-100 dark:hover:bg-gray-800"
                  onClick={(event) => { toggleMenu(event); handleCopyUrlWithNotification(currentFile.file_id); }}
                >
                  URLコピー
                </li>
                <li
                  className="text-sm py-2 px-4 whitespace-nowrap hover:bg-gray-100 hover:rounded-lg cursor-pointer dark:text-gray-100 dark:hover:bg-gray-800"
                  onClick={(event) => { toggleMenu(event); handleDownload(currentFile.file_id); }}
                >
                  ダウンロード
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* EXIF情報表示エリア */}
      {showExif && (hasExifData || hasGpsData) && (
        <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-700 rounded text-sm">
          <h3 className="font-medium text-gray-800 dark:text-gray-100 mb-2">EXIF情報</h3>
          
          {hasExifData && (
            <div className="grid grid-cols-2 gap-2">
              {currentFile.file_exif_title && (
                <div className="col-span-2 flex items-center">
                  <span className="font-medium">タイトル:</span> {currentFile.file_exif_title}
                  <button 
                    onClick={openEditModal} 
                    className="ml-2 text-blue-500 hover:text-blue-700"
                    title="タイトルを編集"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                </div>
              )}
              {!currentFile.file_exif_title && (
                <div className="col-span-2 flex items-center">
                  <span className="font-medium">タイトル:</span> <span className="text-gray-500 italic">未設定</span>
                  <button 
                    onClick={openEditModal} 
                    className="ml-2 text-blue-500 hover:text-blue-700"
                    title="タイトルを設定"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
              )}
              {currentFile.file_exif_datetime && (
                <div className="col-span-2">
                  <span className="font-medium">日時:</span> {currentFile.file_exif_datetime}
                </div>
              )}
              {currentFile.file_exif_make && (
                <div>
                  <span className="font-medium">メーカー:</span> {currentFile.file_exif_make}
                </div>
              )}
              {currentFile.file_exif_model && (
                <div>
                  <span className="font-medium">モデル:</span> {currentFile.file_exif_model}
                </div>
              )}
              {currentFile.file_exif_exposure_time && (
                <div>
                  <span className="font-medium">露出時間:</span> {currentFile.file_exif_exposure_time}
                </div>
              )}
              {currentFile.file_exif_fnumber && (
                <div>
                  <span className="font-medium">F値:</span> {currentFile.file_exif_fnumber}
                </div>
              )}
              {currentFile.file_exif_iso && (
                <div>
                  <span className="font-medium">ISO:</span> {currentFile.file_exif_iso}
                </div>
              )}
              {currentFile.file_exif_focal_length && (
                <div>
                  <span className="font-medium">焦点距離:</span> {currentFile.file_exif_focal_length}
                </div>
              )}
            </div>
          )}
          
          {hasGpsData && (
            <div className="mt-2">
              <h4 className="font-medium text-gray-800 dark:text-gray-100">位置情報</h4>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {currentFile.file_exif_gps_latitude && currentFile.file_exif_gps_longitude && (
                  <div className="col-span-2">
                    <span className="font-medium">座標:</span> 
                    {currentFile.file_exif_gps_latitude}, {currentFile.file_exif_gps_longitude}
                    {getGoogleMapsUrl() && (
                      <a 
                        href={getGoogleMapsUrl()!} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-500 ml-2 inline-flex items-center"
                      >
                        地図で見る
                        <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    )}
                  </div>
                )}
                {currentFile.file_exif_gps_altitude && (
                  <div>
                    <span className="font-medium">高度:</span> {currentFile.file_exif_gps_altitude}m
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}