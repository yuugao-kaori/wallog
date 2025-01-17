'use client'

import Link from 'next/link';
import PostFeed from '@/components/PostFeed';

interface BlogPost {
  blog_id: string;
  blog_title: string;
  blog_text: string;
  blog_thumbnail?: string;
}

interface HomeClientProps {
  randomPosts: any[];
  blogs: BlogPost[];
  total: number;
}

export function HomeClient({ randomPosts, blogs, total }: HomeClientProps) {
  return (
    <div className="flex flex-col md:ml-48">
      <div className="w-full text-center py-4">
        <h1 className="text-xl font-bold dark:text-white mt-4">{process.env.NEXT_PUBLIC_SITE_TITLE}</h1>
        <h2 className="text-l font-bold dark:text-white mt-4">{process.env.NEXT_PUBLIC_SITE_EXPLANATION}</h2>
        <div className="pt-8 border-b border-gray-200 "></div>
      </div>
      <div className="flex mt-2">
        <div className="w-1/2 p-4">
          <h2 className="text-xl font-bold mb-4 dark:text-white ">Blog（Latest）</h2>
          <div className="max-h-128 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
            {blogs.map((blog: BlogPost) => (
              <Link href={`/blog/${blog.blog_id}`} key={blog.blog_id}>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow mb-4">
                  {blog.blog_thumbnail && (
                    <img src={blog.blog_thumbnail} alt={blog.blog_title} className="w-full h-48 object-cover" />
                  )}
                  <div className="p-4">
                    <h2 className="text-l font-bold dark:text-white">{blog.blog_title}</h2>
                    <p className="text-gray-600 dark:text-gray-300 text-sm">
                      {blog.blog_text.length > 50 ? `${blog.blog_text.slice(0, 50)}...` : blog.blog_text}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>        
        <div className="w-1/2">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-xl font-bold dark:text-white pt-4 mb-4">Diary（Random）</h2>
            <div className="max-h-128 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
              <PostFeed
                posts={randomPosts}
                isLoggedIn={false}
                loading={false}
                hasMore={false}
                setPosts={() => {}}
                loadMorePosts={() => Promise.resolve()}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
