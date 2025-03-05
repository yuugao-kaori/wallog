import { Metadata } from 'next';

export const metadata: Metadata = {
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