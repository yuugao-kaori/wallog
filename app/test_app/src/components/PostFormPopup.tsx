'use client';

import React, { useRef } from 'react';
import { FileItem } from '@/types/index';

interface PostFormPopupProps {
  isOpen: boolean;
  onClose: () => void;
  postText: string;
  setPostText: (text: string) => void;
  handleSubmit: (e: React.FormEvent) => void;
  files: FileItem[];
  handleFiles: (files: FileList | null) => void;
  handleDelete: (fileId: number) => void;
  isLoggedIn: boolean;
  status: string;
  onSelectExistingFiles: () => void;  // 追加
}

const PostFormPopup = ({
  isOpen,
  onClose,
  postText,
  setPostText,
  handleSubmit,
  files,
  handleFiles,
  handleDelete,
  isLoggedIn,
  status,
  onSelectExistingFiles  // 追加
}: PostFormPopupProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (dropRef.current) {
      dropRef.current.classList.add('drag-over');
    }
  };

  const handleDragLeave = () => {
    if (dropRef.current) {
      dropRef.current.classList.remove('drag-over');
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (dropRef.current) {
      dropRef.current.classList.remove('drag-over');
    }
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
      e.dataTransfer.clearData();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-40">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-11/12 max-w-md p-6 relative">
        <button
          className="absolute top-2 right-2 text-gray-600 dark:text-gray-300"
          onClick={onClose}
        >
          ×
        </button>
        <h2 className="text-xl font-bold mb-4">新規投稿</h2>
        {isLoggedIn ? (
          <form onSubmit={handleSubmit} className="mt-2">
            <textarea
              className="w-full p-2 border rounded dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700"
              value={postText}
              onChange={(e) => setPostText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="ここに投稿内容を入力してください"
              rows={4}
            />
            <div
              ref={dropRef}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className="mt-2 p-4 border-dashed border-2 border-gray-400 rounded text-center cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              ファイルをドラッグ＆ドロップするか、クリックして選択
              <input
                type="file"
                multiple
                ref={fileInputRef}
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
            </div>
            {files.length > 0 && (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {files.map((file) => (
                  <div key={file.id} className="border rounded p-2 relative bg-white dark:bg-gray-800">
                    <div className="w-full aspect-[4/3] mb-2 bg-gray-100 dark:bg-gray-700 relative overflow-hidden">
                      {file.isImage ? (
                        <img
                          src={`${process.env.NEXT_PUBLIC_SITE_DOMAIN}/api/drive/file/${file.id}`}
                          alt={`File ${file.id}`}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            target.parentElement!.innerHTML = '<span class="text-gray-500">読み込みエラー</span>';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-2xl text-gray-500">
                            {file.contentType ? file.contentType.split('/')[1].toUpperCase() : 'ファイル'}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="text-sm truncate dark:text-gray-300">
                      ファイルID: {file.id}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(file.id)}
                      className={`absolute top-2 right-2 text-white rounded-full w-6 h-6 flex items-center justify-center transition-colors ${
                        file.isExisting 
                          ? 'bg-gray-500 hover:bg-gray-600' 
                          : 'bg-red-500 hover:bg-red-600'
                      }`}
                      title={file.isExisting ? "添付を取り消す" : "ファイルを削除する"}
                    >
                      {file.isExisting ? '−' : '×'}
                    </button>
                  </div>
                ))}
              </div>
            )}
            {/* ファイル選択ボタンを追加 */}
            <div className="mt-4 mb-6">  {/* mb-6 を追加 */}
              <button
                type="button"
                onClick={onSelectExistingFiles}
                className="w-full p-2 text-white bg-blue-500 hover:bg-blue-600 rounded transition-colors dark:bg-blue-600 dark:hover:bg-blue-700"
              >
                アップロード済みファイルから選択
              </button>
            </div>
            <button
              type="submit"
              className={`w-full p-2 text-white rounded transition-colors ${
                postText.trim() === '' && files.length === 0
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-800'
              }`}
              disabled={postText.trim() === '' && files.length === 0}
            >
              投稿
            </button>
            {status && <p className="mt-4 text-red-500">{status}</p>}
          </form>
        ) : (
          <p className="text-gray-500">投稿を作成するにはログインしてください。</p>
        )}
      </div>
    </div>
  );
};

export default PostFormPopup;