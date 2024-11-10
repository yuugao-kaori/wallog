import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../component/PageCard';

const PostFeed = React.memo(({ posts, setPosts, isLoggedIn, loading, hasMore, loadMorePosts }) => {
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const [newPostsAvailable, setNewPostsAvailable] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleBackButtonClick = () => {
    scrollToTop();
    setPosts((prevPosts) => {
      const updatedPosts = [...accumulatedNewPosts, ...prevPosts];
      return updatedPosts.sort((a, b) => new Date(b.post_createat) - new Date(a.post_createat));
    });
    setAccumulatedNewPosts([]);
    setNewPostsAvailable(false);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Date unavailable';
    return date.toLocaleString();
  };

  const handlePostClick = (post_id) => {
    navigate(`${process.env.REACT_APP_SITE_DOMAIN}/diary/${post_id}`);
  };

  // formatHashtags関数を維持
  const formatHashtags = (text) => {
    if (typeof text !== 'string') return '';
    const regex = /(?<=\s|^)#\S+(?=\s|$)/g;
    const navigate = useNavigate();
    return text.replace(regex, (match) => {
      const tagText = match.slice(1); // #を取り除く
      return `<span class="text-blue-500 font-bold cursor-pointer hover:underline" onclick="window.location.href='/search?searchText=${tagText}&searchType=タグ検索'">${match}</span>`;
    });
  };

  // 新しいrenderHashtagsContainer関数
  const renderHashtagsContainer = (text) => {
    if (typeof text !== 'string') return null;

    return (
      <div className="whitespace-pre-wrap break-words">
        {text.split(/(\s)/).map((part, index) => {
          if (part.trim().startsWith('#')) {
            const tag = part.trim().slice(1); // #を取り除く
            return (
              <span
                key={index}
                className="text-blue-500 font-bold cursor-pointer hover:underline"
                onClick={(e) => {
                  e.stopPropagation();
                  // ハッシュタグクリック時の処理をここに追加
                }}
              >
                {part}
              </span>
            );
          } else {
            return <span key={index}>{part}</span>;
          }
        })}
      </div>
    );
};

  const handleDeleteClick = (event, post_id) => {
    event.stopPropagation();
    setSelectedPostId(post_id);
    setIsModalOpen(true);
  };

  const fetchImagesForPost = async (postId) => {
    try {
      const response = await axios.get(`/api/posts/${postId}/images`);
      return response.data;
    } catch (error) {
      console.error("Error fetching images for post:", error);
      return [];
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
            // title OR post_text のどちらかを使用するように修正
            post_text: post.post_text || post.title
          }}
          isLoggedIn={isLoggedIn}
          handleDeleteClick={() => handleDeleteClick(post.post_id)}
          formatDate={formatDate}
          formatHashtags={formatHashtags}
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
            <button className="bg-gray-400 hover:bg-gray-600 text-white font-bold py-2 m-2 px-4 rounded" onClick={() => setIsModalOpen(false)}>キャンセル</button>
            <button className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 m-2 px-4 rounded" onClick={confirmDelete}>はい</button>
          </div>
        </div>
      )}
    </div>
  );
});

export default PostFeed;