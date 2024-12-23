'use client'

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/PostCard';
import axios from 'axios';
import dynamic from 'next/dynamic';

// 動的インポートでNotificationコンポーネントを読み込む
const Notification = dynamic(() => import('@/components/Notification'), {
  ssr: false
});

export interface Post {
  post_id: string;
  post_text: string;
  post_file?: string | string[];
  post_createat: string;
  title?: string;
  created_at: string;
  // 他の必要なプロパティを追加
  reply_body?: {
    post_id: string;
    post_text: string;
    post_file?: string | string[];
    post_createat: string;
    user_id: string;
  };
  repost_body?: {
    post_id: string;
    post_text: string;
    post_file?: string | string[];
    post_createat: string;
    user_id: string;
  };
}

interface PostFeedProps {
  posts: Post[];
  setPosts: React.Dispatch<React.SetStateAction<Post[]>>;
  isLoggedIn: boolean;
  loading: boolean;
  hasMore: boolean;
  loadMorePosts: () => Promise<void>;
  onRepost?: (post: Post) => Promise<void>;  // 追加
}

const PostFeed: React.FC<PostFeedProps> = ({ 
  posts, 
  setPosts, 
  isLoggedIn, 
  loading, 
  hasMore, 
  loadMorePosts, 
  onRepost 
}) => {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [newPostsAvailable, setNewPostsAvailable] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedPostId, setSelectedPostId] = useState<string>('');
  const [accumulatedNewPosts, setAccumulatedNewPosts] = useState<Post[]>([]);
  const [notifications, setNotifications] = useState<{ id: string; message: string; }[]>([]);
  const lastPostRef = useRef<HTMLDivElement>(null);

  const addNotification = useCallback((message: string) => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { id, message }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(notification => notification.id !== id));
    }, 3000);
  }, []);

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  const handleBackButtonClick = (): void => {
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
    setPosts((prevPosts) => {
      const updatedPosts = [...accumulatedNewPosts, ...prevPosts];
      return updatedPosts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    });
    setAccumulatedNewPosts([]);
    setNewPostsAvailable(false);
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Date unavailable';
    return date.toLocaleString();
  };

  const renderHashtagsContainer = useCallback((text: string): React.ReactNode => {
    if (typeof text !== 'string') return null;

    const pattern = /(?<=^|\s)(#[^\s]+|https?:\/\/[^\s]+)(?=\s|$)/;
    const parts = text.split(pattern);

    return (
      <div className="whitespace-pre-wrap break-words">
        {parts.map((part, index) => {
          if (part.match(/^#[^\s]+$/)) {
            const tag = part.slice(1); // # を除去
            return (
              <a
                key={index}
                href={`/search?searchText=${encodeURIComponent(tag)}&searchType=hashtag`}
                className="text-blue-500 font-bold cursor-pointer hover:underline"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  router.push(`/search?searchText=${encodeURIComponent(tag)}&searchType=hashtag`);
                }}
              >
                {part}
              </a>
            );
          } else if (part.match(/^https?:\/\/[^\s]+$/)) {
            return (
              <a
                key={index}
                href={part}
                className="text-blue-500 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
              >
                {part}
              </a>
            );
          }
          return <span key={index}>{part}</span>;
        })}
      </div>
    );
  }, [router]);

  const handleDeleteClick = async (event: React.MouseEvent, postId: string): Promise<boolean> => {
    event.stopPropagation();
    try {
      const response = await fetch('/api/post/post_delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ post_id: postId }),
      });

      if (response.ok) {
        // 投稿の削除成功時の処理
        setPosts(prevPosts => prevPosts.filter(post => post.post_id !== postId));
        addNotification('投稿を削除しました');
        return true;
      } else {
        // 削除失敗時の処理
        addNotification('投稿の削除に失敗しました');
        return false;
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      addNotification('投稿の削除に失敗しました');
      return false;
    }
  };

  const fetchImagesForPost = async (postId: string): Promise<string[]> => {
    try {
      const response = await axios.get(`/api/posts/${postId}/images`);
      return response.data;
    } catch (error) {
      console.error("Error fetching images for post:", error);
      return [];
    }
  };

  const confirmDelete = async (): Promise<void> => {
    // 投稿削除後、postsステートから該当の投稿を削除
    setPosts(prevPosts => prevPosts.filter(post => post.post_id !== selectedPostId));
    setIsModalOpen(false);
  };

  const MemoizedCard = useMemo(() => Card, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          // 最後の投稿のIDを取得
          const lastPostId = posts.length > 0 ? posts[posts.length - 1].post_id : undefined;
          loadMorePosts();
        }
      },
      { threshold: 0.5 }
    );

    if (lastPostRef.current) {
      observer.observe(lastPostRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [hasMore, loading, loadMorePosts, posts]);

  const handleDelete = async (postId: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/post/post_delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ post_id: postId }),
      });

      if (response.ok) {
        setPosts(prevPosts => prevPosts.filter(post => post.post_id !== postId));
        addNotification('投稿を削除しました');
        return true;
      } else {
        addNotification('投稿の削除に失敗しました');
        return false;
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      addNotification('投稿の削除に失敗しました');
      return false;
    }
  };
  return (
    <div className="h-full overflow-y-auto overflow-x-hidden scrollbar-hide md:px-2">
      <Notification
        notifications={notifications}
        onClose={removeNotification}
      />
      {posts.map((post, index) => (
        <div 
          key={post.post_id}
          ref={index === posts.length - 1 ? lastPostRef : null}
        >
          <MemoizedCard
            post={post}
            onDelete={handleDeleteClick}
            isLoggedIn={isLoggedIn}
            handleDeleteClick={handleDeleteClick}
            formatDate={formatDate}
            renderHashtagsContainer={renderHashtagsContainer}
            onRepost={onRepost}
            handleDelete={handleDelete} // 追加: handleDeleteを渡す
          />
        </div>
      ))}
      {loading && (
        <div className="w-full py-4 text-center">
          <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-solid border-blue-500 border-r-transparent"></div>
        </div>
      )}
      {hasMore && !loading && (
        <div className="w-full py-4 text-center">
          <button
            onClick={() => loadMorePosts()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            もっと読み込む
          </button>
        </div>
      )}
    </div>
  );
};

export default React.memo(PostFeed);
