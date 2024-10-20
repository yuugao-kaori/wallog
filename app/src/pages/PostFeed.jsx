import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

const PostFeed = React.memo(({ posts, setPosts, isLoggedIn, loading, hasMore, loadMorePosts }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState(null);
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const lastScrollTopRef = useRef(0);
  const newPostsAddedRef = useRef(false);
  
  const [newPostsAvailable, setNewPostsAvailable] = useState(false);
  const [accumulatedNewPosts, setAccumulatedNewPosts] = useState([]);
  
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
    if (initialLoadComplete) {
      scrollToTop();
    }
  }, [initialLoadComplete, scrollToTop]);

  useEffect(() => {
    preserveScrollPosition();
  }, [posts, preserveScrollPosition]);

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
  // Cardコンポーネントをメモ化
  const MemoizedCard = useMemo(() => React.memo(({ post, isLoggedIn, className }) => {
    const [images, setImages] = useState([]);
    const [imageModalOpen, setImageModalOpen] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef(null);
  
    useEffect(() => {
      let isMounted = true;
      const fetchImages = async () => {
        // post_fileがカンマで区切られているか確認し、分割する
        const files = post.post_file
          ? (Array.isArray(post.post_file)
            ? post.post_file 
            : post.post_file.split(',').map(file => file.trim().replace(/^"|"$/g, '')))  // 前後の不要な " を削除
          : [];
    
        const fetchedImages = await Promise.all(
          files.map(async (file) => {
            let file_id;
    
            if (typeof file === "object" && file !== null) {
              file_id = Object.keys(file)[0];
            } else if (typeof file === "string") {
              file_id = file.replace(/^\{?"|"?\}$/g, '');
            } else {
              file_id = file;
            }
    
            try {
              const response = await fetch(`http://192.168.1.148:25000/api/drive/file/${file_id}`);
              if (!response.ok) throw new Error('Fetch failed');
              const blob = await response.blob();
              const url = URL.createObjectURL(blob);
              return { file_id, url, error: false };
            } catch (error) {
              return { file_id, url: null, error: true };
            }
          })
        );
    
        if (isMounted) {
          setImages(fetchedImages);
        }
      };
    
      fetchImages();
    
      return () => {
        isMounted = false;
        images.forEach((img) => {
          if (img.url) URL.revokeObjectURL(img.url);
        });
      };
    }, [post.post_file]);
  
    const handleImageClick = (url) => {
      setSelectedImage(url);
      setImageModalOpen(true);
    };
  
    const closeImageModal = () => {
      setImageModalOpen(false);
      setSelectedImage(null);
    };
  
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
                  onClick={(event) => handleDeleteClick(event, post.post_id)}
                >
                  削除
                </li>
              )}
              {isLoggedIn && (
                <li className="text-sm py-2 px-4 hover:bg-gray-100 hover:rounded-lg hover:px-4 cursor-pointer dark:text-gray-100 dark:hover:bg-gray-800">修正</li>
              )}
              <li
                className="text-sm py-2 px-4 hover:bg-gray-100 hover:rounded-lg hover:px-4 cursor-pointer dark:text-gray-100 dark:hover:bg-gray-800"
                onClick={() => {
                  const url = `http://192.168.1.148:23000/diary/${post.post_id}`;
                  if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(url)
                      .then(() => {
                        alert('URLがクリップボードにコピーされました');
                      })
                      .catch(err => {
                        console.error('クリップボードへのコピーに失敗しました', err);
                      });
                  } else {
                    // フォールバック: テキストエリアを作成して手動でコピーする
                    const textArea = document.createElement("textarea");
                    textArea.value = url;
                    document.body.appendChild(textArea);
                    textArea.select();
                    try {
                      document.execCommand('copy');
                      alert('URLがクリップボードにコピーされました');
                    } catch (err) {
                      console.error('フォールバックのコピーに失敗しました', err);
                      alert('コピーに失敗しました。手動でコピーしてください。');
                    }
                    document.body.removeChild(textArea);
                  }
                }}
              >
                URLコピー
              </li>
            </ul>
          </div>
        )}
  
        <div className="text-gray-500 text-sm">
          Created at: {formatDate(post.post_createat)}
        </div>
        <p
          className="mt-2 text-gray-800 text-base dark:text-gray-100 whitespace-pre-wrap"
          dangerouslySetInnerHTML={{ __html: formatHashtags(post.post_text || '') }}
        ></p>
        {images.length > 0 && (
          <div className={`mt-4 ${images.length === 1 ? 'w-full' : 'grid grid-cols-2 gap-2'}`}>
            {images.map((img) => (
              <div key={img.file_id} className="relative w-full aspect-video bg-gray-200 rounded overflow-hidden">
                {img.error ? (
                  <div className="flex items-center justify-center h-full text-red-500 text-sm">
                    画像を表示できませんでした。
                  </div>
                ) : (
                  <img
                    src={img.url}
                    alt={`Post image ${img.file_id}`}
                    className="object-contain w-full h-full cursor-pointer bg-gray-700"
                    onClick={(e) => { e.stopPropagation(); handleImageClick(img.url); }}
                  />
                )}
              </div>
            ))}
          </div>
        )}
  
        {imageModalOpen && selectedImage && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-75 z-50" onClick={closeImageModal}>
            <img src={selectedImage} alt="Enlarged" className="max-w-3xl max-h-full rounded" onClick={(e) => e.stopPropagation()} />
          </div>
        )}
      </div>
    );
  }), []);
  
  
  return (
    <div 
      ref={containerRef} 
      className="post-feed px-6 space-y-3 overflow-y-auto flex flex-col relative"
      style={{ 
        height: 'calc(100vh - 100px)',
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
        <MemoizedCard
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
});

export default PostFeed;
