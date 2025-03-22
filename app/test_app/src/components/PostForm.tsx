import React, { useEffect, useCallback } from 'react';
import { 
  FileItem, 
  useHashtags, 
  useFileUpload,
  processPostText,
  FilePreview,
  HashtagSelector,
  usePostText // 新たに追加したフックをインポート
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
  // usePostTextフックを使用して投稿テキストを管理
  const postTextState = usePostText(''); // 初期値を空文字列にし、親から初期設定する

  // 親コンポーネントとテキスト状態を同期する - 初回とpostTextの変更時のみ実行
  useEffect(() => {
    // 初回マウント時または親からの値が変更された場合のみ実行
    if (postTextState.postText !== postText) {
      // 親コンポーネントからの変更時はusePostTextの状態を更新（保存なし）
      postTextState.setPostTextWithoutSave(postText);
    }
  }, [postText]); // postTextStateは依存配列から除外

  // usePostTextの状態が変更された時のみ親へ通知
  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    const newValue = e.target.value;
    // 親コンポーネントに通知
    setPostText(newValue);
    // usePostText内の状態も更新（デバウンスされた保存を含む）
    postTextState.handlePostTextChange(e);
  }, [setPostText, postTextState.handlePostTextChange]);

  // 共通ハッシュタグフック - 親コンポーネントから受け取った値を初期値として使用
  const hashtagsState = useHashtags(fixedHashtags, autoAppendTags);

  // 親から渡された値が変更された時に再設定するuseEffect
  useEffect(() => {
    if (fixedHashtags !== hashtagsState.fixedHashtags) {
      hashtagsState.setFixedHashtags(fixedHashtags);
    }
    
    if (autoAppendTags !== hashtagsState.autoAppendTags) {
      hashtagsState.setAutoAppendTags(autoAppendTags);
    }
  }, [fixedHashtags, autoAppendTags, hashtagsState]);

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
    
    // 自動保存用のデバウンスタイマー
    if (hashtagsState.saveUserHashtags) {
      // 既存のタイマーをクリア
      if (window.hashtagSaveTimer) {
        clearTimeout(window.hashtagSaveTimer);
      }
      
      // 1秒後に保存処理を実行
      window.hashtagSaveTimer = setTimeout(() => {
        hashtagsState.saveUserHashtags()
          .then(success => {
            if (success) {
              console.log('Fixed hashtags saved successfully');
            }
          })
          .catch(error => {
            console.error('Failed to save hashtags:', error);
          });
      }, 1000);
    }
  }, [setFixedHashtags, hashtagsState.saveUserHashtags]);

  // 自動付与設定の変更をハンドリング（カスタムフックから親コンポーネントへ）
  const handleAutoAppendTagsChange = useCallback((value: boolean) => {
    setAutoAppendTags(value); // 親コンポーネントの状態を更新
    
    // 自動保存処理
    if (hashtagsState.saveUserHashtags) {
      // 既存のタイマーをクリア
      if (window.hashtagAutoSaveTimer) {
        clearTimeout(window.hashtagAutoSaveTimer);
      }
      
      // 切り替えは即時保存
      window.hashtagAutoSaveTimer = setTimeout(() => {
        hashtagsState.saveUserHashtags()
          .then(success => {
            if (success) {
              console.log('Auto append setting saved successfully');
            }
          })
          .catch(error => {
            console.error('Failed to save auto append setting:', error);
          });
      }, 100);
    }
  }, [setAutoAppendTags, hashtagsState.saveUserHashtags]);

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
      if (postTextState.postText.trim() !== '' || files.length > 0) {
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
    const finalText = processPostText(postTextState.postText, selectedHashtags, autoAppendTags, fixedHashtags);
    
    handleSubmit(e, finalText);
    
    // 投稿後に選択されたタグをクリア
    setSelectedHashtags(new Set());
    setIsDropdownOpen(false);
    
    // 投稿後にテキストをクリア - 親コンポーネントに空文字を設定
    setPostText('');
    // usePostText内部の状態もリセット
    postTextState.setPostTextWithoutSave('');
  };

  return (
    <div className="flex flex-col h-full pb-12">
      <form onSubmit={handleFormSubmit} className="flex flex-col flex-1 overflow-y-auto pr-2 scrollbar-hide" id="postForm">
        <div className="flex-1 pb-32">
          <div className="relative">
            <textarea
              value={postTextState.postText}
              onChange={handleTextChange} // ここを修正：handlePostTextChangeではなくhandleTextChangeを使用
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              className="w-full p-2 border rounded dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700"
              placeholder="ここに投稿内容を入力してください"
              rows={4}
            />
            {/* 字数カウンター */}
            <div className="text-right text-sm text-gray-500 mt-1">
              {postTextState.postText.length}/140
            </div>

            <HashtagSelector
              hashtagsState={hashtagsState}
              fixedHashtags={fixedHashtags}
              autoAppendTags={autoAppendTags}
              onFixedHashtagsChange={handleFixedHashtagsChange}
              onAutoAppendChange={handleAutoAppendTagsChange}
            />

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
        </div>
      </form>
      {/* 投稿ボタン */}
      <div className="mt-1 pt-1 border-t sticky bottom-0 bg-white dark:bg-gray-800">
        <button
          type="submit"
          form="postForm"
          className={`w-full p-2 text-white rounded transition-colors ${
            (postTextState.postText.trim() === '' && files.length === 0) || isUploading
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-green-500 hover:bg-green-600'
          }`}
          disabled={(postTextState.postText.trim() === '' && files.length === 0) || isUploading}
        >
          {isUploading ? 'アップロード中...' : '投稿'}
        </button>
      </div>
    </div>
  );
};

export default React.memo(PostForm);