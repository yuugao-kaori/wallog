'use client'

import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import PostCardPopup from './PostCardPopup';
import { useInView } from 'react-intersection-observer';
import { Post as PostFeedPost } from '@/components/PostFeed';  // 追加
import PostFormPopup from './PostFormPopup';  // PostFormModalの代わりに使用

const DeleteConfirmModal = dynamic(() => import('./DeleteConfirmModal'));
const ImageModal = dynamic(() => import('./ImageModal'));
const Notification = dynamic(() => import('./Notification'));
// 既存のPostインターフェースを削除し、PostFeedのものを使用
interface Props {
  post: PostFeedPost;  // 変更
  isLoggedIn: boolean;
  handleDeleteClick: (event: React.MouseEvent, postId: string) => void;
  formatDate: (date: string) => string;
  formatHashtags?: (text: string) => string;
  renderHashtagsContainer?: (text: string) => React.ReactNode;
  className?: string;
  onDelete: (event: React.MouseEvent, post_id: string) => Promise<boolean>;
  onRepost?: (post: PostFeedPost) => Promise<void>;  // 変更
  onQuote?: (post: PostFeedPost) => void;
  onReply?: (post: PostFeedPost) => void;
  onQuoteSubmit?: (text: string, type: 'quote' | 'reply', targetPostId: string) => Promise<void>;
  handleDelete?: (postId: string) => Promise<boolean>; // 追加: handleDelete をプロパティに追加
}

interface ImageData {
  fileId: string;
  thumbnailUrl: string | null;
  fullUrl: string | null;
  loading: boolean;
  status: 'idle' | 'loading' | 'error';
}

