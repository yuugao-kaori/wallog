import { useCallback, useEffect, useRef, useState } from 'react';

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
  
  // 自動付与フラグがオンの場合はタグを追加
  if (autoAppend) {
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
    setSelectedHashtags(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tag)) {
        newSet.delete(tag);
      } else {
        newSet.add(tag);
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
  setFiles: React.Dispatch<React.SetStateAction<FileItem[]>>
) {
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

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
  const handleFilesWithProgress = useCallback((fileList: FileList) => {
    setIsUploading(true);
    const newProgress: Record<string, number> = {};
    
    Array.from(fileList).forEach(file => {
      // モックアップロード進捗 - 実際の実装ではここでファイルをアップロードする
      newProgress[file.name] = 0;
      
      // ファイル分析とサムネイル生成
      const isImage = file.type.startsWith('image/');
      const reader = new FileReader();
      
      reader.onload = () => {
        // プログレスバーのアニメーション
        let progress = 0;
        const interval = setInterval(() => {
          progress += Math.random() * 15;
          if (progress >= 100) {
            progress = 100;
            clearInterval(interval);
            
            // アップロード完了後の処理
            setTimeout(() => {
              setUploadProgress(prev => {
                const updated = { ...prev };
                delete updated[file.name];
                return updated;
              });
              
              if (Object.keys(newProgress).length === 1) {
                setIsUploading(false);
              }
            }, 500);
          }
          
          setUploadProgress(prev => ({
            ...prev,
            [file.name]: Math.min(Math.round(progress), 100)
          }));
        }, 200);
      };
      
      reader.onerror = () => {
        setUploadProgress(prev => ({
          ...prev,
          [file.name]: -1 // エラー状態
        }));
      };
      
      // 読み込み開始
      reader.readAsDataURL(file);
    });
    
    // 初期進捗状態を設定
    setUploadProgress(prev => ({ ...prev, ...newProgress }));
  }, []);

  return {
    uploadProgress,
    isUploading,
    fileInputRef,
    dropRef,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFilesWithProgress,
    handlePaste
  };
}
