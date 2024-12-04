'use client';
import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import BlogFormPopup from '@/components/blogformpopup';
import axios from 'axios';
import remarkBreaks from 'remark-breaks';

interface BlogPost {
  blog_id: number;
  blog_title: string;
  blog_text: string;
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
      const response = await fetch(`/api/blog/blog_update/${params.blog_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editData),
        credentials: 'include'
      });

      if (!response.ok) throw new Error('更新に失敗しました');
      
      // 更新成功後にブログデータを再取得
      const updatedBlogResponse = await fetch(`https://wallog.seitendan.com/api/blog/blog_read/${params.blog_id}`);
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
        const response = await fetch(`https://wallog.seitendan.com/api/blog/blog_read/${params.blog_id}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'ブログの取得に失敗しました');
        }
        
        setBlog(data);
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

  // ポップアップを開く時に編集���データを初期化
  const handleEditClick = () => {
    setEditData(blog ? { ...blog } : null);
    setIsEditPopupOpen(true);
  };

  if (loading) return <div className="ml-48 p-4">Loading...</div>;
  if (error) return <div className="ml-48 p-4 text-red-500">{error}</div>;
  if (!blog) return <div className="ml-48 p-4">ブログが見つかりません</div>;

  return (
    <div className="p-4 md:ml-48 relative min-h-screen">
      <article className="max-w-4xl mx-auto bg-white dark:bg-neutral-900 rounded-xl p-8 shadow-lg">
        {blog.blog_thumbnail && (
          <img
            src={blog.blog_thumbnail}
            alt={blog.blog_title}
            className="w-full h-96 object-cover mb-8 rounded-lg"
          />
        )}
        <h1 className="text-4xl font-bold mb-6 dark:text-white">{blog.blog_title}</h1>
        <div className="flex justify-between items-center text-gray-600 dark:text-gray-400 mb-8">
          <div>
            <p>作成日: {new Date(blog.blog_createat).toLocaleDateString()}</p>
            <p>更新日: {new Date(blog.blog_updateat).toLocaleDateString()}</p>
          </div>
          <p>閲覧数: {blog.blog_count}</p>
        </div>
        <div className="prose dark:prose-invert max-w-none mb-20">
          <ReactMarkdown
            remarkPlugins={[remarkBreaks]}
            components={{
              h1: ({node, ...props}) => <h1 className="text-3xl font-bold mt-6 mb-4" {...props} />,
              h2: ({node, ...props}) => <h2 className="text-2xl font-bold mt-5 mb-3" {...props} />,
              h3: ({node, ...props}) => <h3 className="text-xl font-bold mt-4 mb-2" {...props} />,
              h4: ({node, ...props}) => <h4 className="text-lg font-bold mt-3 mb-2" {...props} />,
              h5: ({node, ...props}) => <h5 className="text-base font-bold mt-2 mb-1" {...props} />,
              h6: ({node, ...props}) => <h6 className="text-sm font-bold mt-2 mb-1" {...props} />,
              p: ({node, ...props}) => {
                const children = React.Children.toArray(props.children);
                const elements = children.map((child, index) => {
                  if (typeof child === 'string') {
                    const parts = child.split(/\b(https?:\/\/\S+)\b/);
                    return parts.map((part, i) => {
                      if (part.match(/^https?:\/\//)) {
                        return <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600">{part}</a>;
                      }
                      return part;
                    });
                  }
                  return child;
                });
                return <p {...props}>{elements}</p>;
              }
            }}
          >
            {blog.blog_text}
          </ReactMarkdown>
        </div>
      </article>

      {/* 編集ボタンをログイン時のみ表示 */}
      {isLoggedIn && (
        <button
          onClick={handleEditClick}
          className="fixed bottom-8 right-8 px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 shadow-lg"
        >
          編集
        </button>
      )}

      {/* ポップアップもログイン時のみ表示 */}
      {isLoggedIn && (
        <BlogFormPopup
          isOpen={isEditPopupOpen}
          onClose={() => setIsEditPopupOpen(false)}
          blogData={editData || { blog_title: '', blog_text: '', blog_file: '', blog_thumbnail: '' }}
          onInputChange={handleInputChange}
          onSubmit={handleSubmit}
          mode="edit"
        />
      )}
    </div>
  );
}
