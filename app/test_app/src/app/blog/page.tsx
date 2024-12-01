'use client';
import React, { useEffect } from 'react';
import { useState } from 'react';
import Link from 'next/link';
import BlogFormPopup from '@/components/blogformpopup';

const BlogPage: React.FC = () => {
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [blogs, setBlogs] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const ITEMS_PER_PAGE = 12;
  const [blogData, setBlogData] = useState({
    blog_title: '',
    blog_text: '',
    blog_file: '',
    blog_thumbnail: '',
    blog_fixedurl: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setBlogData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/blog/blog_create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(blogData),
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Blog creation failed');
      }

      const result = await response.json();
      console.log('Blog created:', result);
      setIsPopupOpen(false);
      setBlogData({
        blog_title: '',
        blog_text: '',
        blog_file: '',
        blog_thumbnail: '',
        blog_fixedurl: ''
      });
    } catch (error) {
      console.error('Error creating blog:', error);
    }
  };

  const fetchBlogs = async (page: number) => {
    try {
      setLoading(true);
      const offset = (page - 1) * ITEMS_PER_PAGE;
      // APIエンドポイントを /api/blog/blog_list に変更
      const response = await fetch(`/api/blog/blog_list?offset=${offset}&limit=${ITEMS_PER_PAGE}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        console.error('JSON parse error:', text);
        throw new Error('Invalid JSON response from server');
      }

      if (!data || !Array.isArray(data.blogs)) {
        throw new Error('Invalid data structure received from server');
      }

      setBlogs(data.blogs);
      setTotalPages(Math.ceil(data.total / ITEMS_PER_PAGE));
    } catch (error) {
      console.error('Error fetching blogs:', error);
      setBlogs([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlogs(currentPage);
  }, [currentPage]);

  // ページ変更ハンドラー
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo(0, 0);
  };

  return (
    <div className="ml-48 p-4 dark:bg-gray-900"> {/* ダークモード背景追加 */}
      {/* ブログカード一覧 */}
      {loading ? (
        <div className="dark:text-white">Loading...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {blogs.map((blog: any) => (
              <Link href={`/blog/${blog.blog_id}`} key={blog.blog_id}>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow">
                  {blog.blog_thumbnail && (
                    <img
                      src={blog.blog_thumbnail}
                      alt={blog.blog_title}
                      className="w-full h-48 object-cover"
                    />
                  )}
                  <div className="p-4">
                    <h2 className="text-xl font-bold mb-2 dark:text-white">{blog.blog_title}</h2>
                    <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-3">{blog.blog_text}</p>
                    <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
                      <span>{new Date(blog.blog_createat).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* ページネーション */}
          <div className="flex justify-center mt-8 space-x-2">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={`px-4 py-2 rounded-md ${
                  currentPage === page
                    ? 'bg-blue-500 text-white dark:bg-blue-600'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {page}
              </button>
            ))}
          </div>
        </>
      )}

      <button
        className="fixed bottom-5 right-5 bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-lg transition-colors"
        onClick={() => setIsPopupOpen(true)}
      >
        ブログを作成
      </button>

      <BlogFormPopup
        isOpen={isPopupOpen}
        onClose={() => setIsPopupOpen(false)}
        blogData={blogData}
        onInputChange={handleInputChange}
        onSubmit={handleSubmit}
      />
    </div>
  );
}

export default BlogPage;