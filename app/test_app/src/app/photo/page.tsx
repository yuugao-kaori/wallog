'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import Image from 'next/image';
import { createPortal } from 'react-dom';

interface File {
  file_id: string;
  file_size: number;
  file_format: string;
  file_createat: string;
  file_exif_public: boolean;
  file_exif_gps_public: boolean;
  file_exif_title: string | null;
  file_exif_datetime: string | null;
  file_exif_make: string | null;
  file_exif_model: string | null;
  file_exif_xresolution: string | null;
  file_exif_yresolution: string | null;
  file_exif_resolution_unit: string | null;
  file_exif_exposure_time: string | null;
  file_exif_fnumber: string | null;
  file_exif_iso: string | null;
  file_exif_metering_mode: string | null;
  file_exif_flash: string | null;
  file_exif_exposure_compensation: string | null;
  file_exif_focal_length: string | null;
  file_exif_color_space: string | null;
  file_exif_gps_latitude: string | null;
  file_exif_gps_longitude: string | null;
  file_exif_gps_altitude: string | null;
  file_exif_image_direction: string | null;
}

interface ApiResponse {
  files: File[];
  pagination: {
    limit: number;
    offset: number;
    count: number;
  };
}

// Axiosのデフォルト設定
axios.defaults.baseURL = process.env.NEXT_PUBLIC_SITE_DOMAIN;
axios.defaults.withCredentials = true;
axios.defaults.headers.common['Content-Type'] = 'application/json;charset=utf-8';

