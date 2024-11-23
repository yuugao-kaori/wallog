'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { FaUpload } from 'react-icons/fa';
import DriveCard from '@/components/DriveCard';
import FileUpload from '@/components/FileUpload';

interface File {
  file_id: string;
  file_size: number;
  file_createat: string;
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

export default function DrivePage() {
  const [files, setFiles] = useState<File[]>([]);
  const [limit, setLimit] = useState(10);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showUpload, setShowUpload] = useState(false);

  const router = useRouter();

  // useEffect内でのみfetchFilesを定義して使用
  useEffect(() => {
    const fetchFiles = async () => {
      setLoading(true);
      try {
        const response = await axios.get<ApiResponse>(`/api/drive/file_list?limit=${limit}&offset=${offset}`);
        setFiles(response.data.files || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching files:', err);
        setError('Failed to fetch files');
        setFiles([]);
      } finally {
        setLoading(false);
      }
    };

    fetchFiles();
  }, [limit, offset]);

  // FileUploadコンポーネントのonUploadComplete用の関数
  const handleUploadComplete = useCallback(() => {
    // 現在のlimitとoffsetで再フェッチをトリガー
    setOffset(currentOffset => currentOffset);  // これによりuseEffectが再実行される
  }, []);

  const handleDeleteClick = (file_id: string) => {
    setSelectedFileId(file_id);
    setIsModalOpen(true);
  };

  const handleEditClick = (file_id: string) => {
    router.push(`/drive/edit/${file_id}`);
  };

  const handleCopyUrl = async (file_id: string) => {
    try {
      if (!process.env.NEXT_PUBLIC_SITE_DOMAIN) {
        throw new Error('Site domain is not configured');
      }
  
      // 末尾のスラッシュを除去してクリーンなURLを作成
      const baseUrl = process.env.NEXT_PUBLIC_SITE_DOMAIN.replace(/\/+$/, '');
      const fileUrl = `${baseUrl}/api/drive/files/${file_id}`;
  
      await navigator.clipboard.writeText(fileUrl);
    } catch (err) {
      console.error('URLのコピーに失敗しました:', err);
    }
  };

  return (
    <div className="flex min-h-screen bg-white dark:bg-gray-900">
      {/* メインコンテンツ */}
      <main className="flex-1 min-h-screen md:pl-64">
        <div className="h-screen max-w-4xl mx-auto px-4 py-4 md:pr-[320px] overflow-y-auto scrollbar-hide">
          {loading ? (
            <div className="text-center text-gray-500 dark:text-gray-400">Loading...</div>
          ) : error ? (
            <div className="text-center text-red-500 dark:text-red-400">{error}</div>
          ) : files.length > 0 ? (
            files.map(file => (
              <div className="mb-4" key={file.file_id}>
                <DriveCard 
                  file={file} 
                  handleDeleteClick={handleDeleteClick}
                  handleEditClick={handleEditClick}
                  handleCopyUrl={handleCopyUrl}
                />
              </div>
            ))
          ) : (
            <div className="text-center text-gray-500 dark:text-gray-400">
              ファイルがありません
            </div>
          )}
        </div>
      </main>

      {/* デスクトップ用アップロードフォーム */}
      <aside className="hidden md:block fixed right-0 top-0 w-[300px] h-full bg-white dark:bg-gray-900 border-l dark:border-gray-800 z-20">
        <div className="p-4 h-full overflow-y-auto">
          <h2 className="text-xl font-bold mb-2 dark:text-white">ファイルのアップロード</h2>
          <FileUpload 
            showUpload={true} 
            onUploadComplete={handleUploadComplete}
            className="w-full"
          />
        </div>
      </aside>

      {/* モバイル用フローティングボタン */}
      <button 
        onClick={() => setShowUpload(!showUpload)} 
        className="md:hidden fixed bottom-20 right-4 bg-blue-500 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg z-30"
      >
        <FaUpload size={24} />
      </button>

      {/* モバイル用モーダル */}
      {showUpload && (
        <div className="md:hidden fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-40">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-11/12 max-w-md p-6 relative">
            <button
              className="absolute top-2 right-2 text-gray-600 dark:text-gray-300"
              onClick={() => setShowUpload(false)}
            >
              ×
            </button>
            <h2 className="text-xl font-bold mb-4 dark:text-white">ファイルのアップロード</h2>
            <FileUpload 
              showUpload={true} 
              onUploadComplete={() => {
                handleUploadComplete();
                setShowUpload(false);
              }}
              className="w-full"
            />
          </div>
        </div>
      )}
    </div>
  );
}
