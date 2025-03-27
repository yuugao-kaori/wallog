'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';

interface FileUploadProps {
  showUpload: boolean;
  onUploadComplete: () => void;
  className?: string;  // 追加
}

export default function FileUpload({ showUpload, onUploadComplete, className }: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState('');
  const [filePath, setFilePath] = useState('');
  const [exifPublic, setExifPublic] = useState(false);
  const [gpsPublic, setGpsPublic] = useState(false);
  const [fileExifTitle, setFileExifTitle] = useState(''); // file_exif_titleの状態を追加

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setMessage('');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, multiple: false });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setMessage('ファイルを選択してください。');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('file_exif_public', exifPublic.toString());
    formData.append('file_gps_public', gpsPublic.toString());
    
    // file_exif_titleをフォームデータに追加（exifPublicがtrueの場合のみ）
    if (exifPublic && fileExifTitle.trim()) {
      formData.append('file_exif_title', fileExifTitle);
    }

    try {
      const response = await axios.post(`/api/drive/file_create`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.status === 200) {
        setMessage('ファイルのアップロードが成功しました！');
        setFilePath(response.data.filePath);
        setFile(null);
        setExifPublic(false);
        setGpsPublic(false);
        setFileExifTitle(''); // 状態をリセット
        onUploadComplete();
      } else {
        setMessage('アップロードに失敗しました。');
      }
    } catch (error: any) {
      if (error.response && error.response.status === 401) {
        setMessage('ログインしていません。');
      } else {
        setMessage('アップロードに失敗しました。');
      }
    }
  };

  return (
    <div className={`p-4 ${className || ''} ${showUpload ? "block" : "hidden"}`}>
      <form onSubmit={handleSubmit} className="flex flex-col items-center w-full">
        <div
          {...getRootProps()}
          className={`w-full border-2 border-dashed p-4 mb-4 rounded cursor-pointer min-h-[100px] ${
            isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white'
          }`}
        >
          <input {...getInputProps()} />
          {isDragActive ? (
            <p className="text-blue-500 text-center text-sm">ファイルをドロップしてください...</p>
          ) : (
            <p className="text-gray-700 text-center text-sm">ここにファイルをドラッグ＆ドロップするか、クリックして選択してください。</p>
          )}
        </div>
        {file && <p className="mb-2 text-gray-700 text-sm truncate max-w-full">選択されたファイル: {file.name}</p>}
        
        <div className="w-full mb-4">
          <div className="flex items-center mb-2">
            <input
              type="checkbox"
              id="exifPublic"
              checked={exifPublic}
              onChange={(e) => setExifPublic(e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="exifPublic" className="text-sm text-gray-700">EXIFデータを公開する</label>
          </div>
          
          {/* EXIFデータを公開する場合のみタイトル入力欄を表示 */}
          {exifPublic && (
            <div className="mb-3">
              <label htmlFor="fileExifTitle" className="block text-sm text-gray-700 mb-1">画像タイトル</label>
              <input
                type="text"
                id="fileExifTitle"
                value={fileExifTitle}
                onChange={(e) => setFileExifTitle(e.target.value)}
                placeholder="画像のタイトルを入力"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="gpsPublic"
              checked={gpsPublic}
              onChange={(e) => setGpsPublic(e.target.checked)}
              disabled={!exifPublic}
              className="mr-2"
            />
            <label 
              htmlFor="gpsPublic" 
              className={`text-sm ${!exifPublic ? 'text-gray-400' : 'text-gray-700'}`}
            >
              GPS情報を公開する
            </label>
          </div>
          {exifPublic && <p className="text-xs text-gray-500 mt-1">※GPS情報を公開するにはEXIFデータの公開設定が必要です</p>}
        </div>
        
        <button type="submit" className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600">アップロード</button>
      </form>
      {message && <p className="mt-4 text-center text-green-500">{message}</p>}
      {filePath && (
        <div className="mt-4 text-center">
          <p>アップロードされたファイルのパス:</p>
          <a href={filePath} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline break-all">
            {filePath}
          </a>
        </div>
      )}
    </div>
  );
}