export default function PhotoPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [limit] = useState(10);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  // DOM 要素をマウント後に取得するためのstate
  const [portalContainer, setPortalContainer] = useState<Element | null>(null);

  // ポータル用のコンテナ要素を取得
  useEffect(() => {
    setPortalContainer(document.body);
  }, []);

  // 写真データの取得
  useEffect(() => {
    const fetchPhotos = async () => {
      setLoading(true);
      try {
        const response = await axios.get<ApiResponse>(
          `/api/drive/file_list?sort=exif_datetime&limit=${limit}&offset=${offset}`
        );
        
        if (response.data.files.length < limit) {
          setHasMore(false);
        }
        
        // 既存のファイルと新しく取得したファイルを結合
        setFiles(prevFiles => 
          offset === 0 ? response.data.files : [...prevFiles, ...response.data.files]
        );
        setError(null);
      } catch (err) {
        console.error('Error fetching photos:', err);
        setError('写真の読み込み中にエラーが発生しました');
      } finally {
        setLoading(false);
      }
    };

    fetchPhotos();
  }, [limit, offset]);

  // 追加データ読み込み用のハンドラ
  const loadMorePhotos = () => {
    if (!loading && hasMore) {
      setOffset(prevOffset => prevOffset + limit);
    }
  };

  // 日付のフォーマット関数
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch (e) {
      return dateString;
    }
  };

  // 画像ポップアップを表示
  const openImagePopup = (fileId: string) => {
    setSelectedImage(fileId);
    // スクロール防止
    document.body.style.overflow = 'hidden';
  };

  // 画像ポップアップを閉じる
  const closeImagePopup = () => {
    setSelectedImage(null);
    // スクロール再開
    document.body.style.overflow = '';
  };

  // GPS情報があれば位置情報へのリンクを生成
  const getGoogleMapsUrl = (latitude: string | null, longitude: string | null) => {
    if (latitude && longitude) {
      return `https://www.google.com/maps?q=${latitude},${longitude}`;
    }
    return null;
  };

  return (
    <div className="fixed inset-0 flex bg-white dark:bg-gray-900 duration-300">
      {/* メインコンテンツ */}
      <main className="flex-1 relative md:ml-48 bg-white dark:bg-gray-900 duration-300">
        <div className="absolute inset-0">
          <div className="h-full overflow-auto px-4 bg-white dark:bg-gray-900 duration-300 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
            <div className="max-w-md mx-auto pt-16 md:pt-20 pb-8">
              <h1 className="text-3xl font-bold mb-8 text-center text-gray-900 dark:text-white">
                Photo
              </h1>
              
              {error && (
                <div className="text-center text-red-500 dark:text-red-400 mb-6">{error}</div>
              )}
              
              <div className="space-y-12">
                {/* 写真を縦一列に表示するように変更。UIを統一する上で重要なため、二列にはしない */}
                <div className="grid grid-cols-1 gap-4 md:gap-6">
                  {files.map((file) => (
                    <div key={file.file_id} className="flex flex-col bg-white dark:bg-gray-900 rounded-lg overflow-hidden">
                      {/* 画像表示エリア - 正方形で中央表示 */}
                      <div 
                        className="aspect-square w-full relative bg-gray-100 dark:bg-gray-900 overflow-hidden cursor-pointer" 
                        onClick={() => openImagePopup(file.file_id)}
                      >
                        <Image
                          src={`${process.env.NEXT_PUBLIC_SITE_DOMAIN}/api/drive/file/${file.file_id}`}
                          alt={file.file_exif_title || file.file_id}
                          fill
                          // sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          className="object-cover"
                          priority={offset === 0} // 最初のセットのみpriorityを設定
                        />
                      </div>
                      
                      {/* EXIF情報表示エリア - コンパクトに */}
                      <div className="p-3">
                        {file.file_exif_title && (
                          <h2 className="text-md font-medium mb-1 text-gray-900 dark:text-gray-100 text-center mb-3">
                            {file.file_exif_title}
                          </h2>
                        )}

                        <div className="text-xs text-gray-600 dark:text-gray-400 space-y-0.5">
                          {/* 基本情報 */}
                          {file.file_exif_datetime && (
                            <p>
                              <span className="font-medium">撮影日時:</span> {file.file_exif_datetime ? file.file_exif_datetime.replace(/Z/, ' ').replace(/T/, ' ').replace(/\..+/, '') : ''}
                            </p>
                          )}

                          {/* カメラ情報 - コンパクトに */}
                          <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                            {file.file_exif_make && (
                              <p>
                                <span className="font-medium">メーカー:</span> {file.file_exif_make}
                              </p>
                            )}
                            {file.file_exif_model && (
                              <p>
                                <span className="font-medium">モデル:</span> {file.file_exif_model}
                              </p>
                            )}
                          </div>

                          {/* 撮影設定情報 - 重要な情報のみコンパクトに表示 */}
                          <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                            {file.file_exif_exposure_time && (
                              <p>
                                <span className="font-medium">露出:</span> {file.file_exif_exposure_time}
                              </p>
                            )}
                            {file.file_exif_fnumber && (
                              <p>
                                <span className="font-medium">F値:</span> {file.file_exif_fnumber}
                              </p>
                            )}
                            {file.file_exif_focal_length && (
                              <p>
                                <span className="font-medium">焦点距離:</span> {file.file_exif_focal_length}
                              </p>
                            )}
                          </div>

                          {/* GPS情報 - 簡略化 */}
                          {file.file_exif_public && file.file_exif_gps_public && (
                            file.file_exif_gps_latitude || file.file_exif_gps_longitude
                          ) && (
                            <div className="mt-1 pt-1">
                              {getGoogleMapsUrl(file.file_exif_gps_latitude, file.file_exif_gps_longitude) && (
                                <a 
                                  href={getGoogleMapsUrl(file.file_exif_gps_latitude, file.file_exif_gps_longitude)!} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-500 inline-flex items-center text-xs"
                                >
                                  地図で見る
                                  <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                  </svg>
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {files.length > 0 && (
                <div className="text-center mt-10">
                  {hasMore ? (
                    <button
                      onClick={loadMorePhotos}
                      disabled={loading}
                      className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50"
                    >
                      {loading ? "読み込み中..." : "もっと表示する"}
                    </button>
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400">すべての写真を表示しました</p>
                  )}
                </div>
              )}
              
              {/* 最初の読み込み時のローディング表示 */}
              {loading && files.length === 0 && (
                <div className="flex justify-center items-center h-40">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* 画像ポップアップを createPortal を使って DOM の最上位にレンダリング */}
      {selectedImage && portalContainer && createPortal(
        <div
          className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center p-4 z-[100000]"
          onClick={closeImagePopup}
        >
          <div className="max-w-5xl max-h-[90vh] w-full h-full relative">
            <Image
              src={`${process.env.NEXT_PUBLIC_SITE_DOMAIN}/api/drive/file/${selectedImage}`}
              alt="拡大画像"
              fill
              sizes="100vw"
              className="object-contain"
              priority
            />
            <button
              className="absolute top-2 right-2 bg-black bg-opacity-60 text-white rounded-full w-10 h-10 flex items-center justify-center"
              onClick={(e) => {
                e.stopPropagation();
                closeImagePopup();
              }}
            >
              ×
            </button>
          </div>
        </div>,
        portalContainer
      )}
    </div>
  );
}