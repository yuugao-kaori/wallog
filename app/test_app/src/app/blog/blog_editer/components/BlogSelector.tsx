'use client';
import React, { useEffect, useState } from 'react';
import styles from '../BlogEditor.module.css';

interface Blog {
  blog_id: string;
  blog_title: string;
  created_at?: string;
  updated_at?: string;
}

interface BlogSelectorProps {
  selectedBlogId: string;
  onBlogSelect: (blogId: string) => void;
  onCreate: () => void;
}

/**
 * ブログセレクターコンポーネント
 * 
 * 既存のブログ記事を選択するドロップダウンと新規作成ボタンを提供します
 */
const BlogSelector: React.FC<BlogSelectorProps> = ({
  selectedBlogId,
  onBlogSelect,
  onCreate,
}) => {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ブログリストの取得
  useEffect(() => {
    const fetchBlogs = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await fetch('/api/blog/blog_list', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });
        
        if (!response.ok) {
          throw new Error('ブログの取得に失敗しました');
        }
        
        const data = await response.json();
        // 最新のブログを先頭に表示するため並べ替え
        const sortedBlogs = (data.blogs || []).sort((a: Blog, b: Blog) => {
          const dateA = new Date(a.updated_at || a.created_at || '');
          const dateB = new Date(b.updated_at || b.created_at || '');
          return dateB.getTime() - dateA.getTime();
        });
        
        setBlogs(sortedBlogs);
      } catch (error) {
        console.error('ブログ取得エラー:', error);
        setError((error as Error).message);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchBlogs();
  }, []);

  // ブログ選択ハンドラ
  const handleBlogSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const blogId = e.target.value;
    onBlogSelect(blogId);
  };

  return (
    <div className="flex items-center space-x-2">
      <div className="relative flex-grow">
        <select
          value={selectedBlogId}
          onChange={handleBlogSelect}
          className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md appearance-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500"
          disabled={isLoading}
          aria-label="ブログを選択"
        >
          <option value="">新規作成</option>
          {blogs.map(blog => (
            <option key={blog.blog_id} value={blog.blog_id}>
              {blog.blog_title}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </div>
      
      <button
        type="button"
        onClick={onCreate}
        className="px-4 py-2 bg-blue-500 dark:bg-blue-600 text-white rounded-md hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
        disabled={isLoading}
      >
        新規作成
      </button>
      
      {error && (
        <div className="text-sm text-red-500 dark:text-red-400">
          {error}
        </div>
      )}
    </div>
  );
};

export default BlogSelector;