import React, { useState, useRef } from 'react';
import { Post } from './PostFeed';

interface FileUploadProgress {
  [key: string]: number;
}

interface PostFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: Post;
  type: 'quote' | 'reply';
  onSubmit: (text: string, type: 'quote' | 'reply', targetPostId: string) => Promise<void>;
}

const PostFormModal: React.FC<PostFormModalProps> = ({
  isOpen,
  onClose,
  post,
  type,
  onSubmit
}) => {
  const [postText, setPostText] = useState('');
  const [uploadProgress, setUploadProgress] = useState<FileUploadProgress>({});
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isUploading) return; // アップロード中は投稿を防止

    await onSubmit(postText, type, post.post_id);
    setPostText('');
    onClose();
  };

  // ファイルアップロード機能を追加する場合は以下のようなハンドラを実装
  const handleFilesWithProgress = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    
    setIsUploading(true);
    
    // ファイルごとに進捗初期化
    const newProgress: FileUploadProgress = {};
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      newProgress[file.name] = 0;
    }
    setUploadProgress(prev => ({ ...prev, ...newProgress }));
    
    // 各ファイルのアップロード
    Array.from(fileList).forEach(file => {
      const formData = new FormData();
      formData.append('file', file);
      
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(prev => ({
            ...prev,
            [file.name]: percentComplete
          }));
        }
      });
      
      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          try {
            const response = JSON.parse(xhr.responseText);
            if (response.file_id) {
              // ファイルアップロード成功時の処理
              setUploadProgress(prev => ({
                ...prev,
                [file.name]: 100
              }));
              
              setTimeout(() => {
                setUploadProgress(prev => {
                  const updatedProgress = { ...prev };
                  delete updatedProgress[file.name];
                  return updatedProgress;
                });
              }, 1000);
            }
          } catch (error) {
            console.error('Error parsing response:', error);
          }
        } else {
          console.error('Upload failed with status:', xhr.status);
          setUploadProgress(prev => ({
            ...prev,
            [file.name]: -1
          }));
        }
        
        setTimeout(() => {
          setIsUploading(Object.keys(uploadProgress).length > 0);
        }, 500);
      });
      
      xhr.addEventListener('error', () => {
        console.error('Upload error occurred');
        setUploadProgress(prev => ({
          ...prev,
          [file.name]: -1
        }));
        
        setTimeout(() => {
          setIsUploading(Object.keys(uploadProgress).length > 0);
        }, 500);
      });
      
      xhr.open('POST', '/api/drive/file_create');
      xhr.send(formData);
    });
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50"
      onClick={onClose}
      style={{ position: 'fixed', overflow: 'auto' }}
    >
      <div
        className="w-full max-w-3xl mx-auto p-4 bg-white dark:bg-gray-800 rounded-lg"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold mb-4">
          {type === 'quote' ? '引用投稿' : '返信投稿'}
        </h2>
        <div className="mb-4 p-4 bg-gray-100 dark:bg-gray-700 rounded">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {post.post_text}
          </p>
        </div>
        <form onSubmit={handleSubmit}>
          <textarea
            value={postText}
            onChange={(e) => setPostText(e.target.value)}
            className="w-full h-32 p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
            placeholder={type === 'quote' ? '引用コメントを入力...' : '返信を入力...'}
          />
          
          {/* ファイルアップロード機能を追加する場合はここに実装 */}
          {/* 
          <div className="mt-4 p-3 border-dashed border-2 border-gray-300 text-center cursor-pointer rounded" onClick={() => fileInputRef.current?.click()}>
            画像を添付する
            <input 
              type="file" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={(e) => handleFilesWithProgress(e.target.files)} 
              multiple
              accept="image/*"
            />
          </div>
          */}
          
          {/* アップロード進捗表示 */}
          {isUploading && Object.keys(uploadProgress).length > 0 && (
            <div className="mt-4 space-y-2">
              <h3 className="font-medium text-sm">アップロード中...</h3>
              {Object.entries(uploadProgress).map(([fileName, progress]) => (
                <div key={fileName} className="flex flex-col">
                  <div className="flex justify-between text-xs">
                    <span className="truncate max-w-[75%]">{fileName}</span>
                    <span>{progress < 0 ? 'エラー' : `${progress}%`}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1">
                    <div 
                      className={`h-2.5 rounded-full ${progress < 0 ? 'bg-red-500' : 'bg-blue-500'}`}
                      style={{ width: `${progress < 0 ? 100 : progress}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <div className="flex justify-end mt-4">
            <button
              type="button"
              onClick={onClose}
              className="mr-2 px-4 py-2 text-gray-600 bg-gray-200 rounded hover:bg-gray-300"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className={`px-4 py-2 text-white rounded ${
                isUploading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'
              }`}
              disabled={isUploading}
            >
              {isUploading ? 'アップロード中...' : '投稿'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PostFormModal;
