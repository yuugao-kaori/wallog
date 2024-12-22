import Image from "next/image";
import Tagcloud from '@/components/Tagcloud';
import { TagcloudServer } from '@/components/TagcloudServer';

// プリロードの設定を追加
export const metadata = {
  other: {
    'next-font-preload': true
  }
};

export default async function Home() {
  const { tags } = await TagcloudServer();
  return (
    <div className="mt-0 md:mt-16">
      <div className="text-center space-y-1">
        <h2 className="text-xl font-bold dark:text-white">{process.env.NEXT_PUBLIC_SITE_TITLE}</h2>
        <p className="text-sm dark:text-white">{process.env.NEXT_PUBLIC_SITE_EXPLANATION}</p>
      </div>
    </div>
  );
}
