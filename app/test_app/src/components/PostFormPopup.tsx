'use client';

import React, { useRef, useEffect } from 'react';
import { Post } from './PostFeed';
import { 
  FileItem, 
  useHashtags, 
  useFileUpload,
  processPostText
} from './PostFormCommon';

// Define PostMode type locally since it's not exported from PostFormCommon
type PostMode = 'normal' | 'quote' | 'reply' | 'correct';

/**
 * PostFormPopupコンポーネントのプロパティ
 */
interface PostFormPopupProps {
  /** ポップアップが表示されているかどうか */
  isOpen: boolean;
  /** ポップアップを閉じる処理 */
  onClose: () => void;
  /** 投稿テキスト */
  postText: string;
  /** 投稿テキストを設定する関数 */
  setPostText: (text: string) => void;
  /** フォーム送信時の処理 */
  handleSubmit: (e: React.FormEvent, finalPostText: string) => void;
  /** 添付ファイルのリスト */
  files: FileItem[];
  /** ファイル追加時の処理 */
  handleFiles: (files: FileList | null) => void;
  /** ログイン状態 */
  isLoggedIn: boolean;
  /** 投稿状態メッセージ（エラーなど） */
  status: string;
  /** 既存ファイルを選択する処理 */
  onSelectExistingFiles: () => void;
  /** 固定ハッシュタグ（カンマ区切り） */
  fixedHashtags: string;
  /** 固定ハッシュタグを設定する関数 */
  setFixedHashtags: (tags: string) => void;
  /** ハッシュタグを自動的に投稿に追加するかどうか */
  autoAppendTags: boolean;
  /** 自動追加の設定を変更する関数 */
  setAutoAppendTags: (value: boolean) => void;
  /** リポストモードかどうか */
  repostMode?: boolean;
  /** 初期テキスト値 */
  initialText?: string;
  /** リポスト完了時のコールバック */
  onRepostComplete?: () => void;
  /** 投稿モード（通常、引用、返信、修正） */
  mode?: PostMode;
  /** 対象の投稿（引用や返信時に使用） */
  targetPost?: Post;
  /** 投稿削除処理（非推奨、handleDeleteを使用） */
  handlePostDelete?: (event: React.MouseEvent, postId: string) => Promise<boolean>;
  /** ファイルリストを設定する関数 */
  setFiles: React.Dispatch<React.SetStateAction<FileItem[]>>;
  /** ファイル添付をキャンセルする関数 */
  handleCancelAttach: (fileId: string | number) => void;
  /** ファイルを完全に削除する関数 */
  handleDeletePermanently: (fileId: string | number) => void;
  /** 投稿を削除する関数 */
  handleDelete?: (postId: string) => Promise<boolean>;
}

/**
 * 投稿作成のポップアップコンポーネント
 * 
 * 新規投稿、引用投稿、返信投稿、投稿修正などの機能を提供する
 */
