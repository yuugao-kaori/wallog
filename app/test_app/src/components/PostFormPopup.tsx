'use client';

import React, { useRef, useCallback, useEffect } from 'react';
import { FileItem } from '@/types/index';

interface PostFormPopupProps {
  isOpen: boolean;
  onClose: () => void;
  postText: string;
  setPostText: (text: string) => void;
  handleSubmit: (e: React.FormEvent, finalPostText: string) => void;
  files: FileItem[];
  handleFiles: (files: FileList | null) => void;
  handleDelete: (fileId: number) => void;
  isLoggedIn: boolean;
  status: string;
  onSelectExistingFiles: () => void;
  fixedHashtags: string;
  setFixedHashtags: (tags: string) => void;
  autoAppendTags: boolean;  // 追加
  setAutoAppendTags: (value: boolean) => void;  // 追加
  repostMode?: boolean;  // 追加
  initialText?: string;  // 追加
}

const PostFormPopup: React.FC<PostFormPopupProps> = ({
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
  onSelectExistingFiles,
  fixedHashtags,
  setFixedHashtags,
  autoAppendTags = false,  // デフォルト値を false に変更
  setAutoAppendTags,
  repostMode = false,
}) => {
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
      if (postText.trim() !== '' || files.length > 0) {
        handleFormSubmit(e as any);
      }
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let finalPostText = postText;
    
    if (autoAppendTags && fixedHashtags.trim()) {  // autoAppendTags を追加
      const processedTags = fixedHashtags
        .trim()
        .split(/\s+/)
        .map(tag => tag.startsWith('#') ? tag : `#${tag}`)
        .join(' ');
      
      finalPostText = `${postText}\n${processedTags}`;
    }
    
    handleSubmit(e, finalPostText);
  };

  const updateTimeoutRef = useRef<NodeJS.Timeout>();

  const updateAutoHashtags = useCallback(async (tags: string) => {
    try {
      const tagsArray = tags.trim().split(/\s+/).filter(tag => tag);
      await fetch('/api/user/user_update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_auto_hashtag: tagsArray
        })
      });
    } catch (error) {
      console.error('Error updating hashtags:', error);
    }
  }, []);

  const handleHashtagChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setFixedHashtags(newValue);

    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    updateTimeoutRef.current = setTimeout(() => {
      updateAutoHashtags(newValue);
    }, 15000);
  };

  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isOpen && repostMode) {
      // フォーカスを設定
      const textarea = document.querySelector('textarea');
      if (textarea) {
        textarea.focus();
        // カーソルを末尾に移動
        const length = textarea.value.length;
        textarea.setSelectionRange(length, length);
      }
    }
  }, [isOpen, repostMode]);

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
        <h2 className="text-xl font-bold mb-4">
          {repostMode ? "投稿を再作成" : "新規投稿"}  {/* 変更 */}
        </h2>
        {isLoggedIn ? (
          <form onSubmit={handleFormSubmit} className="mt-2">
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
            <div className="mt-4 space-y-2">  {/* space-y-2 を追加 */}
              <input
                type="text"
                value={fixedHashtags}
                onChange={handleHashtagChange}
                className="w-full p-2 border rounded dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700"
                placeholder="ハッシュタグの固定"
              />
              <div className="flex items-center">  {/* ml-2 を削除し、flex を追加 */}
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={autoAppendTags}
                    onChange={(e) => setAutoAppendTags(e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    ハッシュタグを自動付与
                  </span>
                </label>
              </div>
            </div>
            <div className="mt-4 mb-6">
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
          <p className="text-gray-500">投稿を作成するにはログインしてください���</p>
        )}
      </div>
    </div>
  );
};

export default PostFormPopup;