// YouTube URLからビデオIDを抽出する関数を修正
const extractYoutubeVideoId = (url: string): string | null => {
  console.log('Attempting to extract video ID from:', url); // デバッグログ追加

  const patterns = [
    /((?:https?:\/\/)?(?:www\.)?youtube\.com\/(?:shorts|live|embed|watch\?.*v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    console.log('Match result:', match); // デバッグログ追加
    if (match && match[2]) { // [1]から[2]に変更
      console.log('Extracted video ID:', match[2]); // デバッグログ追加
      return match[2];
    }
  }
  console.log('No video ID found'); // デバッグログ追加
  return null;
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

const Card = memo(({ post, isLoggedIn, handleDeleteClick, formatDate, formatHashtags, renderHashtagsContainer, className, onDelete, onRepost, onQuote, onReply, onQuoteSubmit, handleDelete }: Props) => {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1
  });

  // hydration errorを防ぐため、useEffectで初期化
  const [imageData, setImageData] = useState<Record<string, ImageData>>({});
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
    mode: 'normal' as 'normal' | 'quote' | 'reply' | 'correct'
  });

  // 追加: テキストの展開状態を管理
  const [isExpanded, setIsExpanded] = useState(false);

  // 追加: テキストを制限する関数
  const truncateText = (text: string, limit: number = 60): string => {
    if (!text || text.length <= limit) return text;
    return text.slice(0, limit);
  };

  const handleHashtagClick = useCallback((hashtag: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const searchText = hashtag.slice(1); // # を除去
    router.push(`/search?searchText=${encodeURIComponent(searchText)}&searchType=hashtag`);
  }, [router]);

  // renderText関数を修正
  const renderText = (text: string | null): React.ReactNode => {
    if (!text) return null;
    
    // 文字数制限とテキストの省略処理を追加
    const maxLength = 140;
    const shouldTruncate = !isExpanded && text.length > maxLength;
    const displayText = shouldTruncate ? `${text.slice(0, 60)}...` : text;
    
    if (renderHashtagsContainer) {
      return (
        <div>
          {renderHashtagsContainer(displayText)}
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
    }
    
    // 通常のテキスト処理
    const pattern = /(https?:\/\/[^\s]+)|(?<=^|\s)(#[^\s]+)(?=\s|$)/g;
    const parts = displayText.split(pattern).filter(Boolean);
    const matches = displayText.match(pattern) || [];
    const combined = [];
    const youtubeVideos: string[] = [];

    let i = 0;
    let j = 0;
    while (i < parts.length || j < matches.length) {
      // 通常のテキスト部分を追加
      if (i < parts.length) {
        combined.push(<span key={`text-${i}`}>{parts[i]}</span>);
        i++;
      }

      // URLまたはハッシュタグを処理
      if (j < matches.length) {
        const match = matches[j];
        console.log('Detected URL or hashtag:', match); // デバッグログを追加

        if (match.startsWith('#')) {
          combined.push(
            <a
              key={`tag-${j}`}
              href={`/search?searchText=${encodeURIComponent(match.slice(1))}&searchType=hashtag`}
              className="text-blue-500 font-bold hover:underline"
              onClick={(e) => {
                e.preventDefault();
                handleHashtagClick(match, e);
              }}
            >
              {match}
            </a>
          );
        } else {
          // URLの処理
          const videoId = extractYoutubeVideoId(match);
          console.log('Extracted YouTube video ID:', videoId); // デバッグログを追加

          if (videoId) {
            console.log('Found YouTube video, adding to embed list:', videoId); // デバッグログを追加
            youtubeVideos.push(videoId);
          }
          combined.push(
            <a
              key={`link-${j}`}
              href={match}
              className="text-blue-500 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
            >
              {match}
            </a>
          );
        }
        j++;
      }
    }

    return (
      <div>
        <div className="whitespace-pre-wrap break-words text-base">
          {combined}
        </div>

        {/* YouTube埋め込みプレイヤーを表示 */}
        {youtubeVideos.map((videoId, index) => (
          <YouTubeEmbed key={`youtube-${index}`} videoId={videoId} />
        ))}

        {shouldTruncate ? (
          <div className="flex justify-center mt-2">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsExpanded(true);
              }}
              className="bg-blue-100 text-blue-600 px-4 py-2 rounded-full hover:bg-blue-200 transition duration-200 text-sm"
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
                className="bg-gray-100 text-gray-600 px-4 py-2 rounded-full hover:bg-gray-200 transition duration-200 text-sm"
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
    const url = `${domain}/post/${post.post_id}`;
    
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

  const formatText = (text: string | null): React.ReactNode => {
    if (!text) return null;
    return formatHashtags ? formatHashtags(text) : text;
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
    setUiState(prev => ({
      ...prev,
      repostModalOpen: false,
      menuOpen: false,
      postFormModalOpen: true  // フォームを開く
    }));
    setFormState({
      postText: post.post_text,  // 元の投稿テキストを設定
      mode: 'correct'  // correct モードを設定
    });
  };

  // 引用投稿ハンドラーの更新
  const handleQuote = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    setFormState({ postText: '', mode: 'quote' });
    setUiState(prev => ({
      ...prev,
      menuOpen: false,
      postFormModalOpen: true
    }));
  }, []);

  // 返信投稿ハンドラーの更新
  const handleReply = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    setFormState({ postText: '', mode: 'reply' });
    setUiState(prev => ({
      ...prev,
      menuOpen: false,
      postFormModalOpen: true
    }));
  }, []);

  const renderImages = useCallback(() => {
    if (!post.post_file) return null;

    const files = Array.isArray(post.post_file)
      ? post.post_file
      : post.post_file.split(',').map(file => file.trim().replace(/^"|"$/g, ''));

    return (
      <div className={`mt-4 ${files.length === 1 ? 'w-full' : 'grid grid-cols-2 gap-2'}`}>
        {files.map(file => {
          const fileId = typeof file === "string" ? file.replace(/^\{?"|"?\}$/g, '') : file;
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

  // 引用元投稿のレンダリング関数を修正
  const renderRepostBody = useCallback(() => {
    // repost_bodyがnullまたはpost_idがnullの場合は何も表示しない
    if (!post.repost_body || !post.repost_body.post_id) return null;

    return (
      <div className="mt-2 p-2 border border-gray-200 dark:border-gray-600 rounded-lg">
        <div className="text-sm">
          {renderText(post.repost_body.post_text)}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {formatDate(post.repost_body.post_createat)}
        </div>
      </div>
    );
  }, [post.repost_body, formatDate]);

  const [posts, setPosts] = useState<PostFeedPost[]>([]);
  return (
    <>
      <div ref={ref} className="w-full">
        <div className={`block bg-white dark:bg-gray-800 shadow-md rounded-lg p-3 sm:p-4 hover:bg-gray-50 dark:hover:bg-gray-700 relative mt-4 w-full max-w-md mx-auto break-words text-[color:rgb(var(--foreground))] ${className}`}>
          <Notification 
            notifications={notifications} 
            onClose={removeNotification}
          />

          <div className="absolute top-1 right-4 z-10">
            <button onClick={toggleMenu} className="p-1 text-gray-700 dark:text-gray-300"> {/* p-2 を p-1 に変更 */}
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"> {/* w-8 h-8 を w-6 h-6 に変更 */}
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
              </svg>
            </button>
          </div>

          {uiState.menuOpen && (
            <div ref={menuRef} className="absolute top-11 right-4 bg-white shadow-lg rounded-lg p-2 z-20 dark:bg-gray-900">
              <ul>
                <li className="text-sm py-2 px-4 hover:bg-gray-100 hover:rounded-lg cursor-pointer dark:text-gray-100 dark:hover:bg-gray-800"
                    onClick={copyLink}>
                  リンクをコピー
                </li>
                <li className="text-sm py-2 px-4 hover:bg-gray-100 hover:rounded-lg cursor-pointer dark:text-gray-100 dark:hover:bg-gray-800"
                    onClick={navigateToDetail}>
                  詳細
                </li>
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

          <DeleteConfirmModal
            isOpen={uiState.deleteModalOpen}
            onClose={() => setUiState(prev => ({
              ...prev,
              deleteModalOpen: false
            }))}
            onDelete={() => { // 修正: 引数を1つに変更
              if (handleDelete) {
                handleDelete(post.post_id).catch(error => {
                  console.error('Error handling delete:', error);
                });
              }
            }}
          />

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

          <ImageModal
            isOpen={uiState.imageModalOpen}
            imageUrl={uiState.selectedImage}
            onClose={handleCloseModal}
            className="z-[10000]"  // z-indexを10000に変更
          />

          <div>
            {renderReplyBody()} {/* 返信元投稿を表示 */}
            <div className="text-gray-500 text-sm break-words">
              Created at: {formatDate(post.post_createat)}
            </div>

            <div className="mt-2 break-words">
              {renderText(post.post_text)}
            </div>

            {inView && renderImages()}
            {renderRepostBody()} {/* 引用元投稿を表示 */}
          </div>
        </div>
      </div>
      
      <PostCardPopup
        isOpen={uiState.detailModalOpen}
        onClose={() => setUiState(prev => ({ ...prev, detailModalOpen: false }))}
        post={post}
        isLoggedIn={isLoggedIn}
        handleDeleteClick={handleDeleteClick}
        formatDate={formatDate}
        formatHashtags={formatHashtags}
        renderHashtagsContainer={renderHashtagsContainer}
        onDelete={onDelete}
        onRepost={onRepost}
        onQuote={onQuote}
        onReply={onReply}
      />

      <PostFormPopup
        isOpen={uiState.postFormModalOpen}
        onClose={() => setUiState(prev => ({ 
          ...prev, 
          postFormModalOpen: false
        }))}
        postText={formState.postText}
        setPostText={(text) => setFormState(prev => ({ ...prev, postText: text }))}
        setFiles={() => {}} // Add empty function as placeholder
        handleSubmit={async (e, finalText) => {
          e.preventDefault();
          try {
            // correct モードの場合、まず投稿を削除
            if (formState.mode === 'correct') {
              // 削除処理を post_delete エンドポイントを使用するように修正
              const deleteResponse = await fetch('/api/post/post_delete', {
                method: 'DELETE',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ post_id: post.post_id }),
              });

              if (!deleteResponse.ok) {
                addNotification('削除に失敗しました');
                return;
              }

              // 投稿一覧からも削除
              setPosts(prevPosts => prevPosts.filter(p => p.post_id !== post.post_id));

              // 新規投稿を作成
              const createResponse = await fetch('/api/post/post_create', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  post_text: finalText
                })
              });

              if (!createResponse.ok) {
                throw new Error('新規投稿の作成に失敗しました');
              }

              addNotification('投稿を修正しました');
              setUiState(prev => ({ ...prev, postFormModalOpen: false }));
            } else if (onQuoteSubmit && (formState.mode === 'quote' || formState.mode === 'reply')) {
              // 引用と返信の処理
              await onQuoteSubmit(finalText, formState.mode, post.post_id);
              setUiState(prev => ({ ...prev, postFormModalOpen: false }));
            }
          } catch (error) {
            console.error('Error in form submission:', error);
            addNotification('処理に失敗しました');
          }
        }}
        mode={formState.mode}
        targetPost={post}
        handleDelete={handleDelete} // 追加
        isLoggedIn={isLoggedIn}
        files={[]}
        handleFiles={() => {}}
        handlePostDelete={async (fileId) => {
          // Assuming fileId is a number, we create a dummy event
          const dummyEvent = new MouseEvent('click') as unknown as React.MouseEvent;
          return await onDelete(dummyEvent, fileId.toString());
        }}
        status=""
        onSelectExistingFiles={() => {}}
        fixedHashtags=""
        setFixedHashtags={() => {}}
        autoAppendTags={false}
        setAutoAppendTags={() => {}}
        handleCancelAttach={() => {}} // 追加: ファイル添付のキャンセル処理
        handleDeletePermanently={() => {}} // 追加: ファイルの完全削除処理
      />
    </>
  );
});

Card.displayName = 'Card';

export default Card;
