'use client'

import dynamic from 'next/dynamic';
import { Suspense, memo } from 'react';

const ClientWrapper = dynamic(() => import('./ClientWrapper'), {
  ssr: false
});

const DynamicClientWrapper = memo(function DynamicClientWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<div className="flex flex-col min-h-screen">Loading...</div>}>
      <ClientWrapper>{children}</ClientWrapper>
    </Suspense>
  );
});

export default DynamicClientWrapper;