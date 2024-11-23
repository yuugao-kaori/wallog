import React, { useRef, ChangeEvent, DragEvent } from 'react';

interface FileItem {
  id: number;
  url: string;
  isImage: boolean;
}

interface PostFormProps {
  postText: string;
  setPostText: (text: string) => void;
  handleSubmit: (e: React.FormEvent) => void;
  files: FileItem[];
  handleFiles: (files: FileList | null) => void;
  handleDelete: (fileId: number) => void;
}

const PostForm: React.FC<PostFormProps> = ({
  postText,
  setPostText,
  handleSubmit,
  files,
  handleFiles,
  handleDelete
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dropRef.current?.classList.add('drag-over');
  };

  const handleDragLeave = () => {
    dropRef.current?.classList.remove('drag-over');
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dropRef.current?.classList.remove('drag-over');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
      e.dataTransfer.clearData();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        // Shift+Enterで送信
        e.preventDefault();
        handleSubmit(e as any);
      } else {
        // 通常のEnterは改行を許可（textareaの場合）
        if (e.currentTarget.tagName.toLowerCase() !== 'textarea') {
          e.preventDefault();
        }
      }
    }
  };

  return (
    <div>
      {/* 既存の投稿フォーム */}
      <form onSubmit={handleSubmit} className="mt-2">
        <textarea
          value={postText}
          onChange={(e) => setPostText(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full p-2 border rounded dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700"
          placeholder="ここに投稿内容を入力してください"
          rows={6}  // 4から6に変更
        />
        {/* ...existing form content... */}
      </form>

      <div className="mt-4 border-t pt-4">
        <form onSubmit={handleSubmit} className="space-y-2">
          <button
            type="submit"
            className="w-full p-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
            disabled={!postText.trim()}
          >
            投稿
          </button>
        </form>
      </div>
    </div>
  );
};

export default React.memo(PostForm);
