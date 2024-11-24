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

    try {
      const response = await axios.post(`/api/drive/file_create`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.status === 200) {
        setMessage('ファイルのアップロードが成功しました！');
        setFilePath(response.data.filePath);
        setFile(null);
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
    <div className={`fixed bottom-0 right-0 md:right-0 md:bottom-auto md:relative p-4 min-w-[250px] ${showUpload ? "block" : "hidden"} md:block shadow-lg rounded-lg ${className || ''}`}>
      <form onSubmit={handleSubmit} className="flex flex-col items-center">
        <div
          {...getRootProps()}
          className={`w-full border-2 border-dashed p-4 mb-4 rounded cursor-pointer min-h-[100px] ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white'}`}
        >
          <input {...getInputProps()} />
          {isDragActive ? (
            <p className="text-blue-500 text-center text-sm">ファイルをドロップしてください...</p>
          ) : (
            <p className="text-gray-700 text-center text-sm">ここにファイルをドラッグ＆ドロップするか、クリックして選択してください。</p>
          )}
        </div>
        {file && <p className="mb-2 text-gray-700 text-sm truncate max-w-full">選択されたファイル: {file.name}</p>}
        <button type="submit" className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600">アップロード</button>
      </form>

      {message && <p className="mt-4 text-center text-green-500">{message}</p>}
      {filePath && (
        <div className="mt-4 text-center">
          <p>アップロードされたファイルのパス:</p>
          <a href={filePath} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">
            {filePath}
          </a>
        </div>
      )}
    </div>
  );
}