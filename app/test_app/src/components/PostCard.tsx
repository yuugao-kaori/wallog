'use client'

import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import PostCardPopup from './PostCardPopup';
import { useInView } from 'react-intersection-observer';
import { Post as PostFeedPost } from '@/components/PostFeed';  // 追加
import PostFormPopup from './PostFormPopup';  // PostFormModalの代わりに使用
import SiteCard from './SiteCard';
import { FileItem } from './PostFormCommon';  // FileItem型をインポート
import { FaRetweet, FaReply, FaQuoteRight, FaTrash } from 'react-icons/fa';

// Twitter埋め込みウィジェット用の型定義
declare global {
  interface Window {
    twttr: {
      widgets: {
        load: (element?: HTMLElement) => void;
        createTweet: (
          tweetId: string, 
          container: HTMLElement, 
          options?: object
        ) => Promise<HTMLElement>;
      };
    };
  }
}

const DeleteConfirmModal = dynamic(() => import('./DeleteConfirmModal'));
const ImageModal = dynamic(() => import('./ImageModal'));
const Notification = dynamic(() => import('./Notification'));

/**
 * 投稿カードコンポーネントのプロパティインターフェース
 * @interface Props
 * 
 * @property {PostFeedPost} post - 表示する投稿データ
 * @property {boolean} isLoggedIn - ユーザーのログイン状態
 * @property {Function} handleDeleteClick - 削除ボタンクリック時のハンドラー
 * @property {Function} formatDate - 日付フォーマット関数
 * @property {string} [className] - 追加のCSSクラス名
 * @property {Function} onDelete - 投稿削除時のコールバック
 * @property {Function} [onRepost] - 再投稿時のコールバック
 * @property {Function} [onQuote] - 引用投稿時のコールバック
 * @property {Function} [onReply] - 返信投稿時のコールバック
 * @property {Function} [onQuoteSubmit] - 引用・返信投稿送信時のコールバック
 * @property {Function} [handleDelete] - 投稿削除のハンドラー
 * @property {Function} [onCorrect] - 修正モードを開始するためのコールバック
 */
interface Props {
  post: PostFeedPost;
  isLoggedIn: boolean;
  handleDeleteClick: (event: React.MouseEvent, postId: string) => void;
  formatDate: (date: string) => string;
  className?: string;
  onDelete: (event: React.MouseEvent, post_id: string) => Promise<boolean>;
  onRepost?: (post: PostFeedPost) => Promise<void>;
  onQuote?: (post: PostFeedPost) => void;
  onReply?: (post: PostFeedPost) => void;
  onQuoteSubmit?: (text: string, type: 'quote' | 'reply', targetPostId: string, attachedFiles?: FileItem[]) => Promise<void>;
  handleDelete?: (postId: string) => Promise<boolean>;
  onCorrect?: (post: PostFeedPost) => void; // 追加: 修正モードを開始するためのコールバック
}

/**
 * 投稿の画像データを管理するインターフェース
 * @interface ImageData
 * 
 * @property {string} fileId - 画像ファイルの一意識別子
 * @property {string | null} thumbnailUrl - サムネイル画像のURL
 * @property {string | null} fullUrl - フル解像度画像のURL
 * @property {boolean} loading - 画像の読み込み状態
 */
interface ImageData {
  fileId: string;
  thumbnailUrl: string | null;
  fullUrl: string | null;
  loading: boolean;
  status: 'idle' | 'loading' | 'error';
}

interface SiteCardData {
  site_card_id: string;
  url_text: string;
  site_card_title: string;
  site_card_text: string;
  site_card_thumbnail: string | null;
}

// URL extraction regex
const urlRegex = /(https?:\/\/[^\s]+)/g;

// 半角<>で囲まれた文字列を検出する正規表現
const bracketedUrlRegex = /<(https?:\/\/[^\s>]+)>/g;

