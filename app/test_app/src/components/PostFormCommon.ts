import { useState, useRef, useEffect, useCallback } from 'react';

/**
 * 投稿モードの種類を定義
 * - normal: 通常の新規投稿
 * - quote: 他の投稿を引用する投稿
 * - reply: 他の投稿への返信
 * - correct: 投稿を削除して再投稿（修正）
 */
export type PostMode = 'normal' | 'quote' | 'reply' | 'correct';

/**
 * ファイルアイテムの型定義
 */
export interface FileItem {
  /** ファイルのID（サーバー上でのユニークID） */
  id: string | number;
  /** ファイル名 */
  name?: string;
  /** ファイルサイズ（バイト） */
  size?: number;
  /** ファイルのMIMEタイプ */
  contentType?: string;
  /** 画像ファイルかどうか */
  isImage: boolean;
  /** ファイルが既存のものか新規アップロードかを示すフラグ */
  isExisting?: boolean;
}

/**
 * ハッシュタグの型定義
 */
export interface HashtagItem {
  /** ハッシュタグのID */
  post_tag_id: string;
  /** ハッシュタグのテキスト */
  post_tag_text: string;
  /** 使用回数 */
  use_count: number;
}

/**
 * ハッシュタグ管理のためのカスタムフック
 * 
 * @param initialTags - 初期ハッシュタグ（カンマ区切り文字列）
 * @returns ハッシュタグ関連の状態と操作関数
 */
export function useHashtags(initialTags: string) {
  // 人気ハッシュタグのランキング
  const [hashtagRanking, setHashtagRanking] = useState<HashtagItem[]>([]);
  // ドロップダウンの開閉状態
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  // 選択されたハッシュタグの集合
  const [selectedHashtags, setSelectedHashtags] = useState<Set<string>>(
    new Set(initialTags.split(',').filter(tag => tag.trim() !== ''))
  );
  // ロード中の状態
  const [isLoading, setIsLoading] = useState(false);

  /**
   * ハッシュタグをトグル選択する
   * @param tag - 選択/解除するハッシュタグ
   */
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

  /**
   * フォームからの入力でハッシュタグを変更する
   * @param e - 入力イベント
   */
  const handleHashtagChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const tags = e.target.value.split(',').map(tag => tag.trim()).filter(Boolean);
    setSelectedHashtags(new Set(tags));
  }, []);

  // タグのランキングを取得する副作用
  useEffect(() => {
    if (isDropdownOpen) {
      setIsLoading(true);
      fetch('/api/hashtag/hashtag_ranking')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setHashtagRanking(data);
          }
        })
        .catch(err => console.error('Failed to fetch hashtags:', err))
        .finally(() => setIsLoading(false));
    }
  }, [isDropdownOpen]);

  return {
    hashtagRanking,
    isDropdownOpen,
    setIsDropdownOpen,
    selectedHashtags,
    setSelectedHashtags,
    isLoading,
    handleHashtagSelect,
    handleHashtagChange,
  };
}

/**
 * ファイルアップロード管理のためのカスタムフック
 * 
 * @param files - 現在のファイル一覧
 * @param setFiles - ファイル一覧を更新する関数
 * @returns ファイルアップロード関連の状態と操作関数
 */
export function useFileUpload(
  files: FileItem[],
  setFiles: React.Dispatch<React.SetStateAction<FileItem[]>>
) {
  // アップロード進捗を記録するオブジェクト
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  // アップロード中かどうか
  const [isUploading, setIsUploading] = useState(false);
  // ファイル選択用input要素への参照
  const fileInputRef = useRef<HTMLInputElement>(null);
  // ドラッグ&ドロップ領域への参照
  const dropRef = useRef<HTMLDivElement>(null);

  /**
   * ドラッグオーバーイベントのハンドラ
   * @param e - ドラッグオーバーイベント
   */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (dropRef.current) {
      dropRef.current.classList.add('bg-gray-100', 'dark:bg-gray-700');
    }
  }, []);

  /**
   * ドラッグリーブイベントのハンドラ
   * @param e - ドラッグリーブイベント
   */
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (dropRef.current) {
      dropRef.current.classList.remove('bg-gray-100', 'dark:bg-gray-700');
    }
  }, []);

  /**
   * ドロップイベントのハンドラ
   * @param e - ドロップイベント
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
   * ペーストイベントのハンドラ
   * @param e - クリップボードイベント
   */
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === 'file') {
        const file = items[i].getAsFile();
        if (file) files.push(file);
      }
    }

    if (files.length > 0) {
      e.preventDefault(); // テキストエリアへのペーストを防止
      handleFilesWithProgress(files);
    }
  }, []);

  /**
   * ファイルをアップロードし進捗を表示する
   * @param fileList - アップロードするファイルのリスト
   */
  const handleFilesWithProgress = useCallback(async (fileList: FileList | File[]) => {
    setIsUploading(true);
    const newProgress: { [key: string]: number } = {};
    
    // 各ファイルについて処理
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      newProgress[file.name] = 0;
      
      try {
        const formData = new FormData();
        formData.append('file', file);
        
        // プログレスを監視するためのカスタムXHRを作成
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/drive/file_create');
        
        // アップロード進捗イベント
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(prev => ({
              ...prev,
              [file.name]: percentComplete
            }));
          }
        });
        
        // 完了イベント
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
        
        // レスポンスからファイル情報を取得
        if (response && response.id) {
          setFiles(prev => [
            ...prev, 
            {
              id: response.id,
              name: file.name,
              size: file.size,
              contentType: file.type,
              isImage: file.type.startsWith('image/')
            }
          ]);
        }
      } catch (error) {
        console.error(`Error uploading file ${file.name}:`, error);
        setUploadProgress(prev => ({
          ...prev,
          [file.name]: -1 // エラーを示す値
        }));
      }
    }
    
    setIsUploading(false);
  }, [setFiles]);

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
  };
}

/**
 * 投稿テキストを処理し、必要に応じてハッシュタグを追加する
 * 
 * @param postText - 元の投稿テキスト
 * @param selectedHashtags - 選択されたハッシュタグのセット
 * @param autoAppendTags - 自動追加するかどうか
 * @param fixedHashtags - 固定ハッシュタグ（カンマ区切り文字列）
 * @returns 処理された最終的な投稿テキスト
 */
export function processPostText(
  postText: string,
  selectedHashtags: Set<string>,
  autoAppendTags: boolean,
  fixedHashtags: string
): string {
  // 自動追加設定がONかつ、タグが選択されているか固定タグがある場合のみ
  if (autoAppendTags && (selectedHashtags.size > 0 || fixedHashtags.trim().length > 0)) {
    const tagSet = new Set<string>();
    
    // 選択されたタグを追加
    selectedHashtags.forEach(tag => {
      const cleanTag = tag.trim().replace(/^#/, '');
      if (cleanTag) tagSet.add(cleanTag);
    });
    
    // 固定タグを追加
    if (fixedHashtags.trim()) {
      fixedHashtags.split(',').forEach(tag => {
        const cleanTag = tag.trim().replace(/^#/, '');
        if (cleanTag) tagSet.add(cleanTag);
      });
    }
    
    // タグがあれば投稿テキストに追加
    if (tagSet.size > 0) {
      const tagPart = Array.from(tagSet).map(tag => `#${tag}`).join(' ');
      // 投稿テキストが空でなければ改行を追加
      return postText.trim() ? `${postText.trim()}\n\n${tagPart}` : tagPart;
    }
  }
  
  return postText;
}
