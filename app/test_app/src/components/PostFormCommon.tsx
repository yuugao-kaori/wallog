import { useCallback, useEffect, useRef, useState } from 'react';
import React from 'react';  // Reactをインポート

/**
 * ファイルアイテムのインターフェース
 */
export interface FileItem {
  id: string | number;
  name?: string;
  size?: number;
  contentType?: string;
  isImage: boolean;
  uploadProgress?: number;
  error?: string;
}

/**
 * ハッシュタグ情報の型定義
 */
export interface HashtagInfo {
  post_tag_id: string;  // 文字列型に変更
  post_tag_text: string;
  use_count: string;    // 文字列型に変更
}

/**
 * ファイルプレビュー用コンポーネントプロパティ
 */
export interface FilePreviewProps {
  file: FileItem;
  onDelete?: (fileId: string | number) => void;
  onCancel?: (fileId: string | number) => void;
  showActions?: boolean;
  className?: string;
}

/**
 * ファイルIDをクリーニングする関数
 * JSONやクォーテーションマークなどの不要な記号を取り除く
 */
export const cleanFileId = (fileId: string | number): string | number => {
  return typeof fileId === 'string' ? fileId.replace(/[{}"\[\]]/g, '') : fileId;
};

/**
 * ファイルプレビューコンポーネント
 * 画像ファイルとその他のファイルの表示を統一的に扱う
 */
export const FilePreview: React.FC<FilePreviewProps> = ({
  file,
  onDelete,
  onCancel,

  showActions = true,
  className = '',
}) => {
  const cleanId = cleanFileId(file.id);
  const [imageError, setImageError] = useState(false);
  
  const handleImageDisplay = (fileId: string | number): string => {
    const cleanedId = cleanFileId(fileId);
    return `${process.env.NEXT_PUBLIC_SITE_DOMAIN}/api/drive/file/${cleanedId}`;
  };

  return (
    <div className={`border rounded p-2 relative bg-white dark:bg-gray-800 ${className}`}>
      <div className="w-full aspect-[4/3] mb-2 bg-gray-100 dark:bg-gray-700 relative overflow-hidden">
        {file.isImage ? (
          imageError ? (
            <div className="flex items-center justify-center w-full h-full text-gray-500">
              <span>読み込みエラー: {file.contentType || 'Unknown'}</span>
            </div>
          ) : (
            <img
              src={handleImageDisplay(file.id)}
              alt={`File ${file.id}`}
              className="w-full h-full object-contain"
              onError={(e) => {
                console.error(`Failed to load image with ID: ${file.id}`, e);
                setImageError(true);
              }}
            />
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-2xl text-gray-500">
              {file.contentType 
                ? file.contentType.split('/')[1]?.toUpperCase() || '不明なファイル'
                : 'ファイル'}
            </span>
          </div>
        )}
      </div>
      <div className="text-sm truncate dark:text-gray-300">
        ファイルID: {cleanId}
        {file.contentType && <span className="ml-2">({file.contentType})</span>}
      </div>
      
      {showActions && (
        <>
          {onCancel && (
            <button
              type="button"
              onClick={() => onCancel(file.id)}
              className="absolute top-2 right-10 text-white bg-gray-500 hover:bg-gray-600 rounded-full w-6 h-6 flex items-center justify-center transition-colors"
              title="添付を取り消す"
            >
              -
            </button>
          )}
          
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(file.id)}
              className="absolute top-2 right-2 text-white bg-red-500 hover:bg-red-600 rounded-full w-6 h-6 flex items-center justify-center transition-colors"
              title="ファイルを削除する"
            >
              ×
            </button>
          )}
        </>
      )}
    </div>
  );
};

/**
 * 投稿テキストにハッシュタグを処理して追加する
 * 
 * @param text 投稿テキスト
 * @param selectedTags 選択されたタグのセット
 * @param autoAppend 自動付与フラグ
 * @param fixedTags 固定タグ（カンマ区切り）
 * @returns 処理後のテキスト
 */