// YouTube URLからビデオIDを抽出する関数を修正
const extractYoutubeVideoId = (url: string): string | null => {
  const patterns = [
    /((?:https?:\/\/)?(?:www\.)?youtube\.com\/(?:shorts|live|embed|watch\?.*v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[2]) { // [1]から[2]に変更
      return match[2];
    }
  }
  return null;
};

// X (Twitter) URLからツイートIDを抽出する関数
const extractTweetId = (url: string): string | null => {
  // Twitter/X URLのパターン
  const patterns = [
    /(?:https?:\/\/)?(?:www\.)?(?:twitter|x)\.com\/\w+\/status\/(\d+)/i,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
};

// Twitter埋め込み用コンポーネント
const TwitterEmbed: React.FC<{ tweetId: string }> = ({ tweetId }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [isScriptLoading, setIsScriptLoading] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    // コンポーネントのマウント状態追跡
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    
    const loadTweet = async () => {
      try {
        // 同じIDが複数の要素で読み込まれることを防ぐための処理
        const existingTweet = document.querySelector(`[data-tweet-id="${tweetId}"]`);
        if (existingTweet) {
          console.log(`Tweet ${tweetId} is already loaded elsewhere`);
          setError(true);
          return;
        }

        // コンテナを識別するためにデータ属性を設定
        if (containerRef.current) {
          containerRef.current.setAttribute('data-tweet-id', tweetId);
        } else {
          return; // コンテナがnullの場合は処理を中止
        }
        
        // すでにスクリプトがロード中であれば待機
        if (isScriptLoading) {
          let checkCount = 0;
          const checkInterval = setInterval(() => {
            checkCount++;
            if (window.twttr && window.twttr.widgets) {
              clearInterval(checkInterval);
              renderTweet();
            } else if (checkCount > 50) {  // 最大10秒待機
              clearInterval(checkInterval);
              if (mountedRef.current) setError(true);
              console.error('Timeout waiting for Twitter script to load');
            }
          }, 200);
          return;
        }

        // Twitter埋め込みスクリプトがない場合は追加
        if (!window.twttr || !window.twttr.widgets) {
          setIsScriptLoading(true);
          const script = document.createElement('script');
          script.src = 'https://platform.twitter.com/widgets.js';
          script.async = true;
          script.charset = 'utf-8';
          
          // スクリプト読み込み完了時のハンドラ
          script.onload = () => {
            setIsScriptLoading(false);
            if (mountedRef.current) {
              renderTweet();
            }
          };
          
          // エラーハンドリング
          script.onerror = () => {
            setIsScriptLoading(false);
            if (mountedRef.current) setError(true);
            console.error('Error loading Twitter widgets.js');
          };
          
          document.body.appendChild(script);
        } else {
          renderTweet();
        }
      } catch (err) {
        console.error('Unexpected error in loadTweet:', err);
        if (mountedRef.current) setError(true);
      }
    };

    // ツイート埋め込み処理を実行する関数
    const renderTweet = async () => {
      if (!containerRef.current || !window.twttr || !window.twttr.widgets) return;

      try {
        // コンテナ内の既存のツイート要素をクリア
        while (containerRef.current.firstChild) {
          containerRef.current.removeChild(containerRef.current.firstChild);
        }

        // 新しいツイートを作成
        await window.twttr.widgets.createTweet(tweetId, containerRef.current, {
          theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
          dnt: true, // Do Not Track
          // 必要に応じてオプションを追加
        });
        if (mountedRef.current) setIsLoaded(true);
      } catch (err) {
        console.error('Error creating tweet:', err);
        if (mountedRef.current) setError(true);
      }
    };

    loadTweet();
  }, [tweetId, isScriptLoading]);

  return (
    <div className="rounded-lg overflow-hidden">
      <div 
        ref={containerRef} 
        className="min-h-[100px] w-full rounded-lg overflow-hidden"
      >
        {!isLoaded && !error && (
          <div className="flex items-center justify-center h-[200px] py-4">
            <div className="animate-pulse flex flex-col items-center">
              <div className="h-8 w-8 rounded-full bg-blue-200 dark:bg-blue-700 mb-2"></div>
              <div className="h-4 w-32 bg-gray-200 dark:bg-gray-600 rounded mb-2"></div>
              <div className="h-10 w-3/4 bg-gray-100 dark:bg-gray-800 rounded"></div>
            </div>
          </div>
        )}
        {error && (
          <div className="flex items-center justify-center h-[120px] py-4 px-4">
            <div className="text-center">
              <p className="text-gray-500 dark:text-gray-400">ツイートを読み込めませんでした</p>
              <a 
                href={`https://x.com/i/status/${tweetId}`}
                target="_blank"
                rel="noopener noreferrer" 
                className="text-blue-500 hover:underline text-sm mt-1 block"
              >
                X.comで表示する
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// YouTube埋め込みプレイヤーコンポーネント
const YouTubeEmbed: React.FC<{ videoId: string }> = ({ videoId }) => {
  return (
    <div className="relative pb-[56.25%] h-0 mt-2 rounded-lg overflow-hidden">
      <iframe
        className="absolute top-0 left-0 w-full h-full"
        src={`https://www.youtube.com/embed/${videoId}`}
        title="YouTube video player"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
};

const Card = memo(({ 
  post, 
  isLoggedIn, 
  handleDeleteClick, 
  formatDate, 
  onDelete, 
  onRepost, 
  onQuote, 
  onReply, 
  onQuoteSubmit, 
  handleDelete,
  onCorrect // 追加: パラメータとして受け取る
}: Props) => {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1
  });

  // hydration errorを防ぐため、useEffectで初期化
  const [imageData, setImageData] = useState<Record<string, ImageData>>({});
  const [siteCards, setSiteCards] = useState<SiteCardData[]>([]);
  const [uiState, setUiState] = useState({
    menuOpen: false,
    deleteModalOpen: false, // 削除モーダル用の状態
    imageModalOpen: false,  // 画像モーダル用の状態
    selectedImage: null as string | null,
    repostModalOpen: false, // 追加
    detailModalOpen: false, // 追加
    quoteModalOpen: false, // 追加: 引用投稿モーダル用
    replyModalOpen: false, // 追加: 返信投稿モーダル用
    postFormModalOpen: false,
    postFormType: null as 'quote' | 'reply' | null,
  });
  const [notifications, setNotifications] = useState<{ id: string, message: string }[]>([]);

  // リトライ回数を管理するための状態を追加
  const [retryCount, setRetryCount] = useState<Record<string, number>>({});
  const MAX_RETRY = 3;

  const [formState, setFormState] = useState({
    postText: '',
    mode: 'normal' as 'normal' | 'quote' | 'reply' | 'correct',
    files: [] as FileItem[]
  });

  // 追加: テキストの展開状態を管理
  const [isExpanded, setIsExpanded] = useState(false);

  const handleHashtagClick = useCallback((hashtag: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const searchText = hashtag.slice(1); // # を除去
    router.push(`/search?searchText=${encodeURIComponent(searchText)}&searchType=hashtag`);
  }, [router]);

  // Extract URLs from post text
  const extractUrls = useCallback((text: string): string[] => {
    return text.match(urlRegex) || [];
  }, []);

  // Fetch site card data for a URL
  const fetchSiteCard = useCallback(async (url: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_DOMAIN}/api/sitecard/sitecard_get`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
        credentials: 'include',
      });

      if (!response.ok) {
        console.error('Failed to fetch site card:', response.statusText);
        return null;
      }

      const data = await response.json();
      return data.site_card;
    } catch (error) {
      console.error('Error fetching site card:', error);
      return null;
    }
  }, []);

  // Load site cards when post is visible
  useEffect(() => {
    if (!inView || !post.post_text) return;

    const loadSiteCards = async () => {
      const urls = extractUrls(post.post_text);
      if (urls.length === 0) return;

      // Only process the first URL to avoid too many requests
      const firstUrl = urls[0];
      
      // Don't fetch for YouTube or Twitter/X URLs as they're already handled by the embedded player
      if (extractYoutubeVideoId(firstUrl) || extractTweetId(firstUrl)) return;
      
      const siteCardData = await fetchSiteCard(firstUrl);
      if (siteCardData) {
        setSiteCards([siteCardData]);
      }
    };

    loadSiteCards();
  }, [inView, post.post_text, extractUrls, fetchSiteCard]);

  // renderText関数をコンポーネント内に移動
  const renderText = (text: string | null): React.ReactNode => {
    if (!text) return null;
    
    const maxLength = 140;
    const shouldTruncate = !isExpanded && text.length > maxLength;
    const displayText = shouldTruncate ? `${text.slice(0, 60)}...` : text;

    // 半角<>で囲まれたURLを先に処理する
    const bracketedUrls: string[] = [];
    const textWithoutBracketed = displayText.replace(bracketedUrlRegex, (match, url) => {
      bracketedUrls.push(url);
      return `<${url}>`; // 元の形式を保持
    });
    
    // パターンを修正して、スペースの前後のルックアラウンドを改善
    const pattern = /(?<=^|\s)(#[^\s]+|https?:\/\/[^\s]+)(?=\s|$)|(?:^)(#[^\s]+|https?:\/\/[^\s]+)(?=\s|$)|(?<=\s)(#[^\s]+|https?:\/\/[^\s]+)(?:$)/g;
    const segments = textWithoutBracketed.split(pattern);
    const combined: React.ReactNode[] = [];
    const youtubeVideos: string[] = [];
    const tweetIds: string[] = [];
    const processedUrls: Set<string> = new Set(); // 処理済みURLを追跡するためのSet

    segments.forEach((segment, index) => {
      if (!segment) return;

      if (segment.startsWith('#')) {
        // ハッシュタグの処理
        combined.push(
          <a
            key={`tag-${index}`}
            href={`/search?searchText=${encodeURIComponent(segment.slice(1))}&searchType=hashtag`}
            className="text-blue-500 font-bold cursor-pointer hover:underline"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              router.push(`/search?searchText=${encodeURIComponent(segment.slice(1))}&searchType=hashtag`);
            }}
          >
            {segment}
          </a>
        );
      } else if (segment.match(/^https?:\/\//)) {
        // URLの処理 - 半角<>で囲まれていない場合のみ埋め込み
        const isBracketed = bracketedUrls.some(url => segment.includes(url));
        
        if (!isBracketed) {
          // 埋め込み対象：通常のURLのみ処理
          const videoId = extractYoutubeVideoId(segment);
          const tweetId = extractTweetId(segment);
          if (videoId) {
            youtubeVideos.push(videoId);
            processedUrls.add(segment); // 処理済みとしてマーク
          }
          if (tweetId) {
            tweetIds.push(tweetId);
            processedUrls.add(segment); // 処理済みとしてマーク
          }
        }
        
        // 全てのURLはリンクとして表示（埋め込みとして処理されるかどうかに関わらず）
        combined.push(
          <a
            key={`link-${index}`}
            href={segment}
            className="text-blue-500 hover:underline"
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
          >
            {segment}
          </a>
        );
      } else if (segment.match(/<https?:\/\/[^>]+>/)) {
        // 半角<>で囲まれたURLの処理 - リンクとして表示するが埋め込まない
        const url = segment.slice(1, -1); // < > を取り除く
        combined.push(
          <a
            key={`bracketed-link-${index}`}
            href={url}
            className="text-blue-500 hover:underline"
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
          >
            {segment}
          </a>
        );
      } else {
        // 通常のテキストの処理
        combined.push(<span key={`text-${index}`}>{segment}</span>);
      }
    });

    return (
      <div>
        <div className="whitespace-pre-wrap break-words text-base">
          {combined}
        </div>
        {youtubeVideos.map((videoId, index) => (
          <YouTubeEmbed key={`youtube-${index}`} videoId={videoId} />
        ))}
        {tweetIds.map((tweetId, index) => (
          <TwitterEmbed key={`tweet-${index}`} tweetId={tweetId} />
        ))}
        {/* サイトカードを表示 */}
        {siteCards.map((card, index) => (
          <SiteCard
            key={`site-card-${index}`}
            title={card.site_card_title}
            description={card.site_card_text}
            thumbnailId={card.site_card_thumbnail}
            url={card.url_text}
          />
        ))}
        {shouldTruncate ? (
          <div className="flex justify-center mt-2">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsExpanded(true);
              }}
              className="bg-blue-100 dark:bg-gray-600 dark:text-white text-blue-600 px-4 py-2 rounded-full hover:bg-blue-200 transition duration-200 text-sm"
            >
              続きを読む
            </button>
          </div>
        ) : (
          isExpanded && (
            <div className="flex justify-center mt-2">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsExpanded(false);
                }}
                className="bg-gray-100 dark:bg-gray-600 dark:text-white text-gray-600 px-4 py-2 rounded-full hover:bg-gray-200 transition duration-200 text-sm"
              >
                収納する
              </button>
            </div>
          )
        )}
      </div>
    );
  };

  const loadThumbnail = useCallback(async (fileId: string) => {
    if (!inView) return;
    
    const thumbnailUrl = `${process.env.NEXT_PUBLIC_SITE_DOMAIN}/api/drive/file/${fileId}/thumbnail`;
    setImageData(prev => ({
      ...prev,
      [fileId]: {
        ...prev[fileId],
        thumbnailUrl,
        loading: false
      }
    }));
  }, [inView]);

  const loadFullImage = useCallback(async (fileId: string) => {
    try {
      setImageData(prev => ({
        ...prev,
        [fileId]: { ...prev[fileId], status: 'loading' }
      }));

      const fullUrl = `${process.env.NEXT_PUBLIC_SITE_DOMAIN}/api/drive/file/${fileId}`;
      
      setImageData(prev => ({
        ...prev,
        [fileId]: {
          ...prev[fileId],
          fullUrl,
          loading: false,
          status: 'idle'
        }
      }));

      return fullUrl;
    } catch (error) {
      console.error('Error loading full image:', error);
      setImageData(prev => ({
        ...prev,
        [fileId]: { ...prev[fileId], status: 'error' }
      }));
      return `${process.env.NEXT_PUBLIC_SITE_DOMAIN}/api/drive/file/${fileId}`;
    }
  }, []);

  const handleImageClick = useCallback(async (fileId: string) => {
    try {
      setUiState(prev => ({
        ...prev,
        imageModalOpen: true,
        selectedImage: imageData[fileId]?.thumbnailUrl // 最初にサムネイルを表示
      }));

      const fullImageUrl = await loadFullImage(fileId);
      if (fullImageUrl) {
        setUiState(prev => ({
          ...prev,
          selectedImage: fullImageUrl
        }));
      }
    } catch (error) {
      console.error('Error in handleImageClick:', error);
      // エラー時はサムネイルを維持
    }
  }, [loadFullImage, imageData]);

  const handleCloseModal = useCallback(() => {
    setUiState(prev => ({
      ...prev,
      imageModalOpen: false,
      selectedImage: null
    }));
  }, []);

  useEffect(() => {
    if (!post.post_file) return;

    const files = Array.isArray(post.post_file)
      ? post.post_file
      : post.post_file.split(',').map(file => file.trim().replace(/^"|"$/g, ''));

    if (inView) {
      files.forEach(file => {
        const fileId = typeof file === "string" ? file.replace(/^\{?"|"?\}$/g, '') : file;
        loadThumbnail(fileId);
      });
    }
  }, [inView, post.post_file, loadThumbnail]);

  useEffect(() => {
    const currentImageData = { ...imageData };

    return () => {
      Object.values(currentImageData).forEach(data => {
        if (data?.thumbnailUrl) {
          URL.revokeObjectURL(data.thumbnailUrl);
        }
        if (data?.fullUrl) {
          URL.revokeObjectURL(data.fullUrl);
        }
      });
    };
  }, []); // 空の依存配列で、コンポーネントのマウント解除時のみ実行

  // 画像データが更新されたときのクリーンアップ
  useEffect(() => {
    const cleanup = () => {
      Object.values(imageData).forEach(data => {
        if (!data) return;
        if (data.thumbnailUrl && !document.querySelector(`img[src="${data.thumbnailUrl}"]`)) {
          URL.revokeObjectURL(data.thumbnailUrl);
        }
        if (data.fullUrl && !uiState.imageModalOpen) {
          URL.revokeObjectURL(data.fullUrl);
        }
      });
    };

    return cleanup;
  }, [imageData, uiState.imageModalOpen]);

  const toggleMenu = (event: React.MouseEvent): void => {
    event.stopPropagation();
    setUiState(prev => ({
      ...prev,
      menuOpen: !prev.menuOpen
    }));
  };

  const addNotification = (message: string) => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { id, message }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(notification => notification.id !== id));
    }, 5000);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  const copyLink = (): void => {
    const domain = process.env.NEXT_PUBLIC_SITE_DOMAIN || window.location.origin;
    const url = `${domain}/diary/${post.post_id}`;
    
    navigator.clipboard.writeText(url)
      .then(() => {
        addNotification("クリップボードにURLがコピーされました");
      })
      .catch((err) => {
        console.error("コピーに失敗しました", err);
        addNotification("コピーに失敗しました");
      });
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setUiState(prev => ({
          ...prev,
          menuOpen: false
        }));
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const formatText = (text: string | null): string => {
    if (!text) return '';
    return text;
  };

  const handleInternalDelete = async (event: React.MouseEvent, postId: string) => {
    event.stopPropagation();
    setUiState(prev => ({
      ...prev,
      deleteModalOpen: false
    }));
    await onDelete(event, postId);
    setUiState(prev => ({
      ...prev,
      menuOpen: false
    }));
  };

  const handleImageLoad = useCallback((fileId: string) => {
    setImageData(prev => ({ ...prev, [fileId]: { ...prev[fileId], loading: false } }));
  }, []);

  const handleRepost = async (event: React.MouseEvent) => {
    event.stopPropagation();
    
    const fileIds = post.post_file 
      ? Array.isArray(post.post_file)
        ? post.post_file
        : post.post_file.split(',').map(file => file.trim().replace(/^"|"$/g, ''))
      : [];
      
    const fileItems: FileItem[] = fileIds.map(fileId => ({
      id: fileId,
      isImage: true,
      contentType: '',
      name: `file-${fileId}`
    }));
    
    setUiState(prev => ({
      ...prev,
      repostModalOpen: false,
      menuOpen: false,
      postFormModalOpen: true
    }));
    
    setFormState({
      postText: post.post_text,
      mode: 'correct',
      files: fileItems
    });
  };

  // 引用投稿ハンドラーの更新
  const handleQuote = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    console.log('Quote mode triggered');
    setFormState({ postText: '', mode: 'quote', files: [] });
    setUiState(prev => ({
      ...prev,
      menuOpen: false,
      postFormModalOpen: true,
      postFormType: 'quote'
    }));
  }, []);

  // 返信投稿ハンドラーの更新
  const handleReply = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    console.log('Reply mode triggered');
    setFormState({ postText: '', mode: 'reply', files: [] });
    setUiState(prev => ({
      ...prev,
      menuOpen: false,
      postFormModalOpen: true,
      postFormType: 'reply'
    }));
  }, []);

  // 修正モード処理を追加
  const handleCorrectClick = () => {
    console.log('Correct mode triggered for post:', post);
    onCorrect && onCorrect(post);
  };

  const renderImages = useCallback(() => {
    if (!post.post_file) return null;

    const files = Array.isArray(post.post_file)
      ? post.post_file
      : post.post_file.split(',').map(file => file.trim().replace(/^"|"$/g, ''));

    return (
      <div className={`mt-4 ${files.length === 1 ? 'w-full' : 'grid grid-cols-2 gap-2'}`}>
        {files.map(file => {
          const rawFileId = typeof file === "string" ? file : String(file);
          const fileId = rawFileId.replace(/[{}"\[\]]/g, '');
          
          const data = imageData[fileId];

          return (
            <div key={fileId} className="relative w-full aspect-video bg-gray-200 rounded overflow-hidden">
              {(!data?.thumbnailUrl) ? (
                <div className="animate-pulse w-full h-full bg-gray-300 flex items-center justify-center">
                  <span className="text-gray-600">読み込み中...</span>
                </div>
              ) : (
                <div className="relative w-full h-full">
                  <Image
                    src={data.thumbnailUrl}
                    alt={`Post image ${fileId}`}
                    width={300}
                    height={200}
                    loading="lazy"
                    className="cursor-pointer object-contain w-full h-full"
                    onClick={() => handleImageClick(fileId)}
                    onLoad={() => handleImageLoad(fileId)}
                  />
                  {data.status === 'loading' && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                      <span className="text-white">画像を読み込み中...</span>
                    </div>
                  )}
                  {data.status === 'error' && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                      <span className="text-white">読み込みに失敗しました</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }, [post.post_file, imageData, handleImageClick, handleImageLoad]);

  const navigateToDetail = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    setUiState(prev => ({
      ...prev,
      menuOpen: false,
      detailModalOpen: true
    }));
  }, []);

  // 返信元投稿のレンダリング関数を修正
  const renderReplyBody = useCallback(() => {
    // reply_bodyがnullまたはpost_idがnullの場合は何も表示しない
    if (!post.reply_body || !post.reply_body.post_id) return null;
    
    return (
      <div className="mb-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg opacity-75">

        <div className="text-sm">
          {renderText(post.reply_body.post_text)}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {formatDate(post.reply_body.post_createat)}
          
        </div>
      </div>
    );
  }, [post.reply_body, formatDate]);

  // renderRepostBodyを修正
  const renderRepostBody = useCallback(() => {
    // repost_bodyがnullまたはpost_idがnullの場合は何も表示しない
    if (!post.repost_body || !post.repost_body.post_id) return null;

    return (
      <div className="mt-2 p-2 border border-gray-200 dark:border-gray-600 rounded-lg">
        <div className="text-sm">
          {renderText(post.repost_body.post_text)}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {post.repost_body.post_createat && formatDate(new Date(post.repost_body.post_createat).toISOString())}
        </div>
      </div>
    );
  }, [post.repost_body, formatDate]);

  const [posts, setPosts] = useState<PostFeedPost[]>([]);

  // handleFiles関数を追加
  const handleFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    console.log('Files selected in PostCard:', files);
    
    // ファイル選択時の処理
    // 実際のファイル処理はPostFormPopup内で行われるため、
    // 必要に応じてここに追加の処理を記述
  }, []);

  // 既存ファイル選択用のハンドラを追加
  const [existingFileSelector, setExistingFileSelector] = useState<boolean>(false);
  const [driveFiles, setDriveFiles] = useState<any[]>([]);

  // 既存ファイル選択ハンドラ
  const handleSelectExistingFiles = useCallback(async () => {
    try {
      setExistingFileSelector(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_DOMAIN}/api/drive/file_list`);
      if (response.ok) {
        const data = await response.json();
        setDriveFiles(data.files || []);
      } else {
        console.error('Failed to fetch file list');
      }
    } catch (error) {
      console.error('Error fetching file list:', error);
    }
  }, []);

  // 既存ファイル選択時のハンドラ
  const handleSelectFile = useCallback((fileId: string | number) => {
    const file = driveFiles.find(f => f.file_id === fileId);
    const contentType = file?.content_type || 'application/octet-stream';
    const isImage = contentType.startsWith('image/');
    
    setFormState(prev => {
      if (prev.files.some(f => f.id === fileId)) {
        return prev;
      }
      return {
        ...prev,
        files: [
          ...prev.files,
          {
            id: fileId,
            name: file?.file_name || `file-${fileId}`,
            contentType,
            isImage,
            isExisting: true
          }
        ]
      };
    });
    
    setExistingFileSelector(false);
  }, [driveFiles]);
  
  return (
    <>
      {/* メインの投稿カードコンテナ - Intersection Observer用のref付与 */}
      <div ref={ref} className="w-full">
        {/* 投稿カード - ホバー効果とダークモード対応付き */}
        <div className={`block bg-white dark:bg-gray-800 shadow-md rounded-lg p-3 sm:p-4 hover:bg-gray-50 dark:hover:bg-gray-700 relative mt-4 w-full max-w-md mx-auto break-words text-[color:rgb(var(--foreground))]`}>
          {/* 通知コンポーネント - 一時的なメッセージ表示用 */}
          <Notification 
            notifications={notifications} 
            onClose={removeNotification}
          />

          {/* メニューボタン - 右上に配置 */}
          <div className="absolute top-1 right-4 z-10">
            <button onClick={toggleMenu} className="p-1 text-gray-700 dark:text-gray-300"> {/* p-2 を p-1 に変更 */}
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"> {/* w-8 h-8 を w-6 h-6 に変更 */}
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
              </svg>
            </button>
          </div>

          {/* ドロップダウンメニュー - メニューボタンクリック時に表示 */}
          {uiState.menuOpen && (
            <div ref={menuRef} className="absolute top-11 right-4 bg-white shadow-lg rounded-lg p-2 z-20 dark:bg-gray-900">
              <ul>
                {/* 共通機能 - すべてのユーザーが利用可能 */}
                <li className="text-sm py-2 px-4 hover:bg-gray-100 hover:rounded-lg cursor-pointer dark:text-gray-100 dark:hover:bg-gray-800"
                    onClick={copyLink}>
                  リンクをコピー
                </li>
                <li className="text-sm py-2 px-4 hover:bg-gray-100 hover:rounded-lg cursor-pointer dark:text-gray-100 dark:hover:bg-gray-800"
                    onClick={navigateToDetail}>
                  詳細
                </li>
                {/* ログインユーザー専用機能 */}
                {isLoggedIn && (
                  <>
                    <li className="text-sm py-2 px-4 hover:bg-gray-100 hover:rounded-lg cursor-pointer dark:text-gray-100 dark:hover:bg-gray-800"
                        onClick={handleQuote}>
                      引用投稿
                    </li>
                    <li className="text-sm py-2 px-4 hover:bg-gray-100 hover:rounded-lg cursor-pointer dark:text-gray-100 dark:hover:bg-gray-800"
                        onClick={handleReply}>
                      返信投稿
                    </li>
                    <li className="text-sm py-2 px-4 hover:bg-gray-100 hover:rounded-lg cursor-pointer dark:text-gray-100 dark:hover:bg-gray-800"
                        onClick={() => setUiState(prev => ({
                          ...prev,
                          deleteModalOpen: true
                        }))}>
                      削除
                    </li>
                    <li className="text-sm py-2 px-4 hover:bg-gray-100 hover:rounded-lg cursor-pointer dark:text-gray-100 dark:hover:bg-gray-800"
                        onClick={() => setUiState(prev => ({
                          ...prev,
                          repostModalOpen: true
                        }))}>
                      削除して再投稿
                    </li>
                  </>
                )}
              </ul>
            </div>
          )}

          {/* モーダルコンポーネント群 - 各種操作用のポップアップ */}
          <DeleteConfirmModal
            isOpen={uiState.deleteModalOpen}
            onClose={() => setUiState(prev => ({
              ...prev,
              deleteModalOpen: false
            }))}
            onDelete={() => {
              if (handleDelete) {
                handleDelete(post.post_id).catch(error => {
                  console.error('Error handling delete:', error);
                });
              }
            }}
          />

          {/* 再投稿確認モーダル */}
          <DeleteConfirmModal
            isOpen={uiState.repostModalOpen}
            onClose={() => setUiState(prev => ({
              ...prev,
              repostModalOpen: false
            }))}
            onDelete={handleRepost}
            title="削除して再投稿"
            message="この投稿を削除して再投稿しますか？"
            confirmText="再投稿"
          />

          {/* 画像表示モーダル - z-indexを高めに設定して最前面表示 */}
          <ImageModal
            isOpen={uiState.imageModalOpen}
            imageUrl={uiState.selectedImage}
            onClose={handleCloseModal}
            className="z-[10000]"
          />

          {/* 投稿本文エリア */}
          <div>
            {/* 返信元投稿の表示 */}
            {renderReplyBody()}
            {/* 投稿日時の表示 */}
            <div className="text-gray-500 text-sm break-words">
              {formatDate(post.post_createat)}
            </div>

            {/* メイン投稿テキストの表示 */}
            <div className="mt-2 break-words">
              {renderText(post.post_text)}
            </div>

            {/* 画像の表示 - Intersection Observerと連動 */}
            {inView && renderImages()}
            {/* 引用元投稿の表示 */}
            {renderRepostBody()}
          </div>
        </div>
      </div>
      
      {/* 投稿詳細ポップアップ */}
      <PostCardPopup
        isOpen={uiState.detailModalOpen}
        onClose={() => setUiState(prev => ({ ...prev, detailModalOpen: false }))}
        post={post}
        isLoggedIn={isLoggedIn}
        handleDeleteClick={handleDeleteClick}
        formatDate={formatDate}
        onDelete={onDelete}
        onRepost={onRepost}
        onQuote={onQuote}
        onReply={onReply}
      />

      {/* 投稿フォームポップアップ - 引用・返信投稿用 */}
      <PostFormPopup
        isOpen={uiState.postFormModalOpen}
        onClose={() => setUiState(prev => ({ ...prev, postFormModalOpen: false }))}
        postText={formState.postText}
        setPostText={(text) => setFormState(prev => ({ ...prev, postText: text }))}
        handleSubmit={async (e, finalText, targetPostId, mode, originalReplyId, originalRepostId) => {
          e.preventDefault();
          console.log('PostCard: handleSubmit called with:', { finalText, targetPostId, mode, originalReplyId, originalRepostId});
          try {
            if (mode === 'correct') {
              // 元の投稿を削除
              if (!handleDelete) {
                console.error('handleDelete function is not provided');
                return;
              }
              
              if (!post) {
                console.error('targetPost is not provided');
                return;
              }
              
              // 投稿を削除前に現在のファイル情報を保持
              const currentFiles = [...formState.files];
              
              console.log('Starting repost process in correct mode');
              

              // 修正バージョン - より安全な型チェックと変換を行う

              const payload = {
                post_text: finalText,
                // ファイルIDの配列を追加（存在する場合のみ）
                ...(currentFiles.length > 0 && { 
                  post_file: currentFiles.map(file => {
                    // ファイルIDを適切にクリーニング
                    return typeof file.id === 'string' ? file.id.replace(/[{}"\[\]]/g, '') : file.id;
                  }) 
                }),
                // originalRepostIdの処理を改善 - 安全な型チェックと変換
                ...(originalRepostId ? { 
                  repost_id: Array.isArray(originalRepostId) 
                    ? (originalRepostId.length > 0 && originalRepostId[0] != null)
                      ? String(originalRepostId[0])  // Stringコンストラクタで明示的に変換
                      : null 
                    : (originalRepostId != null)
                      ? String(originalRepostId)  // Stringコンストラクタで明示的に変換
                      : null
                } : {}),

                // originalReplyIdの処理を改善 - より安全な型変換とnull/undefined処理
                ...(originalReplyId ? (() => {
                  // originalReplyIdが配列の場合
                  if (Array.isArray(originalReplyId)) {
                    // 配列が空でなく、最初の要素がnullでない場合
                    if (originalReplyId.length > 0 && originalReplyId[0] != null) {
                      // 最初の要素がオブジェクトでない場合のみ使用
                      if (typeof originalReplyId[0] !== 'object') {
                        return { reply_id: String(originalReplyId[0]) };
                      }
                    }
                    // それ以外の場合は何も追加しない
                    return {};
                  } 
                  // 配列でなく、nullでなく、オブジェクトでない場合
                  else if (originalReplyId != null && typeof originalReplyId !== 'object') {
                    return { reply_id: String(originalReplyId) };
                  }
                  // それ以外の場合は何も追加しない
                  return {};
                })() : {})
              };


              console.log('Sending repost payload with files:', payload);
              
              // 新規投稿を作成
              const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_DOMAIN}/api/post/post_create`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload),
                credentials: 'include'
              });
              
              if (!response.ok) {
                throw new Error('Failed to create repost');
              }
              
              const newPost = await response.json();
              addNotification('投稿を修正しました');
              console.log('New post created as correction:', newPost);
              
              // モーダルを閉じて状態をリセット
              setUiState(prev => ({ ...prev, postFormModalOpen: false }));
              setFormState({ postText: '', mode: 'normal', files: [] });
              
              // 親コンポーネントにページの更新を通知するなどの処理が必要な場合はここに追加
              
            } else if (onQuoteSubmit && (mode === 'quote' || mode === 'reply') && post.post_id) {
              // ファイル情報を含めて引用・返信投稿を作成
              const payload = {
                post_text: finalText,
                // 添付ファイルがある場合は追加
                ...(formState.files.length > 0 && {
                  post_file: formState.files.map(file => {
                    return typeof file.id === 'string' ? file.id.replace(/[{}"\[\]]/g, '') : file.id;
                  })
                })
              };
              
              console.log(`Sending ${mode} payload with files:`, payload);
              
              // 親コンポーネントの引用・返信処理を呼び出し
              await onQuoteSubmit(finalText, mode, post.post_id, formState.files);
              addNotification(`${mode === 'quote' ? '引用' : '返信'}投稿を作成しました`);
              
              // モーダルを閉じて状態をリセット
              setUiState(prev => ({ ...prev, postFormModalOpen: false }));
              setFormState({ postText: '', mode: 'normal', files: [] });
            }
          } catch (error) {
            console.error('Error in form submission:', error);
            const modeText = mode === 'correct' ? '再投稿' : mode === 'quote' ? '引用投稿' : '返信投稿';
            addNotification(`${modeText}の作成に失敗しました`);
          }
        }}
        mode={formState.mode}
        targetPost={post}
        files={formState.files}
        isLoggedIn={isLoggedIn}
        status=""
        onSelectExistingFiles={handleSelectExistingFiles} // 既存ファイル選択ハンドラを渡す
        fixedHashtags=""
        setFixedHashtags={() => {}}
        autoAppendTags={false}
        setAutoAppendTags={() => {}}
        handleCancelAttach={(fileId) => {
          setFormState(prev => ({
            ...prev,
            files: prev.files.filter(f => f.id !== fileId)
          }))
        }}
        handleDeletePermanently={(fileId) => {
          setFormState(prev => ({
            ...prev,
            files: prev.files.filter(f => f.id !== fileId)
          }))
        }}
        setFiles={(newFiles) => setFormState(prev => ({ 
          ...prev, 
          files: Array.isArray(newFiles) ? newFiles : newFiles(prev.files) 
        }))}
        handleDelete={handleDelete}
        handleFiles={handleFiles}  // 必須のhandleFilesプロパティを追加
      />


      {/* 既存ファイル選択モーダルを追加 */}
      {existingFileSelector && (
        
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          
          <div className="bg-white dark:bg-gray-800 rounded-lg w-11/12 max-w-2xl p-6 relative max-h-[80vh] overflow-y-auto">
            <button
              className="absolute top-4 right-4 text-gray-600 dark:text-gray-300"
              onClick={() => setExistingFileSelector(false)}
            >
              ×
            </button>
            <h2 className="text-xl font-bold mb-4">ファイルを選択（試験）</h2>
            {driveFiles.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {driveFiles.map((file) => (
                  <div
                    key={file.file_id}
                    className="border rounded p-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={() => handleSelectFile(file.file_id)}
                  >
                    <div className="w-full aspect-video bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                    {(() => {
                      // ファイルが画像かどうかを判定するヘルパー関数
                      {console.log('File selector modal opened', driveFiles)}
                      const isImageFile = (file: any) => {
                        // デバッグ情報を常に出力
                        console.log('Checking file type:', file.file_id, 'file_name:', file.file_name, 'content_type:', file.content_type);
                        
                        // 1. content_typeプロパティを確認
                        if (file.content_type && file.content_type.startsWith('image/')) {
                          return true;
                        }
                        
                        // 2. file_nameから拡張子で判定
                        const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'avif', 'heif', 'heic'];
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
                        
                        console.log('Not an image file: file_id:', file.file_id, 'file_name:', file.file_name, 'content_type:', file.content_type);
                        return false;
                      };

                      return isImageFile(file) ? (
                      <img
                        src={`${process.env.NEXT_PUBLIC_SITE_DOMAIN}/api/drive/file/${file.file_id}/thumbnail`}
                        alt={`File ${file.file_id}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                        // エラー時のフォールバック表示
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        
                        // 親要素のクリア
                        const parent = target.parentElement;
                        if (parent) {
                          // フォールバック表示用の要素を追加
                          const fallback = document.createElement('div');
                          fallback.className = 'flex h-full w-full items-center justify-center';
                          fallback.innerHTML = '<span class="text-gray-500">プレビューを読み込めません</span>';
                          {parent.appendChild(fallback);}
                        }
                        }}
                        loading="lazy"
                      />
                      ) : (
                      <div className="text-gray-500 text-center p-2 w-full h-full flex items-center justify-center">
                        {(file.file_name || `ファイル`).split('.').pop()?.toUpperCase() || 'FILE'}
                      </div>
                      );
                    })()}
                    </div>
                    <div className="text-sm truncate mt-1">
                      <div className="font-medium">{file.file_name || `ファイル ${file.file_id}`}</div>
                      <div className="text-xs text-gray-500">ID: {file.file_id}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center">ファイルが見つかりません</p>
            )}
          </div>
        </div>
      )}
    </>
  );
});

Card.displayName = 'Card';

export default Card;
