// PostFeed.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import PostMenu from './PostMenu'; // PostMenuをインポート

const PostFeed = () => {
  const [posts, setPosts] = useState([]);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const wsRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const ws = new WebSocket('ws://192.168.1.148:25000/api/post/post_ws');
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket接続が確立されました');
      loadMorePosts();
    };

    ws.onmessage = (event) => {
      const newPosts = JSON.parse(event.data);
      setPosts((prevPosts) => {
        const updatedPosts = [...prevPosts];
        newPosts.forEach((newPost) => {
          const index = updatedPosts.findIndex(post => post.post_id === newPost.post_id);
          if (index === -1) {
            updatedPosts.unshift(newPost);
          } else {
            updatedPosts[index] = newPost;
          }
        });
        return updatedPosts.sort((a, b) => new Date(b.post_createat) - new Date(a.post_createat));
      });
      setLoading(false);
    };

    ws.onerror = (error) => console.error('WebSocket error:', error);
    ws.onclose = () => console.log('WebSocket接続が切断されました');

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, []);

  const loadMorePosts = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && !loading) {
      setLoading(true);
      wsRef.current.send(JSON.stringify({ action: 'loadMore', offset }));
      setOffset(prevOffset => prevOffset + 10); // 10 posts per request
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 100 && !loading) {
        loadMorePosts();
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [offset, loading]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Date unavailable';
    return date.toLocaleString();
  };

  const handlePostClick = (post_id) => {
    navigate(`/diary/${post_id}`);
  };

  const formatHashtags = (text) => {
    const regex = /(?<=\s|^)#\S+(?=\s|$)/g;
    return text.replace(regex, (match) => `<span class="text-blue-500 font-bold">${match}</span>`);
  };

  const Card = ({ post }) => {
    const [menuOpen, setMenuOpen] = useState(false); // 各カードのハンバーガーメニューの状態を管理

    const toggleMenu = () => {
      setMenuOpen(prev => !prev); // メニューの状態を更新
    };

    return (
      <div
        key={post.post_id}
        className="block bg-white shadow-md rounded-lg p-4 hover:bg-gray-100 transition-all dark:bg-gray-800 duration-200 cursor-pointer relative"
        onClick={() => handlePostClick(post.post_id)}
      >
        <PostMenu menuOpen={menuOpen} setMenuOpen={setMenuOpen} />

        <div className="text-gray-500 text-sm">
          Created at: {formatDate(post.post_createat)}
        </div>
        <p
          className="mt-2 text-gray-800 text-base dark:text-gray-100"
          dangerouslySetInnerHTML={{ __html: formatHashtags(post.post_text) }}
        ></p>
      </div>
    );
  };

  return (
    <div className="post-feed p-4 space-y-6">
      {posts.map((post) => (
        <Card key={post.post_id} post={post} />
      ))}
      {posts.length === 0 && <p>投稿がありません。</p>}
      {loading && (
        <div className="load-more-indicator text-center text-gray-500">
          投稿を読み込んでいます...
        </div>
      )}
    </div>
  );
};

export default PostFeed;
