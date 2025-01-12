'use client';
import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import BlogFormPopup from '@/components/Blogformpopup';
import axios from 'axios';

interface BlogPost {
  blog_id: number;
  blog_title: string;
  blog_text: string;
  blog_pursed_text: string;  // 追加
  blog_thumbnail: string;
  blog_createat: string;
  blog_updateat: string;
  blog_count: number;
  blog_file: string;
  blog_fixedurl: string;
  
}

interface ErrorResponse {
  error: string;
  message: string;
  status: number;
}

export default function BlogDetail() {
  const params = useParams();
  const [blog, setBlog] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isEditPopupOpen, setIsEditPopupOpen] = useState(false);
  const [editData, setEditData] = useState<BlogPost | null>(null);

  const api = useMemo(() => axios.create({
    baseURL: 'https://wallog.seitendan.com',
    headers: {
      'Content-Type': 'application/json;charset=utf-8',
      'Access-Control-Allow-Credentials': 'true'
    },
    withCredentials: true
  }), []);

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
  }, [api]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditData(prev => prev ? { ...prev, [name]: value } : null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editData || !params.blog_id) return;

    try {
      const response = await fetch(`/api/blog2/blog_update/${params.blog_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editData),
        credentials: 'include'
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(`Invalid content-type: ${contentType}. Response: ${text}`);
      }

      const data = await response.json();

      if (!response.ok) throw new Error(data.message || '更新に失敗しました');
      
      // 更新成功後にブログデータを再取得
      const updatedBlogResponse = await fetch(`https://wallog.seitendan.com/api/blog2/blog_read/${params.blog_id}`);
      const updatedBlogData = await updatedBlogResponse.json();
      if (updatedBlogResponse.ok) {
        setBlog(updatedBlogData);
      }
      
      setIsEditPopupOpen(false);
    } catch (error) {
      console.error('Error updating blog:', error);
    }
  };

  useEffect(() => {
    const fetchBlog = async () => {
      if (!params.blog_id || Array.isArray(params.blog_id)) {
        setError('無効なブログIDです');
        setLoading(false);
        return;
      }

      // blog_idの形式チェック
      if (!params.blog_id.startsWith('bl_')) {
        setError('無効なブログID形式です');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`https://wallog.seitendan.com/api/blog2/blog_read/${params.blog_id}`);
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const text = await response.text();
          throw new Error(`Invalid content-type: ${contentType}. Response: ${text}`);
        }
        
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'ブログの取得に失敗しました');
        }
        
        setBlog(data);
        // ブログデータがロードされたらタイトルを更新
        document.title = `${data.blog_title} | Wallog`;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'ブログの取得に失敗しました';
        setError(errorMessage);
        console.error('Blog fetch error:', errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchBlog();
  }, [params.blog_id]);

  // ポップアップを開く時に編集用データを初期化
  const handleEditClick = () => {
    setEditData(blog ? { ...blog } : null);
    setIsEditPopupOpen(true);
  };

  if (loading) return <div className="ml-48 p-4">Loading...</div>;
  if (error) return <div className="ml-48 p-4 text-red-500">{error}</div>;
  if (!blog) return <div className="ml-48 p-4">ブログが見つかりません</div>;

  return (
    <div className="p-4 md:ml-48 lg:mr-48 relative min-h-screen">
      <article className="max-w-4xl mx-auto bg-white dark:bg-neutral-900 rounded-xl p-8 shadow-lg">
        {blog?.blog_thumbnail && (
          <img
            src={blog.blog_thumbnail}
            alt={blog.blog_title}
            className="w-full h-96 object-cover mb-8 rounded-lg"
          />
        )}
        <h1 className="text-4xl font-bold mb-6 dark:text-white">{blog?.blog_title}</h1>
        <div className="flex justify-between items-center text-gray-600 dark:text-gray-400 mb-8">
          <div>
            <p>作成日: {blog && new Date(blog.blog_createat).toLocaleDateString()}</p>
            <p>更新日: {blog && new Date(blog.blog_updateat).toLocaleDateString()}</p>
          </div>
          <p>閲覧数: {blog?.blog_count}</p>
        </div>
        <hr className="border-t border-gray-200 dark:border-gray-700 mb-8" />
        <div className="prose dark:prose-invert max-w-none mb-20">
          <div 
            dangerouslySetInnerHTML={{ __html: blog?.blog_pursed_text || '' }}
            className="markdown-body 
              [&>h1]:text-4xl [&>h1]:font-bold [&>h1]:mt-6 [&>h1]:mb-4 [&>h1]:pb-3 [&>h1]:border-b [&>h1]:border-gray-200 dark:[&>h1]:border-gray-700
              [&>h2]:text-3xl [&>h2]:font-bold [&>h2]:mt-5 [&>h2]:mb-4 [&>h2]:pb-2 [&>h2]:border-b [&>h2]:border-gray-200 dark:[&>h2]:border-gray-700
              [&>h3]:text-2xl [&>h3]:font-bold [&>h3]:mt-4 [&>h3]:mb-3
              [&>ol]:list-decimal [&>ol]:pl-10 [&>ol]:my-4
              [&>ol>li]:my-2
              [&>pre]:bg-gray-100 [&>pre]:dark:bg-gray-800 [&>pre]:rounded-lg [&>pre]:p-4 [&>pre]:my-4 [&>pre]:overflow-x-auto
              [&>pre>code]:text-sm [&>pre>code]:font-mono [&>pre>code]:text-gray-800 [&>pre>code]:dark:text-gray-200
              [&>code]:bg-gray-100 [&>code]:dark:bg-gray-800 [&>code]:rounded [&>code]:px-1 [&>code]:py-0.5 [&>code]:text-sm [&>code]:font-mono"
          />
        </div>
      </article>

      {isLoggedIn && (
        <button
          onClick={handleEditClick}
          className="fixed bottom-8 right-8 px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 shadow-lg"
        >
          編集
        </button>
      )}
      <BlogFormPopup
        isOpen={isEditPopupOpen}
        onClose={() => setIsEditPopupOpen(false)}
        blogData={editData ? {
          ...editData, 
          blog_id: String(editData.blog_id)
        } : {
          blog_title: '',
          blog_text: '',
          blog_file: '',
          blog_thumbnail: '',
          blog_id: ''
        }}
        onInputChange={handleInputChange}
        onSubmit={handleSubmit}
        mode="edit"
      />
    </div>
  );
}
