import React, { useRef, ChangeEvent, DragEvent } from 'react';

interface FileItem {
  id: number;
  url: string;
  isImage: boolean;
  contentType?: string;
  isExisting?: boolean;  // 追加: 既存ファイルかどうかのフラグ
}

interface PostFormProps {
  postText: string;
  setPostText: (text: string) => void;
  handleSubmit: (e: React.FormEvent) => void;
  files: FileItem[];
  handleFiles: (files: FileList | null) => void;
  handleDelete: (fileId: number) => void;
  onSelectExistingFiles: () => void;
  fixedHashtags: string;
  setFixedHashtags: (tags: string) => void;
}

const PostForm: React.FC<PostFormProps> = ({
  postText,
  setPostText,
  handleSubmit,
  files,
  handleFiles,
  handleDelete,
  onSelectExistingFiles,
  fixedHashtags,
  setFixedHashtags
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
        e.preventDefault();
        if (postText.trim() !== '' || files.length > 0) {
          handleSubmit(e as any);
        }
      } else {
        // 通常のEnterは改行を許可（textareaの場合）
        if (e.currentTarget.tagName.toLowerCase() !== 'textarea') {
          e.preventDefault();
        }
      }
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // ハッシュタグが存在する場合、本文の末尾に追加
    if (fixedHashtags.trim()) {
      // スペースで分割し、#が付いていない場合は追加
      const processedTags = fixedHashtags
        .trim()
        .split(/\s+/)
        .map(tag => tag.startsWith('#') ? tag : `#${tag}`)
        .join(' ');
      
      const updatedText = `${postText}\n${processedTags}`;
      setPostText(updatedText);
      // 状態の更新を待ってから送信
      await new Promise(resolve => setTimeout(resolve, 0));
      handleSubmit(e);
    } else {
      handleSubmit(e);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold mt-2 mb-2 dark:text-white">新規投稿</h2>

      {/* 既存の投稿フォーム */}
      <form onSubmit={handleFormSubmit} className="mt-2">
        <textarea
          value={postText}
          onChange={(e) => setPostText(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full p-2 border rounded dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700"
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
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
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
        <div className="mt-4">
          <button
            type="button"
            onClick={onSelectExistingFiles}
            className="w-full p-2 text-white bg-blue-500 hover:bg-blue-600 rounded transition-colors dark:bg-blue-600 dark:hover:bg-blue-700"
          >
            アップロード済みファイルから選択
          </button>
          <div className="mt-2">
            <input
              type="text"
              value={fixedHashtags}
              onChange={(e) => setFixedHashtags(e.target.value)}
              className="w-full p-2 border rounded dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700"
              placeholder="ハッシュタグの固定"
            />
          </div>
        </div>
      </form>

      <div className="mt-4 border-t pt-4">
        <form onSubmit={handleFormSubmit} className="space-y-2">
          <button
            type="submit"
            className={`w-full p-2 text-white rounded transition-colors ${
              postText.trim() === '' && files.length === 0
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-500 hover:bg-green-600'
            }`}
            disabled={postText.trim() === '' && files.length === 0}
          >
            投稿
          </button>
        </form>
      </div>
    </div>
  );
};

export default React.memo(PostForm);
