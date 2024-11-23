import React, { useState, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/PostCard';
import axios from 'axios';
interface Post {
  post_id: string;
  post_text: string;
  post_file?: string | string[];
  post_createat: string;
  title?: string;
  created_at: string;
  // 他の必要なプロパティを追加
}

interface PostFeedProps {
  posts: Post[];
  setPosts: React.Dispatch<React.SetStateAction<Post[]>>;
  isLoggedIn: boolean;
  loading: boolean;
  hasMore: boolean;
  loadMorePosts: () => Promise<void>;
}

const PostFeed: React.FC<PostFeedProps> = ({ posts, setPosts, isLoggedIn, loading, hasMore, loadMorePosts }) => {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [newPostsAvailable, setNewPostsAvailable] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedPostId, setSelectedPostId] = useState<string>('');
  const [accumulatedNewPosts, setAccumulatedNewPosts] = useState<Post[]>([]);

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

  const renderHashtagsContainer = (text: string): React.ReactNode => {
    if (typeof text !== 'string') return null;

    // ハッシュタグとURLを検出するための正規表現パターン
    const pattern = /(?<=^|\s)(#[^\s]+|https?:\/\/[^\s]+)(?=\s|$)/;
    const parts = text.split(pattern);

    return (
      <div className="whitespace-pre-wrap break-words">
        {parts.map((part, index) => {
          if (part.match(/^#[^\s]+$/)) {
            const tag = part.slice(1);
            return (
              <span
                key={index}
                className="text-blue-500 font-bold cursor-pointer hover:underline"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  router.push(`/search?searchText=${encodeURIComponent(tag)}&searchType=タグ検索`);
                }}
              >
                {part}
              </span>
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
  };

  const handleDeleteClick = (event: React.MouseEvent, post_id: string): void => {
    event.stopPropagation();
    setSelectedPostId(post_id);
    setIsModalOpen(true);
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
    // 削除処理の実装
    setIsModalOpen(false);
  };

  const MemoizedCard = useMemo(() => Card, []);

  return (
    <div ref={containerRef}>
      {posts.map(post => (
        <MemoizedCard
          key={post.post_id}
          post={post}
          onDelete={handleDeleteClick}
          isLoggedIn={isLoggedIn}
          handleDeleteClick={handleDeleteClick}
          formatDate={formatDate}
        />
      ))}
    </div>
  );
};

export default React.memo(PostFeed);
