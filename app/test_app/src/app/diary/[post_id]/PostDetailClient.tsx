'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PostCard from '@/components/PostCard';
import { useRouter } from 'next/navigation';

interface Post {
  post_id: string;
  post_text: string;
  post_createat: string;
  created_at: string;
  user_id: string;
  post_file?: string[];
  repost_body?: Post;
  reply_body?: Post;
}

interface PostDetailClientProps {
  initialPost: Post | null;
}

const api = axios.create({
  baseURL: 'https://wallog.seitendan.com',
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Credentials': 'true'
  },
  withCredentials: true
});

export default function PostDetailClient({ initialPost }: PostDetailClientProps) {
  const [post, setPost] = useState<Post | null>(initialPost);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [error, setError] = useState<string | null>(!initialPost ? '投稿が見つかりませんでした' : null);
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await api.get('/api/user/login_check');
        setIsLoggedIn(response.status === 200);
      } catch (err) {
        setIsLoggedIn(false);
      }
    };

    checkSession();
  }, []);

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('ja-JP');
  };

  const handleDelete = async (event: React.MouseEvent, postId: string) => {
    try {
      await api.delete('/api/post/post_delete', {
        data: { post_id: postId }
      });
      router.push('/diary');
      return true;
    } catch (error) {
      console.error('Failed to delete post:', error);
      return false;
    }
  };

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 pt-8">
      <div className="max-w-2xl mx-auto px-4 md:ml-52">
        <PostCard
          post={post}
          isLoggedIn={isLoggedIn}
          handleDeleteClick={handleDelete}
          formatDate={formatDate}
          onDelete={handleDelete}
          className="w-full"
        />
      </div>
    </div>
  );
}
