import React, { useRef, ChangeEvent, DragEvent, useEffect, useCallback, useState } from 'react';

interface HashtagRank {
  post_tag_id: number;
  post_tag_text: string;
  use_count: number;
}

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
  handleSubmit: (e: React.FormEvent, finalText?: string) => void;  // 引数を追加
  files: FileItem[];
  handleFiles: (files: FileList | null) => void;
  handleDelete: (fileId: number) => void;
  onSelectExistingFiles: () => void;
  fixedHashtags: string;
  setFixedHashtags: (tags: string) => void;
  autoAppendTags: boolean;  // 追加
  setAutoAppendTags: (value: boolean) => void;  // 追加
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
  setFixedHashtags,
  autoAppendTags,  // 追加
  setAutoAppendTags  // 追加
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const updateTimeoutRef = useRef<NodeJS.Timeout>();

  const [hashtagRanking, setHashtagRanking] = useState<HashtagRank[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedHashtags, setSelectedHashtags] = useState<Set<string>>(new Set());

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
      handleFiles(e.dataTransfer.files); // ファイルの追加処理
      e.dataTransfer.clearData();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      if (postText.trim() !== '' || files.length > 0) {
        handleFormSubmit(e as any);
      }
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let finalText = postText.trim();
    let additionalTags = [];

    // 選択されたタグを配列に追加
    if (selectedHashtags.size > 0) {
      additionalTags.push(Array.from(selectedHashtags).join(' '));
    }

    // 固定タグを配列に追加
    if (autoAppendTags && fixedHashtags.trim()) {
      const processedTags = fixedHashtags
        .trim()
        .split(/\s+/)
        .map(tag => tag.startsWith('#') ? tag : `#${tag}`)
        .join(' ');
      additionalTags.push(processedTags);
    }

    // タグがある場合は本文に追加
    if (additionalTags.length > 0) {
      if (finalText) {
        finalText += '\n'; // 本文がある場合は改行を追加
      }
      finalText += additionalTags.join('\n');
    }

    if (finalText.trim() || files.length > 0) {
      handleSubmit(e, finalText);
      // 投稿後に選択されたタグをクリア
      setSelectedHashtags(new Set());
      setIsDropdownOpen(false);
    }
  };

  // ハッシュタグランキングの取得
  useEffect(() => {
    const fetchHashtags = async () => {
      try {
        const response = await fetch('/api/hashtag/hashtag_rank');
        if (!response.ok) throw new Error('Failed to fetch hashtags');
        const data = await response.json();
        setHashtagRanking(data);
      } catch (error) {
        console.error('Error fetching hashtag ranking:', error);
      }
    };
    fetchHashtags();
  }, []);

  // ハッシュタグの選択処理
  const handleHashtagSelect = (tagText: string) => {
    setSelectedHashtags(prev => {
      const next = new Set(prev);
      const tag = tagText.startsWith('#') ? tagText : `#${tagText}`;
      if (next.has(tag)) {
        next.delete(tag);
      } else {
        next.add(tag);
      }
      return next;
    });
  };

  // ハッシュタグの初期読み込み
  useEffect(() => {
    const fetchAutoHashtags = async () => {
      try {
        const response = await fetch('/api/user/user_read');
        if (!response.ok) throw new Error('Failed to fetch hashtags');
        const data = await response.json();
        if (data.user_auto_hashtag) {
          setFixedHashtags(data.user_auto_hashtag.join(' '));
        }
      } catch (error) {
        console.error('Error fetching hashtags:', error);
      }
    };
    fetchAutoHashtags();
  }, []);

  // ハッシュタグの自動保存（デバウンス処理付き）
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

  const handleHashtagChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setFixedHashtags(newValue);

    // 既存のタイマーをクリア
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    // 新しいタイマーをセット（15秒後に更新）
    updateTimeoutRef.current = setTimeout(() => {
      updateAutoHashtags(newValue);
    }, 15000);
  };

  // コンポーネントのクリーンアップ時にタイマーをクリア
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);


  return (
    <div>
      <h2 className="text-xl font-bold mb-4  mt-2 dark:text-white">新規投稿</h2>

      <form onSubmit={handleFormSubmit} className="mt-2">
        <div className="relative">
          <textarea
            value={postText}
            onChange={(e) => setPostText(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full p-2 border rounded dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700"
            placeholder="ここに投稿内容を入力してください"
            rows={4}
          />
          
          {/* ハッシュタグドロッ��ダウン */}
          <div className="relative mt-2">
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded flex items-center gap-2"
            >
              <span>人気のハッシュタグ</span>
              {selectedHashtags.size > 0 && (
                <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {selectedHashtags.size}
                </span>
              )}
            </button>
            
            {isDropdownOpen && (
              <div className="absolute z-10 mt-1 w-64 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-md shadow-lg">
                <div className="py-1 max-h-48 overflow-y-auto">
                  {hashtagRanking.map((tag) => (
                    <button
                      key={tag.post_tag_id}
                      type="button"
                      onClick={() => handleHashtagSelect(tag.post_tag_text)}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex justify-between items-center ${
                        selectedHashtags.has(tag.post_tag_text) ? 'bg-blue-50 dark:bg-blue-900' : ''
                      }`}
                    >
                      <span>{tag.post_tag_text}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">({tag.use_count})</span>
                        {selectedHashtags.has(tag.post_tag_text) && (
                          <span className="text-blue-500 text-sm">✓</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 選択されたタグの表示 */}
          {selectedHashtags.size > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {Array.from(selectedHashtags).map(tag => (
                <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-sm rounded">
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleHashtagSelect(tag)}
                    className="text-blue-500 hover:text-blue-700"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
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
                  onClick={(e) => {
                    e.preventDefault(); // フォームの送信を防ぐ
                    e.stopPropagation(); // イベントの伝播を停止
                    handleDelete(file.id);
                  }}
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
          <div className="mt-2 space-y-2">  {/* space-y-2 を追加 */}
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
        </div>
        <div className="mt-4 border-t pt-4">
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
        </div>
      </form>
    </div>
  );
};

export default React.memo(PostForm);
