import React, { useEffect, useCallback } from 'react';
import { 
  FileItem, 
  useHashtags, 
  useFileUpload,
  processPostText,
  FilePreview
} from './PostFormCommon';

/**
 * 投稿フォームコンポーネントのプロパティ
 * @interface PostFormProps
 * @property {string} postText - 投稿テキスト
 * @property {function} setPostText - 投稿テキストを設定する関数
 * @property {function} handleSubmit - フォーム送信ハンドラ
 * @property {FileItem[]} files - 添付ファイル配列
 * @property {function} setFiles - ファイル配列を更新する関数
 * @property {function} handleFiles - ファイル選択時の処理関数
 * @property {function} handleDelete - ファイル削除処理関数（API呼び出し）
 * @property {function} onSelectExistingFiles - 既存ファイル選択モーダルを表示する関数
 * @property {string} fixedHashtags - 固定ハッシュタグ（カンマ区切り）
 * @property {function} setFixedHashtags - 固定ハッシュタグを設定する関数
 * @property {boolean} autoAppendTags - ハッシュタグ自動付与フラグ
 * @property {function} setAutoAppendTags - 自動付与フラグを設定する関数
 * @property {function} handleCancelAttach - ファイル添付取り消し関数
 * @property {function} handleDeletePermanently - ファイル完全削除関数
 */
interface PostFormProps {
  postText: string;
  setPostText: (text: string) => void;
  handleSubmit: (e: React.FormEvent, finalText?: string) => void;
  files: FileItem[];
  setFiles: React.Dispatch<React.SetStateAction<FileItem[]>>;
  handleFiles: (files: FileList | null) => void;
  handleDelete: (fileId: number | string) => Promise<boolean>;
  onSelectExistingFiles: () => void;
  fixedHashtags: string;
  setFixedHashtags: (tags: string) => void;
  autoAppendTags: boolean;
  setAutoAppendTags: (value: boolean) => void;
  handleCancelAttach: (fileId: string | number) => void;
  handleDeletePermanently: (fileId: string | number) => void;
}

/**
 * 投稿フォームコンポーネント
 * テキスト入力、ファイルアップロード、ハッシュタグ選択機能を提供する
 *
 * @param {PostFormProps} props - コンポーネントプロパティ
 * @returns {React.FC} 投稿フォームのレンダリング結果
 */
