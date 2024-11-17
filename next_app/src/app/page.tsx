'use client';

import { useEffect } from 'react';

export default function Home() {
  useEffect(() => {
    console.log('SITE DOMAIN:', process.env.NEXT_PUBLIC_SITE_DOMAIN);
  }, []);

  return (
    <main>
      {/* メインコンテンツ */}
    </main>
  );
}