const PostFormPopup: React.FC<PostFormPopupProps> = ({
  isOpen,
  onClose,
  postText,
  setPostText,
  handleSubmit,
  files,
  isLoggedIn,
  status,
  onSelectExistingFiles,
  fixedHashtags,
  setFixedHashtags,
  autoAppendTags,
  setAutoAppendTags,
  repostMode = false,
  onRepostComplete,
  mode = 'normal',
  targetPost,
  handleDelete,
  setFiles,
  handleCancelAttach,
  handleDeletePermanently,
  handleFiles,
}) => {
  // 共通ハッシュタグフック
  const hashtagsState = useHashtags(fixedHashtags);
  const {
    hashtagRanking,
    isDropdownOpen,
    setIsDropdownOpen,
    selectedHashtags,
    setSelectedHashtags,
    isLoading,
    handleHashtagSelect,
    handleHashtagChange,
    fetchHashtags,
    fetchInitialHashtags
  } = hashtagsState;

  // 共通ファイルアップロードフック
  const {
    uploadProgress,
    isUploading,
    fileInputRef,
    dropRef,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFilesWithProgress,
    handlePaste,
  } = useFileUpload(files, setFiles);

  // ハッシュタグの初期読み込み
  useEffect(() => {
    fetchInitialHashtags();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ハッシュタグランキングのフェッチ
  useEffect(() => {
    fetchHashtags();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDropdownOpen]);

  // 同期を維持するための効果
  useEffect(() => {
    setFixedHashtags(hashtagsState.fixedHashtags);
  }, [hashtagsState.fixedHashtags, setFixedHashtags]);

  useEffect(() => {
    hashtagsState.setFixedHashtags(fixedHashtags);
  }, [fixedHashtags]);

  useEffect(() => {
    hashtagsState.setAutoAppendTags(autoAppendTags);
  }, [autoAppendTags]);

  /**
   * テキストエリアでのキー入力ハンドラ
   * Shift+Enterで投稿を送信する
   * 
   * @param e - キーボードイベント
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      if (postText.trim() !== '' || files.length > 0) {
        handleFormSubmit(e as any);
      }
    }
  };

  /**
   * ファイル入力変更ハンドラ
   * 
   * @param e - 入力変更イベント
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFilesWithProgress(e.target.files);
      handleFiles(e.target.files); // 親コンポーネントにもファイルを通知
    }
  };

  /**
   * フォーム送信ハンドラ
   * 投稿の作成、修正、引用、返信などの処理を行う
   * 
   * @param e - フォームイベント
   */
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // 修正モードの場合、先に元の投稿を削除
      if (mode === 'correct') {
        if (handleDelete && targetPost) {
          const deleted = await handleDelete(targetPost.post_id);
          if (!deleted) {
            return;
          }
        }
      }

      // 共通関数を使って最終的な投稿テキストを作成
      const finalPostText = processPostText(
        postText,
        selectedHashtags,
        autoAppendTags,
        fixedHashtags
      );

      // フォームの送信を実行
      handleSubmit(e, finalPostText);

      // 成功時の状態リセット
      setPostText('');
      setFiles([]);
      setSelectedHashtags(new Set());
      setIsDropdownOpen(false);
      onClose();
      
      // リポストモードの場合はコールバックを実行
      if (repostMode && onRepostComplete) {
        onRepostComplete();
      }
    } catch (error) {
      console.error('Error in form submission:', error);
    }
  };

  // フォーカス設定（特にリポストモード時）
  useEffect(() => {
    if (isOpen && repostMode) {
      const textarea = document.querySelector('textarea');
      if (textarea) {
        textarea.focus();
        const length = textarea.value.length;
        textarea.setSelectionRange(length, length);
      }
    }
  }, [isOpen, repostMode]);

  // ポップアップが閉じられている場合は何もレンダリングしない
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-40">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-11/12 max-w-md p-6 relative max-h-[90vh] flex flex-col">
        {/* 閉じるボタン */}
        <button
          className="absolute top-2 right-2 text-gray-600 dark:text-gray-300"
          onClick={onClose}
        >
          ×
        </button>

        {/* タイトル - モードに応じて表示を変える */}
        <h2 className="text-xl font-bold mb-4">
          {mode === 'quote' ? "引用投稿" : 
           mode === 'reply' ? "返信投稿" : 
           mode === 'correct' ? "削除して再投稿" :
           "新規投稿"}
        </h2>

        {/* 引用/返信対象の投稿を表示 */}
        {targetPost && (mode === 'quote' || mode === 'reply') && (
          <div className="mb-4 p-4 bg-gray-100 dark:bg-gray-700 rounded">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {targetPost.post_text}
            </p>
          </div>
        )}

        {isLoggedIn ? (
          <form onSubmit={handleFormSubmit} className="flex flex-col h-full overflow-hidden">
            <div className="flex-1 overflow-y-auto pr-2">
              {/* 投稿テキスト入力エリア */}
              <textarea
                id="postText"
                className="w-full p-2 border rounded dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700"
                value={postText}
                onChange={(e) => setPostText(e.target.value)}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                placeholder="ここに投稿内容を入力してください"
                rows={4}
              />
              
              {/* 字数カウンター */}
              <div className="text-right text-sm text-gray-500 mt-1">
                {postText.length}/140
              </div>
              
              {/* ハッシュタグドロップダウン */}
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
                
                {/* ハッシュタグ選択ドロップダウン */}
                {isDropdownOpen && (
                  <div className="absolute z-50 mt-1 w-64 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-md shadow-lg">
                    <div className="py-1 max-h-48 overflow-y-auto">
                      {isLoading ? (
                        <div className="p-4 text-center text-gray-500">読み込み中...</div>
                      ) : (
                        hashtagRanking.map((tag) => (
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
                        ))
                      )}
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

              {/* ファイルドロップエリア */}
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
                  onChange={handleInputChange}
                />
              </div>

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

              {/* 添付ファイル一覧 */}
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
                        onClick={() => handleCancelAttach(file.id)}
                        className="absolute top-2 right-10 text-white bg-gray-500 hover:bg-gray-600 rounded-full w-6 h-6 flex items-center justify-center transition-colors"
                        title="添付を取り消す"
                      >
                        -
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePermanently(file.id)}
                        className="absolute top-2 right-2 text-white bg-red-500 hover:bg-red-600 rounded-full w-6 h-6 flex items-center justify-center transition-colors"
                        title="ファイルを削除する"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* ハッシュタグとオプション設定 */}
              <div className="mt-4 space-y-2">
                <input
                  type="text"
                  value={fixedHashtags}
                  onChange={(e) => {
                    handleHashtagChange(e);
                    setFixedHashtags(e.target.value);
                  }}
                  className="w-full p-2 border rounded dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700"
                  placeholder="ハッシュタグの固定"
                />
                <div className="flex items-center">
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

              {/* 既存ファイル選択ボタン */}
              <div className="mt-4">
                <button
                  type="button"
                  onClick={onSelectExistingFiles}
                  className="w-full p-2 text-white bg-blue-500 hover:bg-blue-600 rounded transition-colors dark:bg-blue-600 dark:hover:bg-blue-700"
                >
                  アップロード済みファイルから選択
                </button>
              </div>
            </div>

            {/* 投稿ボタン */}
            <div className="mt-4 pt-4 border-t sticky bottom-0 bg-white dark:bg-gray-800">
              <button
                type="submit"
                className={`w-full p-2 text-white rounded transition-colors ${
                  (postText.trim() === '' && files.length === 0) || isUploading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-500 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-800'
                }`}
                disabled={(postText.trim() === '' && files.length === 0) || isUploading}
              >
                {isUploading ? 'アップロード中...' : '投稿'}
              </button>
              {status && <p className="mt-2 text-red-500">{status}</p>}
            </div>
          </form>
        ) : (
          <p className="text-gray-500">投稿を作成するにはログインしてください</p>
        )}
      </div>
    </div>
  );
};

export default PostFormPopup;