import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Blog | 星天想記',
  description: 'Blogの記事一覧です',
  openGraph: {
    title: 'Blog | 星天想記',
    description: 'Blogの記事一覧です',
    type: 'website',
    locale: 'ja_JP',
    url: '/blog',
    //images: [
    //  {
    //    url: '/images/og-image.png', // デフォルトのOG画像へのパス
    //    width: 1200,
    //    height: 630,
    //    alt: 'ブログのOG画像',
    //  },
    //],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Blog | 星天想記',
    description: 'Blogの記事一覧です',
    //images: ['/images/og-image.png'],
  },
  alternates: {
    types: {
      'application/rss+xml': '/blog/feed.xml',
    },
  },
};

export default function DiaryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}