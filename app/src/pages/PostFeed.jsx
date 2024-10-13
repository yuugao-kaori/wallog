import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const PostFeed = ({ isLoggedIn }) => {
  const [posts, setPosts] = useState([]);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState(null);
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

  const Card = ({ post, isLoggedIn }) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef(null);

    const toggleMenu = (event) => {
      event.stopPropagation(); // クリックイベントの伝播を防ぐ
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
        className="block bg-white shadow-md rounded-lg p-4 hover:bg-gray-100 transition-all dark:bg-gray-800 duration-200 cursor-pointer relative"
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
          className="mt-2 text-gray-800 text-base dark:text-gray-100"
          dangerouslySetInnerHTML={{ __html: formatHashtags(post.post_text) }}
        ></p>
      </div>
    );
  };

  return (
    <div className="post-feed p-4 space-y-6">
      {posts.map((post) => (
        <Card key={post.post_id} post={post} isLoggedIn={isLoggedIn} />
      ))}

      {posts.length === 0 && <p>投稿がありません。</p>}
      {loading && (
        <div className="load-more-indicator text-center text-gray-500">
          投稿を読み込んでいます...
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-white rounded shadow-md text-center p-6 dark:bg-gray-900">
            <p>本当に削除しますか？</p>
            <button className="bg-gray-400 hover:bg-gray-600 text-white font-bold py-2 m-2 px-4 rounded"  onClick={() => setIsModalOpen(false)}>キャンセル</button>
            <button className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 m-2 px-4 rounded" onClick={confirmDelete}>はい</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PostFeed;
