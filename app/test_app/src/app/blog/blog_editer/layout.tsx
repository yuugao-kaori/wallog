'use client';
import React from 'react';
import { EditorProvider } from './context/EditorContext';

/**
 * ブログエディターレイアウト
 * 
 * エディターに関連するコンテキストプロバイダーを提供します
 */
export default function BlogEditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <EditorProvider>
      {/* NavBarの幅(w-48)に合わせて左側のマージンを追加し、小さい画面では調整 */}
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 ml-0 md:ml-48 transition-all duration-300">
        {children}
      </div>
    </EditorProvider>
  );
}