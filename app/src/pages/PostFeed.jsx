// PostFeed.jsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../component/PageCard'; // 新しいコンポーネントをインポート
const PostFeed = React.memo(({ posts, setPosts, isLoggedIn, loading, hasMore, loadMorePosts }) => {
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
    navigate(`/diary/${post_id}`);
  };

  const formatHashtags = (text) => {
    if (typeof text !== 'string') return '';
    const regex = /(?<=\s|^)#\S+(?=\s|$)/g;
    return text.replace(regex, (match) => `<span class="text-blue-500 font-bold">${match}</span>`);
  };
  const handleDeleteClick = (event, post_id) => {
    event.stopPropagation(); // クリックイベントの伝播を防ぐ
    setSelectedPostId(post_id); // 削除対象のポストIDを設定
    setIsModalOpen(true); // モーダルを開く
  };
  const fetchImagesForPost = async (postId) => {
    try {
      const response = await axios.get(`/api/posts/${postId}/images`);
      return response.data; // 必要に応じて画像データを返す
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
          post_createat: post.created_at, // 表示用に正しい日付フィールドを追加
          post_text: post.title || post.title // テキストフィールドに適切な内容を割り当て
        }}
        isLoggedIn={isLoggedIn}
        handleDeleteClick={() => handleDeleteClick(post.post_id)}
        formatDate={formatDate}
        formatHashtags={formatHashtags}
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
