import { useCallback, useEffect, useRef, useState } from 'react';
import React from 'react';  // Reactをインポート

/**
 * 投稿モードの種類を定義
 * - normal: 通常の新規投稿
 * - quote: 他の投稿を引用する投稿
 * - reply: 他の投稿への返信
 * - correct: 投稿を削除して再投稿（修正）
 */
export type PostMode = 'normal' | 'quote' | 'reply' | 'correct';

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
  isExisting?: boolean;
}

/**
 * ハッシュタグ情報の型定義
 * 投稿タグ情報を表すインターフェース（サーバーから返却される形式）
 */
export interface HashtagInfo {
  post_tag_id: string;  // タグの一意識別子
  post_tag_text: string; // タグテキスト（"#タグ名"形式）
  use_count: string;    // 使用回数（文字列形式）
}

/**
 * ユーザー設定のインターフェース
 * サーバーから取得するユーザー設定データ
 */
export interface UserSettings {
  user_id: string;
  user_hashtag: string[];
  user_auto_hashtag: string[];
  user_prof?: string;
  user_icon?: string;
}

/**
 * ハッシュタグ管理の戻り値インターフェース
 */
export interface HashtagsState {
  /** 人気ハッシュタグランキング配列 */
  hashtagRanking: HashtagInfo[];
  /** ドロップダウンの表示状態 */
  isDropdownOpen: boolean;
  /** ドロップダウンの表示状態を設定する関数 */
  setIsDropdownOpen: (isOpen: boolean) => void;
  /** 選択されたハッシュタグのセット */
  selectedHashtags: Set<string>;
  /** 選択されたハッシュタグを設定する関数 */
  setSelectedHashtags: React.Dispatch<React.SetStateAction<Set<string>>>;
  /** ハッシュタグ読み込み中フラグ */
  isLoading: boolean;
  /** ハッシュタグ選択時のハンドラ関数 */
  handleHashtagSelect: (tag: string) => void;
  /** 固定ハッシュタグ（カンマ区切り文字列） */
  fixedHashtags: string;
  /** 固定ハッシュタグを設定する関数 */
  setFixedHashtags: (tags: string) => void;
  /** ハッシュタグ自動付与フラグ */
  autoAppendTags: boolean;
  /** ハッシュタグ自動付与フラグを設定する関数 */
  setAutoAppendTags: (value: boolean) => void;
  /** 投稿テキストを処理する関数（ハッシュタグを追加） */
  processPostText: (text: string) => string;
  /** 固定ハッシュタグ入力フィールドの変更ハンドラ */
  handleHashtagChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** ハッシュタグランキングを手動で更新する関数 */
  refreshHashtags: () => Promise<void>;
  /** 固定ハッシュタグをサーバーに保存する関数 */
  saveUserHashtags: () => Promise<boolean>;
  /** サーバーからユーザー設定を読み込む関数 */
  loadUserSettings: () => Promise<void>;
  /** ユーザー設定の読み込み状態 */
  isUserSettingsLoading: boolean;
  /** ユーザー設定の読み込みエラー */
  userSettingsError: string | null;
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
  if (!text && !selectedTags.size && (!autoAppend || !fixedTags)) return '';
  
  // 元のテキストはそのまま保持する（削除せず）
  const originalText = text.trim();
  
  // 元のテキストからハッシュタグを抽出（削除はしない）
  const existingTags = new Set<string>();
  text.match(/#[^\s#]+/g)?.forEach(match => {
    // "#"を取り除いてタグを保存
    existingTags.add(match.substring(1).toLowerCase());
  });
  
  // 選択されたタグは常に追加（既存タグと重複しない場合のみ）
  const tagsArray = Array.from(selectedTags)
    .filter(tag => tag.trim() !== '')
    .filter(tag => !existingTags.has(tag.toLowerCase()))
    .map(tag => `#${tag.replace(/^#/, '')}`);
    
  // 固定タグはautoAppendがtrueの場合のみ追加（既存タグと重複しない場合のみ）
  const fixedTagsArray = autoAppend ? fixedTags
    .split(/[,\s]+/) // カンマまたは空白で分割
    .map(tag => tag.trim())
    .filter(tag => tag !== '')
    .filter(tag => {
      const cleanTag = tag.replace(/^#/, '').toLowerCase();
      return !existingTags.has(cleanTag) && 
             !Array.from(selectedTags).some(
               selected => selected.toLowerCase() === cleanTag
             );
    })
    .map(tag => `#${tag.replace(/^#/, '')}`)
    : [];
  
  // 追加するタグ（重複を排除）
  const additionalTags = [...new Set([...tagsArray, ...fixedTagsArray])];
  
  // 追加するタグがある場合は元のテキストに追加
  if (additionalTags.length > 0) {
    return originalText 
      ? `${originalText}\n${additionalTags.join(' ')}`
      : additionalTags.join(' ');
  }
  
  // 追加するタグがない場合は元のテキストをそのまま返す
  return originalText;
}

/**
 * ハッシュタグ管理のカスタムフック
 * 投稿フォーム共通のハッシュタグ関連機能を提供する
 * 
 * @param initialFixedTags 初期固定タグ（カンマ区切り文字列）
 * @param initialAutoAppend 初期自動付与設定（デフォルトはfalse）
 * @param autoInitializeSelected 選択済みハッシュタグを初期タグから自動設定するか
 * @returns ハッシュタグ関連の状態と操作関数
 */

