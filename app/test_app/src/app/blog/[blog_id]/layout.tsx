import { Metadata } from 'next';

async function getBlogData(blog_id: string) {
  const response = await fetch(`https://wallog.seitendan.com/api/blog/blog_read/${blog_id}`, {
    cache: 'no-store', // 常に最新のデータを取得
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch blog data');
  }

  return await response.json();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ blog_id: string }>; // Promise<any> 型を許容
}): Promise<Metadata> {
  // 非同期に params を解決
  const resolvedParams = await params;
  const currentUrl = `https://wallog.seitendan.com/blog/${resolvedParams.blog_id}`;
  const blog = await getBlogData(resolvedParams.blog_id);
  
  return {
    title: `${blog.blog_title} | Wallog`,
    description: blog.blog_description,
    openGraph: {
      title: blog.blog_title,
      description: blog.blog_description,
      type: 'article',
      url: currentUrl,
    },
    twitter: {
      card: 'summary_large_image',
      title: blog.blog_title,
      description: blog.blog_description,
    },
  };
}


export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}