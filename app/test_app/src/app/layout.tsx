import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import DynamicClientWrapper from './DynamicClientWrapper';
import { Inter } from 'next/font/google';
import { Suspense } from 'react';
import Loading from './Loading';




export const metadata: Metadata = {
  title: "ホーム | 星天想記",
  description: "星天想記のホームページです。",
  openGraph: {
    title: "ホーム | 星天想記",
    description: "星天想記のホームページです。",
    url: "https://wallog.seitendan.com/",
    siteName: "星天想記",
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ホーム | 星天想記",
    description: "星天想記のホームページです。",
  },
};


// フォントの最適化
const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
  display: 'swap',
  preload: true,
  fallback: ['system-ui', 'arial'],
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
  display: 'swap', // フォント読み込みの最適化
  preload: true
});

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  preload: true,
});


export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" suppressHydrationWarning={true}>
      <body suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
          <Suspense fallback={<Loading />}>
            <DynamicClientWrapper>
              <div className="flex flex-col min-h-screen">
                {children}
              </div>
            </DynamicClientWrapper>
          </Suspense>
      </body>
    </html>
  );
}