const PostForm: React.FC<PostFormProps> = ({
  postText,
  setPostText,
  handleSubmit,
  files,
  setFiles,
  handleFiles,
  onSelectExistingFiles,
  fixedHashtags,
  setFixedHashtags,
  autoAppendTags,
  setAutoAppendTags,
  handleCancelAttach,
  handleDeletePermanently,
}) => {
  // 共通ハッシュタグフック - 親コンポーネントから受け取った値を初期値として使用
  const hashtagsState = useHashtags(fixedHashtags, autoAppendTags);
  // hashtagsStateから必要な値と関数を取得
  const {
    hashtagRanking,
    isDropdownOpen,
    setIsDropdownOpen,
    selectedHashtags,
    setSelectedHashtags,
    isLoading,
    handleHashtagSelect,
    handleHashtagChange
  } = hashtagsState;

  // 固定ハッシュタグの変更をハンドリング（カスタムフックから親コンポーネントへ）
  const handleFixedHashtagsChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFixedHashtags(value); // 親コンポーネントの状態を更新
  }, [setFixedHashtags]);

  // 自動付与設定の変更をハンドリング（カスタムフックから親コンポーネントへ）
  const handleAutoAppendTagsChange = useCallback((value: boolean) => {
    setAutoAppendTags(value); // 親コンポーネントの状態を更新
  }, [setAutoAppendTags]);

  // ファイルアップロード完了時のコールバック
  const onFileUploadComplete = React.useCallback((uploadedFiles: FileItem[]) => {
    console.log('File upload completed in PostForm with files:', uploadedFiles);
    
    // FileListを作成して親のhandleFilesを呼び出す
    if (uploadedFiles.length > 0 && handleFiles) {
      // DataTransferを使用してFileListを作成
      const dataTransfer = new DataTransfer();
      // ダミーファイルを作成
      uploadedFiles.forEach(fileItem => {
        const dummyFile = new File([""], fileItem.name || "file", { 
          type: fileItem.contentType || "application/octet-stream" 
        });
        dataTransfer.items.add(dummyFile);
      });
      
      // 親コンポーネントにファイル選択を通知
      handleFiles(dataTransfer.files);
      console.log('Notified parent component about files in PostForm:', dataTransfer.files);
    } else {
      console.log('No files to notify parent about or handleFiles is undefined');
    }
  }, [handleFiles]);

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
    handlePaste: handlePasteInternal
  } = useFileUpload(files, setFiles, onFileUploadComplete);

  /**
   * テキスト入力時のキーハンドラ
   * Shift + Enterで投稿送信を行う
   * 
   * @param {React.KeyboardEvent} e - キーボードイベント
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      if (postText.trim() !== '' || files.length > 0) {
        handleFormSubmit(e as any);
      }
    }
  };

  /**
   * クリップボードからファイルがペーストされた場合の処理
   */
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    
    const fileItems: File[] = [];
    
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === 'file') {
        const file = items[i].getAsFile();
        if (file) fileItems.push(file);
      }
    }
    
    if (fileItems.length > 0) {
      e.preventDefault();
      console.log('Files pasted in PostForm:', fileItems);
      
      // DataTransferオブジェクトを作成してFileListを生成
      const dataTransfer = new DataTransfer();
      fileItems.forEach(file => dataTransfer.items.add(file));
      const fileList = dataTransfer.files;
      
      // アップロード処理を行う
      handleFilesWithProgress(fileList)
        .then(uploadedFiles => {
          console.log('Pasted files processed in PostForm:', uploadedFiles);
          // コールバックはuseFileUpload内で呼ばれるので、ここでの追加処理は不要
        })
        .catch(error => {
          console.error('Error processing pasted files in PostForm:', error);
        });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      console.log('Files selected in PostForm input:', e.target.files);
      
      // アップロード処理を行う
      handleFilesWithProgress(e.target.files)
        .then(uploadedFiles => {
          console.log('Files processed after upload in PostForm:', uploadedFiles);
          // コールバックはuseFileUpload内で呼ばれるので、ここでの追加処理は不要
        })
        .catch(error => {
          console.error('Error during file upload in PostForm:', error);
        });
    }
  };

  /**
   * フォーム送信処理
   * テキストとハッシュタグを結合してから親コンポーネントの送信ハンドラを呼び出す
   * 
   * @param {React.FormEvent} e - フォーム送信イベント
   */
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 共通関数を使用してテキスト処理
    const finalText = processPostText(postText, selectedHashtags, autoAppendTags, fixedHashtags);
    
    handleSubmit(e, finalText);
    
    // 投稿後に選択されたタグをクリア
    setSelectedHashtags(new Set());
    setIsDropdownOpen(false);
  };

  return (
    <div className="flex flex-col h-full pb-12">
      <form onSubmit={handleFormSubmit} className="flex flex-col flex-1 overflow-y-auto pr-2 scrollbar-hide" id="postForm">
        <div className="flex-1 pb-32">
          <div className="relative">
            <textarea
              value={postText}
              onChange={(e) => setPostText(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              className="w-full p-2 border rounded dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700"
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

              {isDropdownOpen && (
                <div className="absolute z-10 mt-1 w-64 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-md shadow-lg">
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
                            selectedHashtags.has(tag.post_tag_text.replace(/^#/, '')) ? 'bg-blue-50 dark:bg-blue-900' : ''
                          }`}
                        >
                          <span>{tag.post_tag_text}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">({tag.use_count})</span>
                            {selectedHashtags.has(tag.post_tag_text.replace(/^#/, '')) && (
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
                    #{tag}
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
              onChange={handleInputChange}
            />
          </div>

          {/* 添付ファイル一覧 - FilePreviewコンポーネントを使用 */}
          {files.length > 0 && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {files.map((file) => (
                <FilePreview
                  key={file.id}
                  file={file}
                  onCancel={handleCancelAttach}
                  onDelete={handleDeletePermanently}
                />
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={onSelectExistingFiles}
            className="w-full p-2 text-white bg-blue-500 hover:bg-blue-600 rounded transition-colors dark:bg-blue-600 dark:hover:bg-blue-700 mt-4"
          >
            アップロード済みファイルから選択
          </button>

          <div className="mt-2 space-y-2">
            <input
              type="text"
              value={fixedHashtags}
              onChange={handleFixedHashtagsChange}
              className="w-full p-2 border rounded dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700"
              placeholder="ハッシュタグの固定"
            />
            <div className="flex items-center">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={autoAppendTags}
                  onChange={(e) => handleAutoAppendTagsChange(e.target.checked)}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  ハッシュタグを自動付与
                </span>
              </label>
            </div>
          </div>
        </div>
      </form>
      {/* 投稿ボタン */}
      <div className="mt-1 pt-1 border-t sticky bottom-0 bg-white dark:bg-gray-800">
        <button
          type="submit"
          form="postForm"
          className={`w-full p-2 text-white rounded transition-colors ${
            (postText.trim() === '' && files.length === 0) || isUploading
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-green-500 hover:bg-green-600'
          }`}
          disabled={(postText.trim() === '' && files.length === 0) || isUploading}
        >
          {isUploading ? 'アップロード中...' : '投稿'}
        </button>
      </div>
    </div>
  );
};

export default React.memo(PostForm);