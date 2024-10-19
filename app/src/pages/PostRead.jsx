import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useTheme } from '../ThemeContext';

const PostDetail = () => {
  const { postId } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [images, setImages] = useState([]);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const { theme } = useTheme();

  useEffect(() => {
    const fetchPostDetail = async () => {
      try {
        const response = await fetch('http://192.168.1.148:25000/api/post/post_read', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ post_id: postId }),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch post details');
        }

        const data = await response.json();
        setPost(data.readed_post);
        fetchImages(data.readed_post.post_file);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    const fetchImages = async (files) => {
      const fileArray = files ? (Array.isArray(files) ? files : [files]) : [];
      const fetchedImages = await Promise.all(
        fileArray.map(async (file) => {
          let file_id = typeof file === 'string' ? file.replace(/^\{?"|"?\}$/g, '') : null;
          if (!file_id) return { file_id, url: null, error: true };

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

      setImages(fetchedImages);
    };

    if (postId) {
      fetchPostDetail();
    }
  }, [postId]);

  const handleImageClick = (url) => {
    setSelectedImage(url);
    setImageModalOpen(true);
  };

  const closeImageModal = () => {
    setImageModalOpen(false);
    setSelectedImage(null);
  };

  if (loading) {
    return <div className="text-center p-4">Loading...</div>;
  }

  if (error) {
    return <div className="text-center p-4 text-red-500">Error: {error}</div>;
  }

  if (!post) {
    return <div className="text-center p-4">No post found</div>;
  }

  return (
    <div className={`max-w-2xl mx-auto p-4 ${theme === 'dark' ? 'dark' : ''}`}>
      <h1 className="text-2xl font-bold mb-4 dark:text-white">投稿</h1>
      <div className="bg-white shadow-md rounded-lg p-6 dark:bg-gray-800">
        <p className="text-gray-600 dark:text-gray-400 mb-2">
          Created at: {new Date(post.post_createat).toLocaleString()}
        </p>
        <p className="text-gray-800 dark:text-gray-200 text-lg">{post.post_text}</p>
        {images.length > 0 && (
          <div className={`mt-4 ${images.length === 1 ? 'w-full' : 'grid grid-cols-2 gap-2'}`}>
            {images.map((img) => (
              <div key={img.file_id} className="relative w-full aspect-video bg-gray-600 rounded overflow-hidden">
                {img.error ? (
                  <div className="flex items-center justify-center h-full text-red-500 text-sm">
                    画像を表示できませんでした。
                  </div>
                ) : (
                  <img
                    src={img.url}
                    alt={`Post image ${img.file_id}`}
                    className="object-contain w-full h-full cursor-pointer"
                    onClick={(e) => { e.stopPropagation(); handleImageClick(img.url); }}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {imageModalOpen && selectedImage && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-75 z-50" onClick={closeImageModal}>
          <img src={selectedImage} alt="Enlarged" className="max-w-3xl max-h-full rounded" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
};

export default PostDetail;
