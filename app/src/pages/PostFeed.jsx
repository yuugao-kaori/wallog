import React, { useState, useEffect, useRef } from 'react';

const PostFeed = () => {
  const [posts, setPosts] = useState([]); // 投稿データの状態
  const [offset, setOffset] = useState(0); // スクロール位置のためのオフセット
  const wsRef = useRef(null); // WebSocket接続を参照するためのRef

  useEffect(() => {
    // WebSocket接続の初期化
    const ws = new WebSocket('ws://192.168.1.148:25000/api/post/post_ws');
    wsRef.current = ws;

    // WebSocket接続が確立された時の処理
    ws.onopen = () => {
      console.log('WebSocket接続が確立されました');
      // 最初に投稿をロード
      ws.send(JSON.stringify({ action: 'loadMore', offset: 0 }));
    };

    // WebSocketメッセージを受信した時の処理
    ws.onmessage = (event) => {
      console.log('WebSocket メッセージを受信しました:', event.data);
      const newPosts = JSON.parse(event.data);
      console.log('パースされた新しい投稿:', newPosts);
    

      // 新しい投稿を既存の投稿に追加し、重複しないようにする
      setPosts((prevPosts) => {
        const postIds = new Set(prevPosts.map(post => post.post_id));
        const filteredNewPosts = newPosts.filter(post => !postIds.has(post.post_id));
        
        // 新しい投稿を先頭に追加
        return [...filteredNewPosts, ...prevPosts];
      });


      // 新しい投稿がある場合のみオフセットを更新
      if (newPosts.length > 0) {
        setOffset((prevOffset) => prevOffset + newPosts.length);
      }
    };

    // エラーハンドリング
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    // WebSocket接続が閉じられた時の処理
    ws.onclose = () => {
      console.log('WebSocket接続が切断されました');
    };

    // クリーンアップ処理: コンポーネントがアンマウントされたらWebSocket接続を閉じる
    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, []);

  // 追加の投稿をロードする関数
  const loadMorePosts = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'loadMore', offset }));
    }
  };

  // スクロール位置に応じて投稿を追加でロードする処理
  useEffect(() => {
    const handleScroll = () => {
      if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 100) {
        loadMorePosts();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [offset]);

  // 日付のフォーマット関数
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