// Global cache for user settings
const userSettingsCache = {
  data: null as UserSettings | null,
  lastLoadTime: 0,
  isLoading: false,
  loadPromise: null as Promise<void> | null
};

export function useHashtags(
  initialFixedTags: string = '', 
  initialAutoAppend: boolean = false,  // デフォルト値をfalseに変更
  autoInitializeSelected: boolean = false
): HashtagsState {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedHashtags, setSelectedHashtags] = useState<Set<string>>(new Set());
  const [hashtagRanking, setHashtagRanking] = useState<HashtagInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [fixedHashtags, setFixedHashtags] = useState(initialFixedTags);
  const [autoAppendTags, setAutoAppendTagsState] = useState(initialAutoAppend); // 命名変更
  const [isUserSettingsLoading, setIsUserSettingsLoading] = useState(false);
  const [userSettingsError, setUserSettingsError] = useState<string | null>(null);
  const apiUrl = `${process.env.NEXT_PUBLIC_SITE_DOMAIN || ''}/api/hashtag/hashtag_rank`;
  const userReadUrl = `${process.env.NEXT_PUBLIC_SITE_DOMAIN || ''}/api/user/user_read`;
  const userUpdateUrl = `${process.env.NEXT_PUBLIC_SITE_DOMAIN || ''}/api/user/user_update`;
  
  // 設定の読み込み状態を追跡するための参照
  const userSettingsRef = useRef<{
    lastLoadTime: number;
    isLoadedOnce: boolean;
    fixedHashtags: string;
    autoAppendTags: boolean;
  }>({
    lastLoadTime: 0,
    isLoadedOnce: false,
    fixedHashtags: initialFixedTags,
    autoAppendTags: initialAutoAppend
  });

  // 最後にAPIが呼び出された時間を記録する参照
  const lastApiCallTime = useRef<number>(0);
  const lastSaveTime = useRef<number>(0);
  const lastLoadTime = useRef<number>(0);
  const ignoreEffectsUntil = useRef<number>(Date.now() + 1000); // 初期ロード時に1秒間effectsを無視
  const pendingAutoAppendValue = useRef<boolean | null>(null);

  // 外部値の変更を内部状態に反映する（一方向のみ）
  // この効果は初期化時のみ実行（依存配列を空に）
  useEffect(() => {
    if (initialFixedTags !== undefined) {
      setFixedHashtags(initialFixedTags);
      userSettingsRef.current.fixedHashtags = initialFixedTags;
    }
    
    if (initialAutoAppend !== undefined) {
      setAutoAppendTagsState(initialAutoAppend);
      userSettingsRef.current.autoAppendTags = initialAutoAppend;
    }
  }, []); // 依存配列を空に - 初期化時のみ実行

  // ユーザー設定の読み込み - キャッシュ機能付き
  const loadUserSettings = useCallback(async (forceReload = false) => {
    const currentTime = Date.now();
    const cacheTime = 60 * 1000; // Cache valid for 1 minute
    const MIN_LOAD_INTERVAL = 1000; // 1秒

    if (userSettingsCache.isLoading && userSettingsCache.loadPromise) {
      try {
        await userSettingsCache.loadPromise;
        return;
      } catch (error) {
        console.error('Waiting for cached loading failed:', error);
      }
    }

    const cacheValid = userSettingsCache.data && 
                      (currentTime - userSettingsCache.lastLoadTime < cacheTime);
    if (!forceReload && cacheValid) {
      console.log('Using cached user settings data');
      if (userSettingsCache.data) {
        const data = userSettingsCache.data;
        let hashtagsString = '';
        if (data.user_auto_hashtag && Array.isArray(data.user_auto_hashtag)) {
          hashtagsString = data.user_auto_hashtag
            .filter(tag => typeof tag === 'string' && tag.trim() !== '')
            .join(' ');
        }
        
        // 現在の値と異なる場合のみ更新（無限ループ防止）
        if (hashtagsString !== fixedHashtags) {
          setFixedHashtags(hashtagsString);
          userSettingsRef.current.fixedHashtags = hashtagsString;
        }
      }
      return;
    }

    if (!forceReload && currentTime - lastLoadTime.current < MIN_LOAD_INTERVAL) {
      console.log('API load throttled to prevent excessive requests');
      return;
    }

    lastLoadTime.current = currentTime;
    setIsUserSettingsLoading(true);
    setUserSettingsError(null);
    userSettingsCache.isLoading = true;

    const loadPromise = (async () => {
      try {
        console.log('Fetching user settings from API');
        const response = await fetch(userReadUrl, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include'
        });
        if (!response.ok) throw new Error(`API returned status ${response.status}`);
        const data: UserSettings = await response.json();
        userSettingsCache.data = data;
        userSettingsCache.lastLoadTime = Date.now();

        let hashtagsString = '';
        if (data.user_auto_hashtag && Array.isArray(data.user_auto_hashtag)) {
          hashtagsString = data.user_auto_hashtag
            .filter(tag => typeof tag === 'string' && tag.trim() !== '')
            .join(' ');
        }
        
        // 現在の値と異なる場合のみ更新（無限ループ防止）
        if (hashtagsString !== fixedHashtags) {
          setFixedHashtags(hashtagsString);
          userSettingsRef.current.fixedHashtags = hashtagsString;
        }
        
        // 初回読み込み時に限り、同期した参照値としてセット
        if (!userSettingsRef.current.isLoadedOnce) {
          userSettingsRef.current.isLoadedOnce = true;
        }
      } catch (error) {
        // console.error('Error loading user settings:', error);
        setUserSettingsError('ユーザー設定の読み込みに失敗しました');
      } finally {
        setIsUserSettingsLoading(false);
        userSettingsCache.isLoading = false;
        userSettingsCache.loadPromise = null;
      }
    })();

    userSettingsCache.loadPromise = loadPromise;
    try {
      await loadPromise;
    } catch (error) {
      console.error('Failed to load user settings:', error);
    }
  }, [userReadUrl, fixedHashtags]); // 依存配列からsetFixedHashtags, setAutoAppendTagsを削除

  // 初回マウント時のみユーザー設定を読み込む
  useEffect(() => {
    // 初期化段階のエフェクトはスキップ
    if (Date.now() < ignoreEffectsUntil.current) {
      return;
    }
    
    // グローバルキャッシュがあれば読み込みをスキップ
    if (userSettingsCache.data && userSettingsCache.lastLoadTime > 0) {
      console.log('Using global cache for user settings, skipping API call');
      return;
    }
    
    // 初回の読み込み時のみ実行
    if (!userSettingsRef.current.isLoadedOnce) {
      console.log('Initial load of user settings');
      loadUserSettings().then(() => {
        userSettingsRef.current.isLoadedOnce = true;
      });
    }
  }, [loadUserSettings]);

  // 自動付与設定の変更ハンドラ - スロットリング機能付き
  // 重要な変更: setAutoAppendTags の名前を handleAutoAppendChange に明示的に変更
  const handleAutoAppendChange = useCallback((value: boolean) => {
    // 初期化段階のエフェクトはスキップ
    if (Date.now() < ignoreEffectsUntil.current) {
      console.log('Ignoring auto append change during initialization');
      pendingAutoAppendValue.current = value;  // 保留中の値を保存
      return;
    }
    
    // 現在の値と同じなら何もしない（無限ループ防止）
    if (value === autoAppendTags) {
      console.log('Auto append setting unchanged, skipping update');
      return;
    }
    
    console.log('Auto append setting changed to:', value);
    // 状態更新と API 呼び出しを分離（重要：無限ループ防止のため）
    setAutoAppendTagsState(value);
    userSettingsRef.current.autoAppendTags = value;

    const now = Date.now();
    const MIN_API_INTERVAL = 5000; // 5秒に増やす（無限ループ防止）
    if (now - lastApiCallTime.current < MIN_API_INTERVAL) {
      console.log('API call throttled to prevent excessive requests');
      return;
    }

    // 前回の設定値と実際の値を比較する代わりに現在の状態を使用
    lastApiCallTime.current = now;
    const hashtagArray = fixedHashtags
      ? fixedHashtags.split(/\s+/).map(tag => tag.trim()).filter(tag => tag !== '').map(tag => tag.replace(/^#/, ''))
      : [];
    
    const saveSettings = async () => {
      try {
        const payload = { 
          user_hashtag: null, 
          user_auto_hashtag: hashtagArray.length > 0 ? hashtagArray : [false] 
        };
        console.log('Saving user hashtags with auto append setting:', payload, value);

        const response = await fetch(userUpdateUrl, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          credentials: 'include'
        });

        if (!response.ok) throw new Error(`API returned status ${response.status}`);
        console.log('Auto append setting saved successfully');
      } catch (error) {
        console.error('Error saving auto append setting:', error);
        // エラー発生時は前の値に戻す - ただし無限ループにならないよう注意
        const previousValue = !value;
        userSettingsRef.current.autoAppendTags = previousValue;
        setAutoAppendTagsState(previousValue);
      }
    };

    saveSettings().catch(err => {
      console.error('Failed to save auto append setting:', err);
    });
  }, [fixedHashtags, userUpdateUrl, autoAppendTags]);

  // 保留中の自動付与値を適用するエフェクト
  useEffect(() => {
    const now = Date.now();
    if (now >= ignoreEffectsUntil.current && pendingAutoAppendValue.current !== null) {
      const value = pendingAutoAppendValue.current;
      pendingAutoAppendValue.current = null;
      if (value !== autoAppendTags) {
        console.log('Applying pending auto append value:', value);
        setAutoAppendTagsState(value);
        userSettingsRef.current.autoAppendTags = value;
      }
    }
  }, [autoAppendTags]);

  // ユーザー設定の保存 - デバウンス機能追加
  const saveUserHashtags = useCallback(async (): Promise<boolean> => {
    try {
      const now = Date.now();
      const MIN_SAVE_INTERVAL = 1000; // 1秒
      if (now - lastSaveTime.current < MIN_SAVE_INTERVAL) {
        console.log('API save throttled to prevent excessive requests');
        return true;
      }

      lastSaveTime.current = now;
      // 空白区切りのハッシュタグを配列に変換
      const hashtagArray = fixedHashtags
        ? fixedHashtags
            .split(/\s+/) // 空白で分割（カンマは使わない）
            .map(tag => tag.trim())
            .filter(tag => tag !== '')
            .map(tag => tag.replace(/^#/, ''))
        : [];
      
      // ハッシュタグが存在する場合は自動付与をtrue、存在しない場合はfalseに設定
      const shouldAutoAppend = hashtagArray.length > 0;
      
      const payload = {
        // user_hashtagは使わないのでnullを送信
        user_hashtag: null,
        // user_auto_hashtagにハッシュタグを設定
        user_auto_hashtag: hashtagArray.length > 0 ? hashtagArray : [false]
      };
      
      console.log('Saving user hashtags:', payload);
      
      const response = await fetch(userUpdateUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include' // クッキーを含める
      });
      
      if (!response.ok) {
        throw new Error(`API returned status ${response.status}`);
      }
      
      console.log('User hashtags saved successfully');
      
      // 自動付与設定を更新（ハッシュタグの有無に基づいて設定）
      setAutoAppendTagsState(shouldAutoAppend);
      userSettingsRef.current.autoAppendTags = shouldAutoAppend;
      
      // キャッシュ状態を更新
      userSettingsRef.current = {
        ...userSettingsRef.current,
        fixedHashtags,
        autoAppendTags: shouldAutoAppend
      };
      
      return true;
    } catch (error) {
      console.error('Error saving user hashtags:', error);
      return false;
    }
  }, [fixedHashtags, userUpdateUrl]);
  
  // 保存処理のデバウンス機能
  const debouncedSaveHashtags = useCallback(
    debounce(() => {
      saveUserHashtags()
        .then(success => {
          if (success) {
            console.log('Fixed hashtags saved successfully (debounced)');
          }
        })
        .catch(error => {
          console.error('Failed to save hashtags:', error);
        });
    }, 1000),
    [saveUserHashtags]
  );

  // debounce関数の実装
  function debounce<F extends (...args: any[]) => any>(func: F, wait: number) {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    
    return function(this: any, ...args: Parameters<F>) {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      timeoutId = setTimeout(() => {
        func.apply(this, args);
        timeoutId = undefined;
      }, wait);
    };
  }

  // コンポーネント初期化時に一度だけユーザー設定を読み込む
  useEffect(() => {
    if (!userSettingsRef.current.isLoadedOnce) {
      loadUserSettings();
    }
  }, [loadUserSettings]);

  // タグ選択の切り替え
  const handleHashtagSelect = useCallback((tag: string) => {
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

  // 固定タグ入力フォームの変更ハンドラ - 自動保存機能付き
  const handleHashtagChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFixedHashtags(value);
    userSettingsRef.current.fixedHashtags = value;
    
    // 自動保存処理
    debouncedSaveHashtags();
  }, [debouncedSaveHashtags]);
  
  // タグランキングのフェッチ
  const fetchHashtags = useCallback(async () => {
    if (isLoading) return; // 既に読み込み中なら何もしない
    
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
  }, [apiUrl, isLoading]);

  // 手動でハッシュタグランキングを更新するための関数
  const refreshHashtags = useCallback(async () => {
    setHasLoadedOnce(false);  // 強制的に再読み込みするためにフラグをリセット
    return fetchHashtags();
  }, [fetchHashtags]);

  // 初期タグ読み込み - 条件付きで実行するように修正
  const initializeSelectedHashtags = useCallback(() => {
    // autoInitializeSelectedがtrueの場合のみ初期選択する
    if (autoInitializeSelected && initialFixedTags) {
      // 空白で区切られたタグを処理
      const tags = initialFixedTags
        .split(/\s+/) // 空白で分割
        .map(tag => tag.trim())
        .filter(tag => tag !== '')
        .map(tag => tag.replace(/^#/, ''));
      
      setSelectedHashtags(new Set(tags));
    }
  }, [initialFixedTags, autoInitializeSelected]);

  // isDropdownOpenが変更されたときにフェッチを実行
  useEffect(() => {
    if (isDropdownOpen && !hasLoadedOnce) {
      fetchHashtags();
    }
  }, [isDropdownOpen, fetchHashtags, hasLoadedOnce]);

  // 初期化時にinitializeSelectedHashtagsを実行
  useEffect(() => {
    initializeSelectedHashtags();
  }, [initializeSelectedHashtags]);

  // 処理されたポストテキストを提供する関数
  const processPostTextWithState = useCallback((text: string) => {
    return processPostText(text, selectedHashtags, autoAppendTags, fixedHashtags || '');
  }, [selectedHashtags, autoAppendTags, fixedHashtags]);

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
    fixedHashtags: fixedHashtags || '', 
    setFixedHashtags,
    autoAppendTags,
    setAutoAppendTags: handleAutoAppendChange, // 重要: 自動保存機能付きの関数を返す
    processPostText: processPostTextWithState,
    handleHashtagChange,
    refreshHashtags,
    saveUserHashtags,
    loadUserSettings,
    isUserSettingsLoading,
    userSettingsError
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

/**
 * ハッシュタグセレクターのプロパティインターフェース
 * ハッシュタグ選択UIコンポーネント用の入力値
 */
export interface HashtagSelectorProps {
  /** ハッシュタグの状態管理 */
  hashtagsState: HashtagsState;
  /** 固定ハッシュタグ（カンマ区切り文字列） */
  fixedHashtags: string;
  /** 自動付与フラグ */
  autoAppendTags: boolean;
  /** 固定ハッシュタグ変更時のハンドラ */
  onFixedHashtagsChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** 自動付与設定変更時のハンドラ */
  onAutoAppendChange: (value: boolean) => void;
}

/**
 * ハッシュタグ選択コンポーネント
 * 投稿フォーム内で使用される、ハッシュタグの選択と設定を行うUIコンポーネント
 */
export const HashtagSelector: React.FC<HashtagSelectorProps> = ({
  hashtagsState,
  fixedHashtags,
  autoAppendTags,
  onFixedHashtagsChange,
  onAutoAppendChange
}) => {
  // コンポーネントがマウントされた時に外部から受け取った値でフォームを初期化
  // デバッグログを削減し、実際に必要なときだけ出力する
  const initialRenderRef = useRef(true);
  useEffect(() => {
    if (initialRenderRef.current) {
      console.log('HashtagSelector initial render with:', { fixedHashtags, autoAppendTags });
      initialRenderRef.current = false;
      return;
    }
    
    // 値が実際に変更された場合のみログを出力
    console.debug('HashtagSelector props updated:', { fixedHashtags, autoAppendTags });
  }, [fixedHashtags, autoAppendTags]);

  const {
    hashtagRanking,
    isDropdownOpen,
    setIsDropdownOpen,
    selectedHashtags,
    isLoading,
    handleHashtagSelect,
  } = hashtagsState;

  return (
    <div className="mt-2">
      <div className="flex flex-col">
        {/* 固定ハッシュタグ入力フィールド */}
        <div className="mb-2">
          <label 
            htmlFor="fixedHashtags" 
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            固定ハッシュタグ（半角スペース区切り）
          </label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <input
              type="text"
              id="fixedHashtags"
              className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-2 pr-8 sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
              placeholder="#タグ1 #タグ2"
              value={fixedHashtags}
              onChange={onFixedHashtagsChange}
            />
            {/* 自動付与トグルボタン */}
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <button
                type="button"
                onClick={() => onAutoAppendChange(!autoAppendTags)}
                className={`h-4 w-8 rounded-full focus:outline-none flex items-center transition-colors ${
                  autoAppendTags ? 'bg-green-500' : 'bg-gray-300'
                }`}
                title={autoAppendTags ? '自動付与ON' : '自動付与OFF'}
              >
                <span
                  className={`h-3 w-3 bg-white rounded-full shadow transform transition-transform ${
                    autoAppendTags ? 'translate-x-4' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {autoAppendTags ? (
              <span className="text-green-600 dark:text-green-400">自動付与ON: 投稿に自動的にタグを追加します</span>
            ) : (
              <span>自動付与OFF: タグの自動追加は行われません</span>
            )}
          </p>
        </div>
        
        {/* タグ選択UI - ドロップダウントグルボタン */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="w-full p-2 text-left border border-gray-300 rounded-md flex justify-between items-center dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
          >
            <span>タグを選択 ({selectedHashtags.size}つ選択中)</span>
            <span className="ml-2">
              {isDropdownOpen ? '▲' : '▼'}
            </span>
          </button>
          
          {/* タグ選択ドロップダウン */}
          {isDropdownOpen && (
            <div className="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg dark:bg-gray-800">
              <div className="max-h-60 overflow-auto p-2">
                <h3 className="font-medium mb-2 dark:text-gray-200">人気のタグ:</h3>
                {isLoading ? (
                  <p className="text-center text-gray-500">読み込み中...</p>
                ) : hashtagRanking.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {hashtagRanking.map((tag) => {
                      // タグ名から"#"を取り除く（存在する場合）
                      const tagText = tag.post_tag_text.replace(/^#/, '');
                      const isSelected = selectedHashtags.has(tagText);
                      
                      return (
                        <button
                          key={tag.post_tag_id}
                          type="button"
                          onClick={() => handleHashtagSelect(tagText)}
                          className={`px-2 py-1 text-sm rounded-full ${
                            isSelected
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-200 dark:bg-gray-600 dark:text-gray-200'
                          }`}
                        >
                          #{tagText} ({tag.use_count})
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-center text-gray-500">
                    タグが見つかりません
                  </p>
                )}
              </div>
              
              {/* 選択されたタグのプレビュー */}
              {selectedHashtags.size > 0 && (
                <div className="p-2 border-t dark:border-gray-700">
                  <h3 className="font-medium mb-2 dark:text-gray-200">選択中のタグ:</h3>
                  <div className="flex flex-wrap gap-2">
                    {Array.from(selectedHashtags).map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleHashtagSelect(tag)}
                        className="px-2 py-1 text-sm rounded-full bg-blue-500 text-white"
                      >
                        #{tag} ×
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * 投稿テキスト管理のカスタムフック
 * 投稿テキストの状態管理とローカルストレージへの保存機能を提供する
 * 
 * @param initialText 初期テキスト
 * @returns テキスト関連の状態と操作関数
 */

// 投稿テキストのグローバルキャッシュ（複数コンポーネント間で共有）
const postTextCache = {
  data: null as string | null,
  lastSaveTime: 0,
  isLoading: false,
  loadPromise: null as Promise<string | null> | null
};

// ローカルストレージのキー
const POST_TEXT_STORAGE_KEY = 'wallog_draft_post_text';

// デバウンス用タイマーID
let debounceTimerId: ReturnType<typeof setTimeout> | null = null;
// 長い遅延用タイマーID
let delayedSaveTimerId: ReturnType<typeof setTimeout> | null = null;
// 投稿済みフラグ（グローバルで管理）
let isPosted = false;

export function usePostText(initialText: string = '') {
  const [postText, setPostText] = useState(initialText);
  const [isTextSaving, setIsTextSaving] = useState(false);
  const [textSaveError, setTextSaveError] = useState<string | null>(null);
  const [lastSavedText, setLastSavedText] = useState(initialText);
  
  // 初期読み込み済みフラグ
  const initialLoadDone = useRef(false);
  // 親コンポーネントから更新中フラグ - 無限ループ防止用
  const isParentUpdating = useRef(false);
  // 前回の保存チェックからの変更があったかを追跡
  const hasChangedSinceLastCheck = useRef(false);
  // 現在のテキスト値の参照を保持
  const currentTextRef = useRef(initialText);
  // 保存延期中フラグ
  const isSaveScheduled = useRef(false);
  // コンポーネントのマウント状態を追跡
  const isMounted = useRef(true);

  // コンポーネントがマウントされたときに isPosted フラグをリセット
  useEffect(() => {
    // コンポーネントがマウントされたタイミングで投稿済みフラグをリセット
    // PostFormPopup が表示されたときに確実に新しい入力を受け付けられるようにする
    isPosted = false;
    
    return () => {
      // アンマウント時の処理（既存のコードはそのまま）
      isMounted.current = false;
      
      // タイマーのクリーンアップ
      if (delayedSaveTimerId !== null) {
        clearTimeout(delayedSaveTimerId);
        delayedSaveTimerId = null;
      }
      
      // 未保存の変更があれば保存
      const currentText = currentTextRef.current.trim();
      if (currentText !== '' && currentText !== lastSavedText && hasChangedSinceLastCheck.current && !isPosted) {
        console.log('Saving unsaved changes before unmount');
        // ローカルストレージに直接保存
        try {
          localStorage.setItem(POST_TEXT_STORAGE_KEY, currentText);
          console.log('Saved text to localStorage on unmount');
          
          // キャッシュも更新
          postTextCache.data = currentText;
          postTextCache.lastSaveTime = Date.now();
        } catch (error) {
          console.error('Failed to save text on unmount:', error);
        }
      }
    };
  }, [lastSavedText]);
  
  /**
   * テキストが投稿されたことを通知する関数
   * ローカルストレージの内容をクリアする
   */
  const markAsPosted = useCallback(() => {
    isPosted = true;
    isSaveScheduled.current = false;
    console.log('Text marked as posted, clearing localStorage immediately');
    
    // 投稿成功時は即座にローカルストレージをクリア
    try {
      localStorage.removeItem(POST_TEXT_STORAGE_KEY);
      console.log('localStorage draft text cleared successfully');
      
      // グローバルキャッシュもクリア
      postTextCache.data = null;
      postTextCache.lastSaveTime = 0;
      
      // カスタムイベントを発火してアプリ全体に通知
      window.dispatchEvent(new CustomEvent('post_text_updated', { 
        detail: { text: '', source: 'posted' } 
      }));
    } catch (error) {
      console.error('Failed to clear localStorage draft:', error);
    }
    
    // 既存のタイマーがあればクリア
    if (delayedSaveTimerId !== null) {
      clearTimeout(delayedSaveTimerId);
      delayedSaveTimerId = null;
    }
  }, []);
  
  /**
   * ローカルストレージに投稿テキストを保存する関数
   * @returns {Promise<boolean>} 保存成功時はtrue、失敗時はfalse
   */
  const savePostText = useCallback(async (): Promise<boolean> => {
    // 投稿済みの場合はローカルストレージをクリア
    if (isPosted) {
      console.log('Text was posted, clearing localStorage');
      try {
        setIsTextSaving(true);
        
        // ローカルストレージから投稿テキストを削除
        localStorage.removeItem(POST_TEXT_STORAGE_KEY);
        
        console.log('Successfully cleared text after post');
        setLastSavedText('');
        
        // キャッシュもクリア
        postTextCache.data = null;
        postTextCache.lastSaveTime = Date.now();
        
        // 投稿フラグをリセット
        isPosted = false;
        
        return true;
      } catch (error) {
        console.error('Error clearing text after post:', error);
        return false;
      } finally {
        setIsTextSaving(false);
      }
    }

    const currentText = currentTextRef.current.trim();
    
    // テキストが前回保存した値と同じ場合は保存をスキップ
    if (currentText === lastSavedText) {
      console.log('Skipping save as text has not changed');
      return true;
    }
    
    // 空テキストは保存しない
    if (currentText === '') {
      console.log('Not saving empty text');
      // 既存の保存データがある場合はクリア
      if (localStorage.getItem(POST_TEXT_STORAGE_KEY)) {
        localStorage.removeItem(POST_TEXT_STORAGE_KEY);
        console.log('Cleared existing draft text as current text is empty');
      }
      return true;
    }
    
    try {
      setIsTextSaving(true);
      setTextSaveError(null);
      
      // ローカルストレージに保存
      localStorage.setItem(POST_TEXT_STORAGE_KEY, currentText);
      console.log('Post text saved to localStorage:', currentText);
      
      if (isMounted.current) {
        setLastSavedText(currentText); // 保存したテキストを記録
      }
      
      // キャッシュも更新
      postTextCache.data = currentText;
      postTextCache.lastSaveTime = Date.now();
      
      // グローバルイベントを発火して他のコンポーネントに変更を通知
      const event = new CustomEvent('post_text_updated', { 
        detail: { text: currentText, timestamp: Date.now() } 
      });
      window.dispatchEvent(event);
      
      return true;
    } catch (error) {
      console.error('Error saving post text to localStorage:', error);
      if (isMounted.current) {
        setTextSaveError('投稿テキストの保存に失敗しました');
      }
      return false;
    } finally {
      if (isMounted.current) {
        setIsTextSaving(false);
      }
      // 保存が終了したので、スケジュールフラグをリセット
      isSaveScheduled.current = false;
    }
  }, [lastSavedText]);
  
  /**
   * 遅延保存をスケジュールする関数
   * 3秒後に保存を実行する
   */
  const scheduleDelayedSave = useCallback(() => {
    // 既に保存がスケジュールされている場合はスキップ
    if (isSaveScheduled.current) {
      console.log('Save already scheduled, skipping');
      return;
    }
    
    // 現在のテキストが空の場合は何もしない
    if (currentTextRef.current.trim() === '') {
      console.log('Empty text, not scheduling delayed save');
      return;
    }
    
    // 前回保存値と同じなら保存しない
    if (currentTextRef.current.trim() === lastSavedText) {
      console.log('Text unchanged since last save, skipping schedule');
      return;
    }
    
    console.log('Scheduling delayed save in 3 seconds for text:', currentTextRef.current);
    isSaveScheduled.current = true;
    
    // 既存のタイマーがあればクリア
    if (delayedSaveTimerId !== null) {
      console.log('Clearing existing timer');
      clearTimeout(delayedSaveTimerId);
      delayedSaveTimerId = null;
    }
    
    delayedSaveTimerId = setTimeout(() => {
      try {
        console.log('Executing delayed save now');
        // 投稿済みでなく、マウントされていればテキストを保存
        if (!isPosted && isMounted.current) {
          console.log('Conditions met, saving post text:', currentTextRef.current);
          savePostText()
            .then(success => {
              console.log('Delayed save completed with result:', success);
              isSaveScheduled.current = false; // 保存が終了したのでフラグをリセット
            })
            .catch(err => {
              console.error('Error during delayed save:', err);
              isSaveScheduled.current = false; // エラー時もフラグをリセット
            });
        } else {
          console.log('Skipping delayed save: isPosted=', isPosted, 'isMounted=', isMounted.current);
          isSaveScheduled.current = false; // 条件を満たさない場合もフラグをリセット
        }
      } catch (error) {
        console.error('Unexpected error in delayed save callback:', error);
        isSaveScheduled.current = false; // 例外時もフラグをリセット
      } finally {
        // タイマーIDをクリア
        delayedSaveTimerId = null;
      }
    }, 3000);
  }, [lastSavedText, savePostText]);
  
  /**
   * テキスト変更ハンドラ - 3秒遅延の自動保存機能付き
   */
  const handlePostTextChange = useCallback((
    e: React.ChangeEvent<HTMLTextAreaElement> | React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    
    // テキスト更新 - UI に反映
    setPostText(value);
    // 現在の値を参照に保存（タイマーで使用）
    currentTextRef.current = value;
    
    // デバッグログ
    console.log('Text changed to:', value, 'Length:', value.length);
    
    // 空文字でなく、前回保存値と異なる場合のみ保存をスケジュール
    if (value.trim() !== '' && value.trim() !== lastSavedText) {
      hasChangedSinceLastCheck.current = true;
      console.log('Text changed, scheduling delayed save');
      scheduleDelayedSave();
    } else {
      console.log('Text unchanged or empty, not scheduling save');
      
      // 空テキストの場合は即座にローカルストレージから削除
      if (value.trim() === '') {
        localStorage.removeItem(POST_TEXT_STORAGE_KEY);
        console.log('Text is empty, removed draft from localStorage');
        
        // キャッシュも更新
        postTextCache.data = null;
        postTextCache.lastSaveTime = Date.now();
        
        // 現在の保存値を更新
        setLastSavedText('');
        
        // グローバルイベントを発火して他のコンポーネントに変更を通知
        window.dispatchEvent(new CustomEvent('post_text_updated', { 
          detail: { text: '', timestamp: Date.now(), source: 'cleared' } 
        }));
      }
    }
  }, [lastSavedText, scheduleDelayedSave]);
  
  /**
   * テキスト直接設定関数 - 自動保存あり
   */
  const setPostTextWithSave = useCallback((text: string) => {
    setPostText(text);
    currentTextRef.current = text;
    
    // 空文字でなく、前回保存値と異なる場合のみ保存をスケジュール
    if (text.trim() !== '' && text.trim() !== lastSavedText) {
      hasChangedSinceLastCheck.current = true;
      console.log('Text set with save, scheduling delayed save');
      scheduleDelayedSave();
    }
  }, [lastSavedText, scheduleDelayedSave]);
  
  /**
   * テキスト直接設定関数 - 自動保存なし
   */
  const setPostTextWithoutSave = useCallback((text: string) => {
    // 親コンポーネントから更新中フラグをONに - 無限ループを防止
    isParentUpdating.current = true;
    setPostText(text);
    currentTextRef.current = text;
    // 外部から設定された場合は、その値を最新の保存値として扱う
    setLastSavedText(text.trim());
    // すぐにフラグをOFFに戻す
    setTimeout(() => {
      isParentUpdating.current = false;
    }, 0);
  }, []);
  
  /**
   * ローカルストレージから投稿テキストを読み込む関数 - キャッシュ機能付き
   * @param {boolean} forceReload 強制的に再読み込みするかどうか
   * @returns {Promise<string | null>} 保存されていたテキスト、または存在しない場合はnull
   */
  const loadPostText = useCallback(async (forceReload = false): Promise<string | null> => {
    // すでに読み込み済みかつ強制リロードでなければキャッシュを使用
    if (initialLoadDone.current && !forceReload && postTextCache.data !== null) {
      return postTextCache.data;
    }
    
    const currentTime = Date.now();
    const cacheTime = 60 * 1000; // キャッシュの有効期間: 1分
    
    // すでに他のコンポーネントが読み込み中なら待機
    if (postTextCache.isLoading && postTextCache.loadPromise) {
      try {
        return await postTextCache.loadPromise;
      } catch (error) {
        console.error('Waiting for cached loading failed:', error);
      }
    }
    
    // キャッシュが有効ならキャッシュを使用
    const cacheValid = postTextCache.data !== null && 
                      (currentTime - postTextCache.lastSaveTime < cacheTime);
    if (!forceReload && cacheValid) {
      console.log('Using cached post text data:', postTextCache.data);
      if (postTextCache.data !== postText) {
        setPostTextWithoutSave(postTextCache.data || '');
      }
      return postTextCache.data;
    }
    
    // キャッシュが無効なら新たに読み込み
    postTextCache.isLoading = true;
    
    const loadPromise = (async () => {
      try {
        console.log('Loading saved post text from localStorage');
        // ローカルストレージから読み込み
        const savedText = localStorage.getItem(POST_TEXT_STORAGE_KEY);
        let loadedText = '';
        
        if (savedText) {
          loadedText = savedText;
          console.log('Loaded saved post text:', loadedText);
          
          // キャッシュを更新
          postTextCache.data = loadedText;
          postTextCache.lastSaveTime = currentTime;
          
          // 現在のテキストと異なる場合のみ更新（無限ループ防止）
          if (loadedText !== postText && isMounted.current) {
            // 親コンポーネントから更新中フラグをONに - 無限ループを防止
            isParentUpdating.current = true;
            setPostText(loadedText);
            currentTextRef.current = loadedText;
            setLastSavedText(loadedText);
            // すぐにフラグをOFFに戻す
            setTimeout(() => {
              isParentUpdating.current = false;
            }, 0);
          }
        } else {
          console.log('No saved post text found in localStorage');
        }
        
        return loadedText;
      } catch (error) {
        console.error('Error loading post text from localStorage:', error);
        if (isMounted.current) {
          setTextSaveError('投稿テキストの読み込みに失敗しました');
        }
        return null;
      } finally {
        // 読み込み完了フラグをセット
        initialLoadDone.current = true;
        postTextCache.isLoading = false;
      }
    })();
    
    postTextCache.loadPromise = loadPromise;
    try {
      return await loadPromise;
    } finally {
      postTextCache.loadPromise = null;
    }
  }, [postText, setPostTextWithoutSave]);

  // グローバルなPostTextイベントリスナー - 他のコンポーネントからの更新を検知
  useEffect(() => {
    const handlePostTextUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<{text: string, timestamp: number}>;
      if (customEvent.detail && customEvent.detail.text !== currentTextRef.current) {
        console.log('Received post_text_updated event:', customEvent.detail);
        setPostTextWithoutSave(customEvent.detail.text);
      }
    };

    window.addEventListener('post_text_updated', handlePostTextUpdated);
    
    return () => {
      window.removeEventListener('post_text_updated', handlePostTextUpdated);
    };
  }, [setPostTextWithoutSave]);
  
  // コンポーネントのマウント/アンマウント状態を追跡
  useEffect(() => {
    isMounted.current = true;
    
    return () => {
      isMounted.current = false;
      
      // タイマーのクリーンアップ
      if (delayedSaveTimerId !== null) {
        clearTimeout(delayedSaveTimerId);
        delayedSaveTimerId = null;
      }
      
      // 未保存の変更があれば保存
      const currentText = currentTextRef.current.trim();
      if (currentText !== '' && currentText !== lastSavedText && hasChangedSinceLastCheck.current && !isPosted) {
        console.log('Saving unsaved changes before unmount');
        // ローカルストレージに直接保存
        try {
          localStorage.setItem(POST_TEXT_STORAGE_KEY, currentText);
          console.log('Saved text to localStorage on unmount');
          
          // キャッシュも更新
          postTextCache.data = currentText;
          postTextCache.lastSaveTime = Date.now();
        } catch (error) {
          console.error('Failed to save text on unmount:', error);
        }
      }
    };
  }, [lastSavedText]);
  
  // 初回マウント時のみテキストを読み込む
  useEffect(() => {
    // 親からのテキスト更新中は読み込みをスキップ
    if (isParentUpdating.current) {
      return;
    }
    
    // initialTextが空の場合のみローカルストレージから読み込む
    if (initialText === '') {
      loadPostText().then(loadedText => {
        if (loadedText && isMounted.current) {
          // 読み込んだテキストをキャッシュに保存
          postTextCache.data = loadedText;
          postTextCache.lastSaveTime = Date.now();
        }
      }).catch(error => {
        console.error('Failed to load post text at initial mount:', error);
      });
    } else {
      // 初期値が設定されている場合は、それを使用
      initialLoadDone.current = true;
      // キャッシュも更新
      postTextCache.data = initialText;
      postTextCache.lastSaveTime = Date.now();
    }
  }, []); // 初回のみ実行 (依存配列を空に)
  
  // initialTextが変更された場合の処理
  useEffect(() => {
    // 親からのテキスト更新中は処理をスキップ
    if (isParentUpdating.current) {
      return;
    }
    
    // 初期値が与えられており、現在の値と異なる場合、値を更新
    if (initialText && initialText.trim() !== '' && initialText !== postText) {
      console.log('Initial text changed, updating without save:', initialText);
      setPostTextWithoutSave(initialText);
      
      // キャッシュも更新
      postTextCache.data = initialText;
      postTextCache.lastSaveTime = Date.now();
    }
  }, [initialText, postText, setPostTextWithoutSave]);
  
  return {
    postText,
    setPostText: setPostTextWithSave, // デフォルトは自動保存あり
    setPostTextWithoutSave, // 自動保存なしの関数
    handlePostTextChange,
    isTextSaving,
    textSaveError,
    savePostText,
    loadPostText,
    markAsPosted // 投稿完了を通知する関数
  };
}

