import React, { useState, useEffect, useRef, useCallback } from 'react'; 
import { useNavigate } from 'react-router-dom';

const PostFeed = ({ isLoggedIn }) => {
  const [posts, setPosts] = useState([]);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState(null);
  const wsRef = useRef(null);
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const [hasMore, setHasMore] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const lastScrollTopRef = useRef(0);
  const newPostsAddedRef = useRef(false);
  
  // 仕様②用の状態
  const [newPostsAvailable, setNewPostsAvailable] = useState(false);
  const [accumulatedNewPosts, setAccumulatedNewPosts] = useState([]);
  
  // フラグを useRef で管理
  const isLoadingMoreRef = useRef(false);
  const isAtTopRef = useRef(true);

  const scrollToTop = useCallback(() => {
    const container = containerRef.current;
    if (container) {
      container.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  const preserveScrollPosition = useCallback(() => {
    const container = containerRef.current;
    if (container && newPostsAddedRef.current) {
      const previousScrollTop = lastScrollTopRef.current;
      container.scrollTop = container.scrollHeight - container.clientHeight - previousScrollTop;
      newPostsAddedRef.current = false;
    }
  }, []);

  useEffect(() => {
    const ws = new WebSocket('ws://192.168.1.148:25000/api/post/post_ws');
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket接続が確立されました');
      loadMorePosts(); // 初期読み込み
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      console.log("Received message:", message);

      if (isLoadingMoreRef.current) {
        // これは loadMore の応答と仮定
        if (Array.isArray(message)) {
          if (message.length === 0) {
            setHasMore(false);
          } else {
            setPosts((prevPosts) => {
              const updatedPosts = [...prevPosts, ...message];
              return updatedPosts.sort((a, b) => new Date(b.post_createat) - new Date(a.post_createat));
            });
            setOffset((prevOffset) => prevOffset + message.length);
            // hasMore を適切に設定（サーバーからの返答が limit 未満ならこれ以上はないと判断）
            if (message.length < 6) {
              setHasMore(false);
            }
          }
        } else {
          console.error('loadMore の応答が配列ではありません:', message);
        }
        isLoadingMoreRef.current = false;
        setLoading(false);
      } else {
        // これは新しい投稿の通知と仮定
        if (Array.isArray(message)) {
          const newPosts = message;
          if (newPosts.length === 0) {
            // 新しい投稿がない場合は何もしない
            return;
          }

          if (isAtTopRef.current) {
            // 仕様①: 最上部にいる場合は自動で読み込み
            setLoading(true);
            setTimeout(() => {
              setPosts((prevPosts) => {
                const updatedPosts = [...newPosts, ...prevPosts];
                return updatedPosts.sort((a, b) => new Date(b.post_createat) - new Date(a.post_createat));
              });
              setLoading(false);
              if (!initialLoadComplete) {
                setInitialLoadComplete(true);
              }
            }, 2000); // 2秒の遅延
          } else {
            // 仕様②: 最上部にいない場合は「戻る」ボタンを表示
            setAccumulatedNewPosts((prev) => [...newPosts, ...prev]);
            setNewPostsAvailable(true);
          }
        } else {
          console.error('新しい投稿の応答が配列ではありません:', message);
        }
      }
    };

    ws.onerror = (error) => console.error('WebSocket error:', error);
    ws.onclose = () => console.log('WebSocket接続が切断されました');

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [initialLoadComplete]); // 依存配列から isLoadingMore と isAtTop を除外

  useEffect(() => {
    if (initialLoadComplete) {
      scrollToTop();
    }
  }, [initialLoadComplete, scrollToTop]);

  useEffect(() => {
    preserveScrollPosition();
  }, [posts, preserveScrollPosition]);

  const loadMorePosts = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && !loading && hasMore) {
      setLoading(true);
      isLoadingMoreRef.current = true; // 読み込み中フラグを立てる
      console.log("Sending request with offset:", offset);
      wsRef.current.send(JSON.stringify({ action: 'loadMore', offset, limit: 6 })); // 仕様③,④: limitを6に設定
      // setTimeoutは削除。サーバーからの応答を待つ
    }
  }, [offset, loading, hasMore]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const isTop = scrollTop === 0;
      isAtTopRef.current = isTop;
      lastScrollTopRef.current = scrollTop;

      if (
        container.scrollTop + container.clientHeight >= container.scrollHeight - 300 &&
        !loading &&
        hasMore
      ) {
        console.log("Reached bottom, loading more posts...");
        loadMorePosts();
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [loadMorePosts, hasMore, loading]);

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
    const regex = /(?<=\s|^)#\S+(?=\s|$)/g;
    return text.replace(regex, (match) => `<span class="text-blue-500 font-bold">${match}</span>`);
  };

  const handleDeleteClick = (event, post_id) => {
    event.stopPropagation(); // クリックイベントの伝播を防ぐ
    setSelectedPostId(post_id); // 削除対象のポストIDを設定
    setIsModalOpen(true); // モーダルを開く
  };

  const confirmDelete = () => {
    // APIリクエストを送信する処理
    fetch('http://192.168.1.148:25000/api/post/post_delete', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ post_id: selectedPostId }), // 選択されたポストIDを送信
    })
    .then((response) => {
      if (response.ok) {
        setPosts((prevPosts) => prevPosts.filter(post => post.post_id !== selectedPostId)); // ポストを削除
        setIsModalOpen(false); // モーダルを閉じる
      } else {
        console.error('削除に失敗しました');
      }
    })
    .catch((error) => {
      console.error('エラーが発生しました:', error);
    });
  };

  const Card = ({ post, isLoggedIn, className }) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef(null);
  
    const toggleMenu = (event) => {
      event.stopPropagation();
      setMenuOpen(!menuOpen);
    };
  
    useEffect(() => {
      const handleClickOutside = (event) => {
        if (menuRef.current && !menuRef.current.contains(event.target)) {
          setMenuOpen(false);
        }
      };
  
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, []);
  
    return (
      <div
        key={post.post_id}
        className={`block bg-white shadow-md rounded-lg p-4 hover:bg-gray-100 transition-all dark:bg-gray-800 duration-200 cursor-pointer relative ${className}`}
        onClick={() => handlePostClick(post.post_id)}
      >
        <div className="absolute top-4 right-4">
          <button onClick={toggleMenu} className="p-2 text-gray-700">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
            </svg>
          </button>
        </div>

        {menuOpen && (
          <div ref={menuRef} className="absolute top-14 right-4 bg-white shadow-lg rounded-lg p-2 z-10 dark:bg-gray-900">
            <ul>
              {isLoggedIn && (
                <li
                  className="text-sm py-2 px-4 hover:bg-gray-100 hover:rounded-lg hover:px-4 cursor-pointer dark:text-gray-100 dark:hover:bg-gray-800"
                  onClick={(event) => handleDeleteClick(event, post.post_id)} // ここでクリックイベントを渡す
                >
                  削除
                </li>
              )}
              {isLoggedIn && (
                <li className="text-sm py-2 px-4 hover:bg-gray-100 hover:rounded-lg hover:px-4 cursor-pointer dark:text-gray-100 dark:hover:bg-gray-800">修正</li>
              )}
              <li className="text-sm py-2 px-4 hover:bg-gray-100 hover:rounded-lg hover:px-4 cursor-pointer dark:text-gray-100 dark:hover:bg-gray-800">URLコピー</li>
            </ul>
          </div>
        )}

        <div className="text-gray-500 text-sm">
          Created at: {formatDate(post.post_createat)}
        </div>
        <p
          className="mt-2 text-gray-800 text-base dark:text-gray-100 whitespace-pre-wrap"
          dangerouslySetInnerHTML={{ __html: formatHashtags(post.post_text) }}
        ></p>
      </div>
    );
  };

  return (
    <div 
      ref={containerRef} 
      className="post-feed px-6 space-y-6 overflow-y-auto flex flex-col relative"
      style={{ 
        height: 'calc(100vh - 160px)',
        scrollbarWidth: 'none', 
        msOverflowStyle: 'none',
        paddingTop: '60px',
      }}
    >
      {/* 仕様②: 新しい投稿がある場合の「戻る」ボタン */}
      {newPostsAvailable && (
        <button 
          className="fixed top-16 right-6 bg-blue-500 text-white py-2 px-4 rounded shadow-lg z-20"
          onClick={handleBackButtonClick}
        >
          戻る
        </button>
      )}

      {posts.map((post) => (
        <Card
          key={post.post_id}
          post={post}
          isLoggedIn={isLoggedIn}
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
};

export default PostFeed;
