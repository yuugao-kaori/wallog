import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "検索 | 星天想記",
  description: "星天想記(Diary&Blog)の記事検索ページです。",
  openGraph: {
    title: "検索 | 星天想記",
    description: "星天想記(Diary&Blog)の記事検索ページです。",
    url: "https://wallog.seitendan.com/search",
    siteName: "星天想記",
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "検索 | 星天想記",
    description: "星天想記(Diary&Blog)の記事検索ページです。",
  },
};

export default function SearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