export function processPostText(
  text: string, 
  selectedTags: Set<string>, 
  autoAppend: boolean, 
  fixedTags: string
): string {
  if (!text && !selectedTags.size && !fixedTags) return '';
  
  const textWithoutTags = text.replace(/#[^\s#]+/g, '').trim();
  
  // 選択されたタグと固定タグを配列に変換
  const tagsArray = Array.from(selectedTags)
    .filter(tag => tag.trim() !== '')
    .map(tag => `#${tag.replace(/^#/, '')}`);
    
  // 固定タグを追加（カンマ区切りをスペース区切りに変換）
  const fixedTagsArray = fixedTags
    .split(',')
    .map(tag => tag.trim())
    .filter(tag => tag !== '')
    .map(tag => `#${tag.replace(/^#/, '')}`);
  
  // 選択されたタグまたは固定タグがある場合は、常にテキストに追加する
  if (selectedTags.size > 0 || fixedTagsArray.length > 0) {
    const allTags = [...new Set([...tagsArray, ...fixedTagsArray])];
    return textWithoutTags 
      ? `${textWithoutTags} ${allTags.join(' ')}`
      : allTags.join(' ');
  }
  
  return textWithoutTags || '';
}

/**
 * ハッシュタグ管理のカスタムフック
 */
export function useHashtags(initialFixedTags: string = '') {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedHashtags, setSelectedHashtags] = useState<Set<string>>(new Set());
  const [hashtagRanking, setHashtagRanking] = useState<HashtagInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [fixedHashtags, setFixedHashtags] = useState(initialFixedTags);
  const [autoAppendTags, setAutoAppendTags] = useState(false);
  const apiUrl = `${process.env.NEXT_PUBLIC_SITE_DOMAIN || ''}/api/hashtag/hashtag_rank`;

  // タグ選択の切り替え
  const handleHashtagSelect = useCallback((tag: string) => {
    // APIからのレスポンスでは "#タグ" という形式なので、
    // "#" を取り除いてストアする
    const cleanTag = tag.replace(/^#/, '');
    
    setSelectedHashtags(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cleanTag)) {
        newSet.delete(cleanTag);
      } else {
        newSet.add(cleanTag);
      }
      return newSet;
    });
  }, []);

  // 固定タグのハンドラー
  const handleHashtagChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFixedHashtags(e.target.value);
  }, []);

  // タグランキングのフェッチ
  const fetchHashtags = useCallback(async () => {
    if (!isDropdownOpen || hasLoadedOnce) return;
    
    setIsLoading(true);
    
    try {
      // ネットワークタイムアウト対策
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 10000);
      });
      
      const response = await Promise.race([
        fetch(apiUrl, { 
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }),
        timeoutPromise
      ]) as Response;
      
      if (!response.ok) {
        throw new Error(`API returned status ${response.status}`);
      }
      
      const data = await response.json();
      
      // APIレスポンスは直接配列を返すことを想定
      if (Array.isArray(data)) {
        setHashtagRanking(data);
      } else if (Array.isArray(data?.tags)) {
        // 後方互換性のため、data.tags形式もサポート
        setHashtagRanking(data.tags);
      } else {
        // データ構造が期待と異なる場合
        console.warn('Unexpected API response format:', data);
        setHashtagRanking([]);
      }
      
      setHasLoadedOnce(true);
    } catch (error) {
      console.error('Error fetching hashtag ranking:', error);
      
      // エラーメッセージをユーザーフレンドリーに
      setHashtagRanking([]);
      
      // エラーが発生してもUI更新を継続させる
    } finally {
      setIsLoading(false);
    }
  }, [apiUrl, isDropdownOpen, hasLoadedOnce]);

  // 初期タグ読み込み
  const fetchInitialHashtags = useCallback(() => {
    // 固定タグがある場合は初期選択する
    if (initialFixedTags) {
      const tags = initialFixedTags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag !== '')
        .map(tag => tag.replace(/^#/, ''));
      
      setSelectedHashtags(new Set(tags));
    }
  }, [initialFixedTags]);

  // isDropdownOpenが変更されたときにフェッチを実行
  useEffect(() => {
    if (isDropdownOpen) {
      fetchHashtags();
    }
  }, [isDropdownOpen, fetchHashtags]);

  // 初期化時にfetchInitialHashtagsを実行
  useEffect(() => {
    fetchInitialHashtags();
  }, [fetchInitialHashtags]);

  // コンポーネントがアンマウントされたかを追跡
  const isMounted = useRef(true);
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  return {
    hashtagRanking,
    isDropdownOpen,
    setIsDropdownOpen,
    selectedHashtags,
    setSelectedHashtags,
    isLoading,
    handleHashtagSelect,
    handleHashtagChange,
    fetchHashtags,
    fetchInitialHashtags,
    fixedHashtags,
    setFixedHashtags,
    autoAppendTags,
    setAutoAppendTags
  };
}

/**
 * ファイルアップロードのカスタムフック
 */
