'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

// Blog type definition matching the API response
interface Blog {
  blog_id: string;
  blog_text: string;
  blog_title: string;
  blog_createat: string;
  blog_thumbnail?: string;
  blog_description?: string;
}

interface BlogCardProps {
  blog: Blog;
  isLoggedIn: boolean;
  onDelete?: (event: React.MouseEvent, blog_id: string) => Promise<boolean>;
  formatDate: (date: string) => string;
}

const BlogCard: React.FC<BlogCardProps> = ({ 
  blog, 
  isLoggedIn, 
  onDelete, 
  formatDate 
}) => {
  const router = useRouter();

  const handleClick = () => {
    router.push(`/blog/${blog.blog_id}`);
  };

  // Truncate text function for descriptions
  const truncateText = (text: string, maxLength: number = 150): string => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  };

  // Extract description from blog text (first paragraph or first 150 chars)
  const getDescription = (text: string): string => {
    if (!text) return '';
    const firstParagraph = text.split('\n')[0];
    return truncateText(firstParagraph);
  };

  return (
    <div 
      onClick={handleClick}
      className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow w-full my-4"
    >
      {blog.blog_thumbnail && (
        <img
          src={blog.blog_thumbnail}
          alt={blog.blog_title}
          className="w-full h-48 object-cover"
        />
      )}
      <div className="p-4">
        <h2 className="text-xl font-bold mb-2 dark:text-white">{blog.blog_title}</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-3">
          {blog.blog_description || getDescription(blog.blog_text)}
        </p>
        <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
          <span>{formatDate(blog.blog_createat)}</span>
          {isLoggedIn && typeof onDelete === 'function' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm('本当に削除しますか？')) {
                  onDelete(e, blog.blog_id);
                }
              }}
              className="text-red-500 hover:text-red-700"
            >
              削除
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BlogCard;