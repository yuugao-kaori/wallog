'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Post } from './PostFeed';
import { 
  FileItem, 
  useHashtags, 
  useFileUpload,
  processPostText,
  FilePreview,
  cleanFileId,
  isImageFile,
  HashtagSelector,
  usePostText // 新たに追加したフックをインポート
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
  handleSubmit: (
    e: React.FormEvent, 
    finalPostText: string, 
    targetPostId?: string, 
    mode?: PostMode, 
    files?: FileItem[],
    originalRepostId?: string, // 追加: 元の引用投稿ID
    originalReplyId?: string   // 追加: 元の返信投稿ID
  ) => void;
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
  // usePostTextフックを使用 - 空文字列で初期化し、ローカルストレージから優先読み込み
  const postTextState = usePostText('');
  
  // 親コンポーネントのテキスト状態と同期するが、無限ループを避ける
  const [isInitialSync, setIsInitialSync] = useState(true);
  
  // ファイル選択関連の状態
  const [hasLoadedFiles, setHasLoadedFiles] = useState(false);
  const [showFileSelector, setShowFileSelector] = useState(false);
  const [driveFiles, setDriveFiles] = useState<any[]>([]);
  
  // ローカルストレージからテキストを読み込んだかどうかのフラグ
  const [hasLoadedFromLocalStorage, setHasLoadedFromLocalStorage] = useState(false);

  // 初回マウント時にローカルストレージからデータをロード
  useEffect(() => {
    if (isOpen && !hasLoadedFromLocalStorage) {
      // ローカルストレージからデータを読み込む
      postTextState.loadPostText().then((loadedText: string | null) => {
        if (loadedText) {
          console.log('Loaded text from localStorage in PostFormPopup:', loadedText);
          // 読み込んだテキストで親の状態も更新
          setPostText(loadedText);
        }
        setHasLoadedFromLocalStorage(true);
      }).catch((error: Error) => {
        console.error('Failed to load text from localStorage:', error);
        setHasLoadedFromLocalStorage(true); // エラー時もロード完了とマーク
      });
    }
    
    // ポップアップが表示された時に確実にisPostedフラグがリセットされるようにする
    if (isOpen) {
      // 既にスケジュールされている保存処理を確実に実行するため、即座に保存を試みる
      if (postTextState.postText.trim() !== '') {
        console.log('Popup opened, forcing immediate save of any pending text');
        postTextState.savePostText()
          .catch((error: Error): void => {
            console.error('Failed to save text on popup open:', error);
          });
      }
    }
  }, [isOpen, postTextState, setPostText, hasLoadedFromLocalStorage]);

  // ポップアップが閉じられる時の処理を分離
  useEffect(() => {
    // ポップアップが開いている状態から閉じられる時
    if (!isOpen && hasLoadedFromLocalStorage) {
      // 未保存の変更があれば確実に保存
      if (postTextState.postText.trim() !== '') {
        console.log('Popup closing - saving changes to localStorage');
        postTextState.savePostText()
          .then((): void => {
            console.log('Successfully saved text before popup close');
            // 保存完了後にフラグをリセット
            setHasLoadedFromLocalStorage(false);
          })
          .catch((error: Error): void => {
            console.error('Failed to save text before popup close:', error);
            setHasLoadedFromLocalStorage(false);
          });
      } else {
        // 空テキストの場合はそのままリセット
        setHasLoadedFromLocalStorage(false);
      }
    }
  }, [isOpen, hasLoadedFromLocalStorage, postTextState]);

  // 親コンポーネントとテキスト状態を同期する - ローカルストレージ読み込み後のみ
  useEffect(() => {
    if (!isOpen || !hasLoadedFromLocalStorage) {
      return;
    }

    // 親からの明示的な変更がある場合のみ同期する
    if (postText !== postTextState.postText) {
      console.log('Syncing text from parent in PostFormPopup:', postText);
      postTextState.setPostTextWithoutSave(postText);
    }
    
    // 初回同期フラグをリセット
    if (isInitialSync) {
      setIsInitialSync(false);
    }
  }, [isOpen, postText, postTextState, hasLoadedFromLocalStorage, isInitialSync]);
  
  // テキスト変更を親コンポーネントへ反映するカスタムハンドラ
  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement> | React.ChangeEvent<HTMLInputElement>) => {
    const newText = e.target.value;
    
    // 親コンポーネントに通知
    setPostText(newText);
    
    // usePostText内の状態を更新（自動保存機能付き）
    postTextState.handlePostTextChange(e);
    
    // デバッグログを追加して実行を確認
    console.log('Text changed in PostFormPopup, length:', newText.length, 'empty:', newText.trim() === '');
  }, [setPostText, postTextState.handlePostTextChange]);

  // 共通ハッシュタグフック - autoInitializeSelectedをfalseに設定
  const hashtagsState = useHashtags(fixedHashtags, autoAppendTags, false);
  // selectedHashtagsとそのセッターを取得
  const { selectedHashtags, setSelectedHashtags } = hashtagsState;

  // 親から渡された値が変更された時に再設定するuseEffect
  // いくつかの重要な防御措置を追加
  useEffect(() => {
    // 初期化中や初期同期時は何もしない（無限ループ防止）
    if (isInitialSync) {
      return;
    }
    
    // 値が変わった時のみ更新（無限ループ防止のための重要な条件）
    if (fixedHashtags !== hashtagsState.fixedHashtags) {
      console.log('Sync fixedHashtags from parent to hook state:', fixedHashtags);
      hashtagsState.setFixedHashtags(fixedHashtags);
    }
    
    // 値が変わった時のみ更新（無限ループ防止のための重要な条件）
    if (autoAppendTags !== hashtagsState.autoAppendTags) {
      console.log('Sync autoAppendTags from parent to hook state:', autoAppendTags);
      // 直接設定することで無限ループを防止
      hashtagsState.setAutoAppendTags(autoAppendTags);
    }
    // 依存配列に注意：hashtagsState全体ではなく個別のプロパティを使用
  }, [fixedHashtags, autoAppendTags, isInitialSync, hashtagsState.fixedHashtags, hashtagsState.autoAppendTags, hashtagsState.setFixedHashtags, hashtagsState.setAutoAppendTags]);

  // 固定ハッシュタグの変更をハンドリング（カスタムフックから親コンポーネントへ）
  // 防御的チェックと節流措置を追加
  const handleFixedHashtagsChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // 現在の値と同じなら何もしない（無限ループ防止）
    if (value === fixedHashtags) {
      return;
    }
    
    setFixedHashtags(value);
    if (hashtagsState.saveUserHashtags) {
      if (window.hashtagSaveTimer) clearTimeout(window.hashtagSaveTimer);
      window.hashtagSaveTimer = setTimeout(() => {
        hashtagsState.saveUserHashtags();
      }, 2000); // 2秒のデバウンス時間
    }
  }, [setFixedHashtags, fixedHashtags, hashtagsState.saveUserHashtags]);

  // 自動付与設定の変更をハンドリング（カスタムフックから親コンポーネントへ）
  // 防御的チェックを追加
  const handleAutoAppendTagsChange = useCallback((value: boolean) => {
    // 現在の値と同じなら何もしない（無限ループ防止）
    if (value === autoAppendTags) {
      return;
    }
    
    setAutoAppendTags(value);
    // APIの節流（スロットリング）処理
    if (hashtagsState.saveUserHashtags) {
      if (window.hashtagAutoSaveTimer) clearTimeout(window.hashtagAutoSaveTimer);
      window.hashtagAutoSaveTimer = setTimeout(() => {
        hashtagsState.saveUserHashtags();
      }, 2000); // 2秒のデバウンス時間に延長
    }
  }, [setAutoAppendTags, autoAppendTags, hashtagsState.saveUserHashtags]);

  // 既存ファイル選択モーダル用の状態は上部で既に宣言されています

  // 既存ファイル選択用の関数
  const loadDriveFiles = useCallback(async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_DOMAIN}/api/drive/file_list`);
      if (response.ok) {
        const data = await response.json();
        setDriveFiles(data.files || []);
      } else {
        console.error('Failed to load drive files');
      }
    } catch (error) {
      console.error('Error loading drive files:', error);
    }
  }, []);

  // 既存ファイル選択ハンドラ
  const handleSelectFile = useCallback((fileId: number) => {
    try {
      const fileMetadata = driveFiles.find((file) => file.file_id === fileId);
      if (!fileMetadata) {
        console.error('File metadata not found');
        return;
      }
      
      const contentType = fileMetadata.content_type || 'application/octet-stream';
      // isImageFile関数を使用するよう修正
      const isImage = isImageFile(fileMetadata);
      
      if (!files.some(file => file.id === fileId)) {
        setFiles(prev => [...prev, { 
          id: fileId, 
          name: fileMetadata.file_name || `file-${fileId}`,
          contentType,
          isImage,
          isExisting: true
        }]);
      }
      setShowFileSelector(false);
    } catch (error) {
      console.error('Failed to select file:', error);
    }
  }, [driveFiles, files, setFiles]);

  useEffect(() => {
    if (isOpen && mode === 'correct' && targetPost && targetPost.post_file && !hasLoadedFiles) {
      const fileIds = Array.isArray(targetPost.post_file)
        ? targetPost.post_file.map(id => cleanFileId(id))
        : typeof targetPost.post_file === 'string'
          ? targetPost.post_file.split(',').map(id => cleanFileId(id.trim()))
          : [];
          
      const fetchFileMetadata = async () => {
        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_DOMAIN}/api/drive/file_list`);
          if (!response.ok) {
            console.error('Failed to fetch file metadata:', response.statusText);
            return;
          }
          
          const data = await response.json();
          console.log('File metadata response:', data);
          
          const fileItems = fileIds
            .map(fileId => {
              const cleanId = cleanFileId(fileId);
              const fileInfo = data.files.find((file: any) => 
                String(file.file_id) === String(cleanId)
              );
              
              if (fileInfo) {
                // サーバーから提供されたContent-Typeを取得
                const contentType = fileInfo.content_type || 
                  fileInfo.contentType ||
                  'application/octet-stream';
                
                // isImageFile関数を使用して画像かどうかを判定
                // ファイル情報を渡し、一貫した判定ロジックを適用
                const isImage = isImageFile(fileInfo);
                  
                console.log(`File ${cleanId}: contentType=${contentType}, isImage=${isImage}, originalContentType=${fileInfo.content_type || 'none'}`);
                
                return {
                  id: cleanId,
                  name: fileInfo.file_name || `file-${cleanId}`,
                  contentType: contentType,
                  isImage: isImage,
                  isExisting: true
                };
              }
              return null;
            })
            .filter(Boolean) as FileItem[];
            
          if (fileItems.length > 0) {
            console.log('Setting files for correct mode:', fileItems);
            setFiles(fileItems);
            setHasLoadedFiles(true);
          }
        } catch (error) {
          console.error('Failed to load file metadata:', error);
        }
      };
      
      fetchFileMetadata();
    }
    
    if (!isOpen) {
      setHasLoadedFiles(false);
      setShowFileSelector(false);
    }
  }, [isOpen, mode, targetPost, setFiles, hasLoadedFiles]);

  /**
   * テキストエリアでのキー入力ハンドラ
   * Shift+Enterで投稿を送信する
   * 
   * @param e - キーボードイベント
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      if (postTextState.postText.trim() !== '' || files.length > 0) {
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
      console.log('Files selected via input in PostFormPopup:', e.target.files);
      
      // まずアップロード自体を行う - これはuseFileUpload内で実装
      handleFilesWithProgress(e.target.files)
        .then(uploadedFiles => {
          console.log('Files processed after upload in PostFormPopup:', uploadedFiles, 'with IDs:', uploadedFiles.map(f => f.id));
          // 既にuseFileUpload内のコールバックでhandleFilesを呼び出しているため、ここでは何もしない
        })
        .catch(error => {
          console.error('Error during file upload:', error);
        });
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
      console.log('Files pasted in PostFormPopup:', fileItems);
      
      // DataTransferを使用してFileListを作成
      const dataTransfer = new DataTransfer();
      fileItems.forEach(file => dataTransfer.items.add(file));
      const fileList = dataTransfer.files;
      
      // useFileUploadフックを使ってアップロード処理を行う
      handleFilesWithProgress(fileList)
        .then(uploadedFiles => {
          console.log('Pasted files processed after upload:', uploadedFiles, 'with IDs:', uploadedFiles.map(f => f.id));
          // コールバックがあれば追加呼び出しは不要（useFileUpload内で実行される）
        })
        .catch(error => {
          console.error('Error processing pasted files:', error);
        });
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
      if (!handleDelete) {
        console.error('handleDelete function is not provided');
        return;
      }
      
      if (!targetPost) {
        console.error('targetPost is not provided');
        return;
      }
      
      // 元投稿のrepost_grant_idとreply_grant_idを保持
      const originalRepostId = targetPost.repost_grant_id;
      const originalReplyId = targetPost.reply_grant_id;
      
      // デバッグログを追加 - フルオブジェクト情報も出力
      console.log('Correct mode - original post:', {
        post_id: targetPost.post_id,
        repost_id: originalRepostId,
        reply_id: originalReplyId,
        has_repost_body: !!targetPost.repost_body,
        has_reply_body: !!targetPost.reply_body,
        fullPost: targetPost
      });
      
      console.log('Attempting to delete post:', targetPost.post_id);
      const deleted = await handleDelete(targetPost.post_id);
      
      if (!deleted) {
        console.error('Failed to delete post');
        return;
      }
      
      console.log('Post successfully deleted, proceeding with repost');
      
      // 最終的な投稿テキストを作成
      // 選択されたハッシュタグは常に追加し、固定ハッシュタグは自動付与設定がONの場合のみ追加
      const finalPostText = processPostText(
        postTextState.postText,
        hashtagsState.selectedHashtags, // hashtagsStateから参照
        autoAppendTags,
        fixedHashtags
      );

      // 全てのファイルIDをクリーニング
      const cleanFiles = files.map(file => ({
        ...file,
        id: cleanFileId(file.id)
      }));
      
      // ファイルIDをクリーニングしてからsetFilesに渡す
      setFiles(cleanFiles);

      // デバッグログ追加
      console.log('Submitting post with:', {
        mode,
        targetPostId: targetPost?.post_id,
        originalRepostId,
        originalReplyId,
        finalPostText,
        files: cleanFiles,
        selectedHashtags: Array.from(hashtagsState.selectedHashtags), // hashtagsStateから参照
        fixedHashtags,
        autoAppendTags
      });
      
      // handleSubmit を呼び出し（引数にクリーニング済みファイル配列とrepost_id、reply_idを追加）
      await handleSubmit(
        e, 
        finalPostText, 
        targetPost?.post_id, 
        mode, 
        cleanFiles, 
        originalRepostId, 
        originalReplyId
      );
      
      // 投稿完了をフックに通知（重要）
      postTextState.markAsPosted();
      console.log('Post submitted - marked as posted');
      
      // 成功時の状態リセット
      postTextState.setPostTextWithoutSave('');
      // 親のsetPostTextも呼び出して同期を維持
      setPostText('');
      setFiles([]);
      hashtagsState.setSelectedHashtags(new Set()); // hashtagsStateから参照
      hashtagsState.setIsDropdownOpen(false); // hashtagsStateから参照
      onClose();
      
      // リポストモードの場合はコールバックを実行
      if (repostMode && onRepostComplete) {
        onRepostComplete();
      }
      
      return;
    }

    // 修正モード以外の処理（既存のコード）
    // 最終的な投稿テキストを作成
    const finalPostText = processPostText(
      postTextState.postText,
      hashtagsState.selectedHashtags, // hashtagsStateから参照
      autoAppendTags,
      fixedHashtags
    );

    // 全てのファイルIDをクリーニング
    const cleanFiles = files.map(file => ({
      ...file,
      id: cleanFileId(file.id)
    }));
    
    // ファイルIDをクリーニングしてからsetFilesに渡す
    setFiles(cleanFiles);

    // デバッグログ追加
    console.log('Submitting post with:', {
      mode,
      targetPostId: targetPost?.post_id,
      finalPostText,
      files: cleanFiles,
      selectedHashtags: Array.from(hashtagsState.selectedHashtags), // hashtagsStateから参照
      fixedHashtags,
      autoAppendTags
    });
    
    // handleSubmit を呼び出し（引数にクリーニング済みファイル配列を追加）
    await handleSubmit(e, finalPostText, targetPost?.post_id, mode, cleanFiles);
    
    // 投稿完了をフックに通知（重要）
    postTextState.markAsPosted();
    console.log('Post submitted - marked as posted');
    
    // 成功時の状態リセット - setPostTextWithSaveをsetPostTextWithoutSaveに変更
    postTextState.setPostTextWithoutSave('');
    // 親のsetPostTextも呼び出して同期を維持
    setPostText('');
    setFiles([]);
    hashtagsState.setSelectedHashtags(new Set()); // hashtagsStateから参照
    hashtagsState.setIsDropdownOpen(false); // hashtagsStateから参照
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

  // 既存ファイル選択のハンドラーを拡張
  const handleSelectExistingFilesWrapper = useCallback(() => {
    setShowFileSelector(true);
    loadDriveFiles();
  }, [loadDriveFiles]);

  // 共通ファイルアップロードフック
  const {
    uploadProgress,
    isUploading,
    fileInputRef,
    dropRef, // ここでdropRefを受け取る
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFilesWithProgress,
    handlePaste: handlePasteInternal
  } = useFileUpload(files, setFiles);

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
              {/* 投稿テキスト入力エリア - カスタムハンドラを使用 */}
              <textarea
                id="postText"
                className="w-full p-2 border rounded dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700"
                value={postTextState.postText}
                onChange={handleTextChange} // カスタムハンドラを使用
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                placeholder="ここに投稿内容を入力してください"
                rows={4}
              />
              
              {/* 字数カウンター */}
              <div className="text-right text-sm text-gray-500 mt-1">
                {postTextState.postText.length}/140
              </div>
              
              {/* ハッシュタグドロップダウン */}
              <HashtagSelector
                hashtagsState={hashtagsState}
                fixedHashtags={fixedHashtags}
                autoAppendTags={autoAppendTags}
                onFixedHashtagsChange={handleFixedHashtagsChange}
                onAutoAppendChange={handleAutoAppendTagsChange}
              />

              {/* ファイルドロップエリア */}
              <div
                ref={dropRef} // ここでdropRefを使用
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

              {/* 既存ファイル選択ボタン */}
              <div className="mt-4">
                <button
                  type="button"
                  onClick={handleSelectExistingFilesWrapper}
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
                  (postTextState.postText.trim() === '' && files.length === 0) || isUploading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-500 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-800'
                }`}
                disabled={(postTextState.postText.trim() === '' && files.length === 0) || isUploading}
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

      {/* 既存ファイル選択モーダル - ファイルプレビューもFilePreviewコンポーネントを使用 */}
      {showFileSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-11/12 max-w-2xl p-6 relative max-h-[80vh] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
            <button
              className="absolute top-4 right-4 text-gray-600 dark:text-gray-300"
              onClick={() => setShowFileSelector(false)}
            >
              ×
            </button>
            <h2 className="text-xl font-bold mb-4 dark:text-white">ファイルを選択（試験）</h2>
            {driveFiles.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {driveFiles.map((file) => {
                  // ファイルがイメージかどうか判定
                  const fileItem: FileItem = {
                    id: file.file_id,
                    name: file.file_name || `file-${file.file_id}`,
                    contentType: file.content_type || 'application/octet-stream',
                    isImage: isImageFile(file)
                  };
                  
                  return (
                    <div
                      key={file.file_id}
                      className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                      onClick={() => handleSelectFile(file.file_id)}
                    >
                      <FilePreview
                        file={fileItem}
                        showActions={false}
                        className="border-0"
                      />
                      <div className="text-sm truncate mt-1 dark:text-gray-300 p-2">
                        <div className="font-medium">{file.file_name || `ファイル ${file.file_id}`}</div>
                        <div className="text-xs text-gray-500">ID: {file.file_id}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-center text-gray-500 dark:text-gray-400">ファイルが見つかりません</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PostFormPopup;

