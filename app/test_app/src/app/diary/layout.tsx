import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Diary | 星天想記',
  description: '短文を中心としたマイクロブログの記事を一覧で表示します',
  openGraph: {
    title: 'Diary | 星天想記',
    description: '短文を中心としたマイクロブログの記事を一覧で表示します',
    type: 'website',
    locale: 'ja_JP',
    url: 'https://wallog.seitendan.com/diary',
    //images: [
    //  {
    //    url: 'https://wallog.seitendan.com/ogp.png',
    //    width: 1200,
    //    height: 630,
    //  },
    //],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Diary | 星天想記',
    description: '短文を中心としたマイクロブログの記事を一覧で表示します',
    //images: ['https://wallog.seitendan.com/ogp.png'],
  },
  alternates: {
    types: {
      'application/rss+xml': '/diary/feed.xml',
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