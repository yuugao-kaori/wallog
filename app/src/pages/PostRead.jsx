import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTheme } from '../ThemeContext';

const PostDetail = () => {
  const { postId } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    if (postId) {
      fetchPostDetail();
    }
  }, [postId]);

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
      </div>
    </div>
  );
};

export default PostDetail;