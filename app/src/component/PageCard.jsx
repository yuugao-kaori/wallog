import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom'; // 修正箇所

const Card = React.memo(({ post, isLoggedIn, handleDeleteClick, formatDate, formatHashtags, className }) => {
  const [images, setImages] = useState([]);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notification, setNotification] = useState(false); // 通知の状態
  const menuRef = useRef(null);

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
          const file_id = typeof file === "string" ? file.replace(/^\{?"|"?\}$/g, '') : file;
          try {
            const response = await fetch(`${process.env.REACT_APP_SITE_DOMAIN}/api/drive/file/${file_id}`);
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

  const copyLink = () => {
    const url = `${process.env.REACT_APP_SITE_DOMAIN}/diary/${post.post_id}`;
    navigator.clipboard.writeText(url).then(() => {
      setNotification(true);
      setTimeout(() => setNotification(false), 2000); // 2秒間通知を表示
    }).catch((err) => console.error("コピーに失敗しました", err));
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
    <div className={`block bg-white shadow-md rounded-lg p-4 hover:bg-gray-100 transition-all dark:bg-gray-800 duration-200 cursor-pointer relative ${className}`}>
      {/* 通知メッセージをポータルとして描画 */}
      {notification && ReactDOM.createPortal(
        <div className="fixed bottom-4 right-4 bg-blue-500 text-white py-2 px-4 rounded shadow-lg z-[10000] text-sm">
          クリップボードにURLがコピーされました
        </div>,
        document.body
      )}

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
            <li
              className="text-sm py-2 px-4 hover:bg-gray-100 hover:rounded-lg cursor-pointer dark:text-gray-100 dark:hover:bg-gray-800"
              onClick={copyLink}
            >
              リンクをコピー
            </li>
            {isLoggedIn && (
              <>
                <li
                  className="text-sm py-2 px-4 hover:bg-gray-100 hover:rounded-lg cursor-pointer dark:text-gray-100 dark:hover:bg-gray-800"
                >
                  編集
                </li>
                <li
                  className="text-sm py-2 px-4 hover:bg-gray-100 hover:rounded-lg cursor-pointer dark:text-gray-100 dark:hover:bg-gray-800"
                  onClick={(event) => handleDeleteClick(event, post.post_id)}
                >
                  削除
                </li>
              </>
            )}
          </ul>
        </div>
      )}

      {notification && (
        <div className="fixed bottom-4 right-4 bg-blue-500 text-white py-2 px-4 rounded shadow-lg z-[1000] text-sm">
          クリップボードにURLがコピーされました
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
});

export default Card;
