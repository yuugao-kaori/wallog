import { Metadata } from 'next';

async function getBlogData(blog_id: string) {
  const response = await fetch(`https://wallog.seitendan.com/api/blog/blog_read/${blog_id}`, {
    cache: 'no-store'  // 常に最新のデータを取得
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch blog data');
  }

  return await response.json();
}

export async function generateMetadata({ params }: { params: { blog_id: string } }): Promise<Metadata> {
  const blog = await getBlogData(params.blog_id);

  return {
    title: `${blog.blog_title} | Wallog`,
    description: blog.blog_description,
    openGraph: {
      title: blog.blog_title,
      description: blog.blog_description,
      type: 'article',
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