export function useFileUpload(
  files: FileItem[], 
  setFiles: React.Dispatch<React.SetStateAction<FileItem[]>>,
  onFileUploadComplete?: (files: FileItem[]) => void
) {
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  // アップロードしたファイルを保持する配列（handleFilesで使用するため）
  const [uploadedFiles, setUploadedFiles] = useState<FileItem[]>([]);

  /**
   * ドラッグオーバーイベントハンドラ
   */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (dropRef.current) {
      dropRef.current.classList.add('bg-gray-100', 'dark:bg-gray-700');
    }
  }, []);

  /**
   * ドラッグリーブイベントハンドラ
   */
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (dropRef.current) {
      dropRef.current.classList.remove('bg-gray-100', 'dark:bg-gray-700');
    }
  }, []);

  /**
   * ドロップイベントハンドラ
   */
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (dropRef.current) {
      dropRef.current.classList.remove('bg-gray-100', 'dark:bg-gray-700');
    }
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesWithProgress(e.dataTransfer.files);
    }
  }, []);

  /**
   * ペーストイベントハンドラ
   */
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
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
      const fileList = new DataTransfer();
      fileItems.forEach(file => fileList.items.add(file));
      handleFilesWithProgress(fileList.files);
    }
  }, []);

  /**
   * ファイル処理とアップロード進捗の管理
   */
  const handleFilesWithProgress = useCallback(async (fileList: FileList) => {
    setIsUploading(true);
    const newProgress: Record<string, number> = {};
    const newUploadedFiles: FileItem[] = [];
    
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      // 初期状態を設定
      newProgress[file.name] = 0;
      setUploadProgress(prev => ({
        ...prev,
        [file.name]: 0
      }));
      
      try {
        const formData = new FormData();
        formData.append('file', file);
        
        // カスタムXHRでアップロード進捗を追跡
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${process.env.NEXT_PUBLIC_SITE_DOMAIN || ''}/api/drive/file_create`);
        
        // プログレスイベントリスナー
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(prev => ({
              ...prev,
              [file.name]: percentComplete
            }));
          }
        });
        
        // レスポンスを待つ
        const response = await new Promise<any>((resolve, reject) => {
          xhr.onload = function() {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                resolve(JSON.parse(xhr.responseText));
              } catch (e) {
                reject(new Error('Invalid JSON response'));
              }
            } else {
              reject(new Error(`HTTP Error: ${xhr.status}`));
            }
          };
          
          xhr.onerror = () => reject(new Error('Network Error'));
          xhr.send(formData);
        });
        
        console.log('File upload response:', response);
        
        // 修正: response.id ではなく response.file_id を使用する
        if (response && response.file_id) {
          const fileItem = {
            id: response.file_id,  // file_id を正しく使用
            name: file.name,
            size: file.size,
            contentType: file.type,
            isImage: file.type.startsWith('image/')
          };
          
          newUploadedFiles.push(fileItem);
          
          setFiles(prev => [
            ...prev,
            fileItem
          ]);
          
          // 進捗表示を削除（成功）
          setTimeout(() => {
            setUploadProgress(prev => {
              const updated = { ...prev };
              delete updated[file.name];
              return updated;
            });
          }, 500);
        } else {
          console.error('Missing file_id in response:', response);
          setUploadProgress(prev => ({
            ...prev,
            [file.name]: -1 // エラー表示
          }));
        }
      } catch (error) {
        console.error(`Error uploading file ${file.name}:`, error);
        setUploadProgress(prev => ({
          ...prev,
          [file.name]: -1 // エラー表示
        }));
      }
    }
    
    // アップロードしたファイルを状態に保存
    setUploadedFiles(prev => [...prev, ...newUploadedFiles]);
    
    // コールバックがあれば呼び出す
    if (onFileUploadComplete && newUploadedFiles.length > 0) {
      onFileUploadComplete(newUploadedFiles);
    }
    
    // すべてのファイルの処理が終わったら、アップロード完了
    setIsUploading(false);
    
    return newUploadedFiles;
  }, [setFiles, onFileUploadComplete]);

  return {
    uploadProgress,
    isUploading,
    fileInputRef,
    dropRef,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFilesWithProgress,
    handlePaste,
    uploadedFiles
  };
}

/**
 * ファイルがイメージかどうかを判断する関数
 * 拡張子やContent-Typeを使って判定する
 * 
 * @param file ファイルメタデータ
 * @returns イメージファイルかどうか
 */
export const isImageFile = (file: {content_type?: string, file_name?: string, file_id?: string | number}): boolean => {
  // 1. content_typeプロパティを確認
  console.log('file:', file,);
  if (file.content_type && file.content_type.startsWith('image/')) {
    return true;
  }
  
  // 画像系拡張子リスト
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'avif', 'heif', 'heic'];
  
  // 2. file_nameから拡張子で判定
  if (file.file_name) {
    const ext = file.file_name.split('.').pop()?.toLowerCase();
    if (ext && imageExtensions.includes(ext)) {
      return true;
    }
  }
  
  // 3. file_idに拡張子が含まれている場合
  if (typeof file.file_id === 'string') {
    const ext = file.file_id.split('.').pop()?.toLowerCase();
    if (ext && imageExtensions.includes(ext)) {
      return true;
    }
  }
  
  return false;
};
