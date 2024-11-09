// src/components/Card.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

// 画像キャッシュ用のオブジェクト
const imageCache = {};

const Card = React.memo(({ post, isLoggedIn, onDelete }) => {
  const [images, setImages] = useState([]);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  // 画像の取得
  useEffect(() => {
    let isMounted = true;

    const fetchImages = async () => {
      const files = post.post_file
        ? (Array.isArray(post.post_file)
          ? post.post_file
          : post.post_file.split(',').map(file => file.trim().replace(/^"|"$/g, '')))
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

          // キャッシュに存在する場合はキャッシュを使用
          if (imageCache[file_id]) {
            return { file_id, url: imageCache[file_id], error: false };
          }

          try {
            const response = await fetch(`${process.env.REACT_APP_SITE_DOMAIN}/api/drive/file/${file_id}`);
            if (!response.ok) throw new Error('Fetch failed');
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            imageCache[file_id] = url; // キャッシュに保存
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

    if (post.post_file) {
      fetchImages();
    }

    return () => {
      isMounted = false;
      // URLオブジェクトはキャッシュされているため、解放は控えます。
      // ただし、アプリケーションの終了時などに適切に解放する必要があります。
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

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Date unavailable';
    return date.toLocaleString();
  };

  const formatHashtags = (text) => {
    if (typeof text !== 'string') return '';
    const regex = /(?<=\s|^)#\S+(?=\s|$)/g;
    return text.replace(regex, (match) => `<span class="text-blue-500 font-bold">${match}</span>`);
  };

  const handlePostClick = () => {
    navigate(`/diary/${post.post_id}`);
  };

  const handleDeleteClick = (event) => {
    event.stopPropagation(); // クリックイベントの伝播を防ぐ
    if (onDelete) {
      onDelete(post.post_id);
    }
  };

  return (
    <div
      className="block bg-white shadow-md rounded-lg p-4 hover:bg-gray-100 transition-all dark:bg-gray-800 duration-200 cursor-pointer relative w-full max-w-[800px]"
      onClick={handlePostClick}
    >
      {/* メニューボタン */}
      <div className="absolute top-4 right-4">
        <button onClick={toggleMenu} className="p-2 text-gray-700 dark:text-gray-300">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
          </svg>
        </button>
      </div>

      {/* メニュー */}
      {menuOpen && (
        <div ref={menuRef} className="absolute top-14 right-4 bg-white shadow-lg rounded-lg p-2 z-10 dark:bg-gray-900">
          <ul>
            {isLoggedIn && (
              <li
                className="text-sm py-2 px-4 hover:bg-gray-100 hover:rounded-lg hover:px-4 cursor-pointer dark:text-gray-100 dark:hover:bg-gray-800"
                onClick={handleDeleteClick}
              >
                削除
              </li>
            )}
            {isLoggedIn && (
              <li
                className="text-sm py-2 px-4 hover:bg-gray-100 hover:rounded-lg hover:px-4 cursor-pointer dark:text-gray-100 dark:hover:bg-gray-800"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/edit/${post.post_id}`);
                }}
              >
                修正
              </li>
            )}
            <li
              className="text-sm py-2 px-4 hover:bg-gray-100 hover:rounded-lg hover:px-4 cursor-pointer dark:text-gray-100 dark:hover:bg-gray-800"
              onClick={(e) => {
                e.stopPropagation();
                const url = `${process.env.REACT_APP_SITE_DOMAIN}/diary/${post.post_id}`;
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

      {/* 作成日時 */}
      <div className="text-gray-500 text-sm dark:text-gray-400">
        作成日時: {formatDate(post.post_createat)}
      </div>

      {/* 投稿テキスト */}
      <p
        className="mt-2 text-gray-800 text-base dark:text-gray-100 whitespace-pre-wrap"
        dangerouslySetInnerHTML={{ __html: formatHashtags(post.post_text || '') }}
      ></p>



      {/* 画像 */}
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
                  loading="lazy" // 画像の遅延読み込みを有効化
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* 画像モーダル */}
      {imageModalOpen && selectedImage && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-75 z-50" onClick={closeImageModal}>
          <img src={selectedImage} alt="Enlarged" className="max-w-3xl max-h-full rounded" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
});

export default Card;
