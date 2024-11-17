'use client';

import { useMemo, useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation'; // 変更点: next/router から next/navigation に変更
import Card from '../components/PageCard';
import axios from 'axios';

interface Post {
  post_id: string;
  post_text?: string;
  title?: string;
  created_at: string;
  [key: string]: any;
}

interface PostFeedProps {
    posts: Post[];
    setPosts: React.Dispatch<React.SetStateAction<Post[]>>;
    isLoggedIn: boolean;
    loading: boolean;
    hasMore: boolean;
    loadMorePosts: () => Promise<void>;
}
  
const PostFeed: React.FC<PostFeedProps> = ({
    posts,
    setPosts,
    isLoggedIn,
    loading,
    hasMore,
    loadMorePosts,
}): JSX.Element => {
    const router = useRouter();
  
    const containerRef = useRef<HTMLDivElement>(null);
    const [newPostsAvailable, setNewPostsAvailable] = useState<boolean>(false);
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [selectedPostId, setSelectedPostId] = useState<string>('');
    const [accumulatedNewPosts, setAccumulatedNewPosts] = useState<Post[]>([]);
  
    const handleBackButtonClick = () => {
        if (containerRef.current) {
            containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
        setPosts((prevPosts) => {
            const updatedPosts = [...accumulatedNewPosts, ...prevPosts];
            return updatedPosts.sort((a, b) => 
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
        });
        setAccumulatedNewPosts([]);
        setNewPostsAvailable(false);
    };

    const formatDate = (dateString: string): string => {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Date unavailable';
        return date.toLocaleString();
    };

    const renderHashtagsContainer = (text: string) => {
        if (!text) return null;

        return (
            <div className="whitespace-pre-wrap break-words">
                {text.split(/(\s)/).map((part, index) => {
                    if (part.trim().startsWith('#')) {
                        const tag = part.trim().slice(1);
                        return (
                            <span
                                key={index}
                                className="text-blue-500 font-bold cursor-pointer hover:underline"
                                onClick={(e: React.MouseEvent) => {
                                    e.stopPropagation();
                                    // 変更点: pushではなくpush相当の処理を実行
                                    router.push(`/search?searchText=${encodeURIComponent(tag)}&searchType=タグ検索`);
                                }}
                            >
                                {part}
                            </span>
                        );
                    }
                    return part;
                })}
            </div>
        );
    };

    const handleDeleteClick = (event: React.MouseEvent, postId: string) => {
        event.stopPropagation();
        setSelectedPostId(postId);
        setIsModalOpen(true);
    };

    const confirmDelete = async () => {
        try {
            await axios.delete(`/api/posts/${selectedPostId}`);
            setPosts((prevPosts) => prevPosts.filter((post) => post.post_id !== selectedPostId));
            setIsModalOpen(false);
        } catch (error) {
            console.error('Error deleting post:', error);
        }
    };

    const MemoizedCard = useMemo(() => Card, []);

    return (
        <div
            ref={containerRef}
            className="post-feed px-6 space-y-3 h-full overflow-y-auto flex flex-col relative"
            style={{
                height: 'calc(110vh - 100px)',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                paddingTop: '60px',
            }}
        >
            {newPostsAvailable && (
                <button
                    className="fixed top-16 right-6 bg-blue-500 text-white py-2 px-4 rounded shadow-lg z-20"
                    onClick={handleBackButtonClick}
                >
                    戻る
                </button>
            )}

            {posts.map((post) => (
                <MemoizedCard
                    key={post.post_id}
                    post={{
                        ...post,
                        post_createat: post.created_at,
                        post_text: post.post_text || post.title || ''
                    }}
                    isLoggedIn={isLoggedIn}
                    handleDeleteClick={(e: React.MouseEvent) => handleDeleteClick(e, post.post_id)}
                    formatDate={formatDate}
                    renderHashtagsContainer={renderHashtagsContainer}
                    className="w-full max-w-[800px]"
                />
            ))}

            {posts.length === 0 && !loading && <p>投稿がありません。</p>}
            {loading && (
                <div className="load-more-indicator text-center text-gray-500">
                    投稿を読み込んでいます...
                </div>
            )}
            {!hasMore && posts.length > 0 && (
                <div className="text-center text-gray-500">
                    これ以上の投稿はありません。
                </div>
            )}
            {isModalOpen && (
                <div className="fixed inset-0 flex items-center justify-center z-50">
                    <div className="bg-white rounded shadow-md text-center p-6 dark:bg-gray-900">
                        <p>本当に削除しますか？</p>
                        <button 
                            className="bg-gray-400 hover:bg-gray-600 text-white font-bold py-2 m-2 px-4 rounded" 
                            onClick={() => setIsModalOpen(false)}
                        >
                            キャンセル
                        </button>
                        <button 
                            className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 m-2 px-4 rounded" 
                            onClick={confirmDelete}
                        >
                            はい
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PostFeed;