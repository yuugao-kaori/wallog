import React, { useState, useEffect, useRef } from 'react';

const PostFeed = () => {
  const [posts, setPosts] = useState([]);
  const [offset, setOffset] = useState(0);
  const wsRef = useRef(null);

  useEffect(() => {
    const ws = new WebSocket('ws://192.168.1.148:25000/api/post/post_ws');
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket接続が確立されました');
      ws.send(JSON.stringify({ action: 'loadMore', offset: 0 }));
    };

    ws.onmessage = (event) => {
      const newPosts = JSON.parse(event.data);
      setPosts((prevPosts) => [...prevPosts, ...newPosts]);
      setOffset((prevOffset) => prevOffset + newPosts.length);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('WebSocket接続が切断されました');
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, []);

  const loadMorePosts = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'loadMore', offset }));
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 100) {
        loadMorePosts();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [offset]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return 'Date unavailable';
    }
    return date.toLocaleString();
  };

  return (
    <div className="post-feed p-4 space-y-6">
      {posts.map((post, index) => (
        <a 
          key={index} 
          href={`/diary/${post.post_id}`} 
          className="block bg-white shadow-md rounded-lg p-4 hover:bg-gray-100 transition-all dark:bg-gray-800 duration-200"
        >
          <div className="text-gray-500 text-sm">
            Created at: {formatDate(post.post_createat)}
          </div>
          <p className="mt-2 text-gray-800 text-base dark:text-gray-100">
            {post.post_text}
          </p>
        </a>
      ))}
      {posts.length === 0 && <p>投稿がありません。</p>}
      <div className="load-more-indicator text-center text-gray-500">
        スクロールして追加の投稿を読み込んでいます...
      </div>
    </div>
  );
};

export default PostFeed;
