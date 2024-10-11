import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

axios.defaults.baseURL = 'http://192.168.1.148:25000';
axios.defaults.headers.common['Content-Type'] = 'application/json;charset=utf-8';
axios.defaults.withCredentials = true; // Cookieを送受信できるように設定

const PostFeed = () => {
  const [posts, setPosts] = useState([]);
  const [offset, setOffset] = useState(10); // 初期オフセットは10
  const wsRef = useRef(null);

  // WebSocket接続を開始
  useEffect(() => {
    const ws = new WebSocket('ws://192.168.1.148:25000/api/post/post_ws');
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket接続が確立されました');
    };

    // WebSocketからデータを受信した際に、投稿を更新
    ws.onmessage = (event) => {
      const newPosts = JSON.parse(event.data);
      setPosts((prevPosts) => [...prevPosts, ...newPosts]);
    };

    ws.onclose = () => {
      console.log('WebSocket接続が切断されました');
    };

    return () => {
      ws.close();
    };
  }, []);

  // スクロールがボトムに達したときに追加の投稿をリクエスト
  const loadMorePosts = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'loadMore', offset }));
      setOffset((prevOffset) => prevOffset + 10); // オフセットを10増やす
    }
  };

  // スクロールイベントリスナーを設定
  useEffect(() => {
    const handleScroll = () => {
      const bottom = window.innerHeight + window.pageYOffset >= document.documentElement.scrollHeight;
      if (bottom) {
        loadMorePosts();
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [offset]);

  return (
    <div className="post-feed">
      {posts.map((post, index) => (
        <div key={index} className="post-card">
          <p>{post.content}</p>
          <span>{new Date(post.created_at).toLocaleString()}</span>
        </div>
      ))}
      <div className="load-more-indicator">スクロールして追加の投稿を読み込んでいます...</div>
    </div>
  );
};

export default PostFeed;
