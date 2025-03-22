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
  params: { blog_id: string }; // Promiseではなく直接オブジェクトとして受け取る
}): Promise<Metadata> {
  // blogデータを取得
  const blog = await getBlogData(params.blog_id);
  
  // サイトのURL設定（実際のドメインに置き換えてください）
  const baseUrl = 'https://wallog.seitendan.com';
  const currentUrl = `${baseUrl}/blog/${params.blog_id}`;
  
  // ブログ記事のサムネイル画像URL（APIから取得できる場合）
  // const imageUrl = blog.thumbnail_url || `${baseUrl}/default-og-image.jpg`;

  return {
    title: `${blog.blog_title} | Wallog`,
    description: blog.blog_description,
    openGraph: {
      title: blog.blog_title,
      description: blog.blog_description,
      type: 'article',
      url: currentUrl,
      // images: [
      //   {
      //     url: imageUrl,
      //     width: 1200,
      //     height: 630,
      //     alt: blog.blog_title,
      //   }
      // ],
    },
    twitter: {
      card: 'summary_large_image',
      title: blog.blog_title,
      description: blog.blog_description,
      // images: [imageUrl],
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