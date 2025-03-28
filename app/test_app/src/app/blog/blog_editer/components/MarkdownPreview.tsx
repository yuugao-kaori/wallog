'use client';
import React, { useEffect, useState } from 'react';
import styles from '../BlogEditor.module.css';

interface MarkdownPreviewProps {
  markdown: string;
}

/**
 * マークダウンプレビューコンポーネント
 * 
 * マークダウンテキストをHTMLに変換して表示します
 */
const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({ markdown }) => {
  const [html, setHtml] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // マークダウンをHTMLに変換
  useEffect(() => {
    const convertMarkdown = async () => {
      try {
        if (!markdown.trim()) {
          setHtml('');
          return;
        }

        // シンプルな変換ロジック（後でより高度なパーサーに置き換え予定）
        let converted = markdown
          // 画像タグの処理
          .replace(/<img=([a-zA-Z0-9-]+)>/g, (match, fileId) => {
            return `<img src="/api/drive/file_read/${fileId}" alt="画像" class="max-w-full h-auto rounded" />`;
          })
          // 見出し
          .replace(/^# (.*$)/gm, '<h1 class="text-3xl font-bold mt-6 mb-4 dark:text-gray-100">$1</h1>')
          .replace(/^## (.*$)/gm, '<h2 class="text-2xl font-bold mt-5 mb-3 dark:text-gray-200">$1</h2>')
          .replace(/^### (.*$)/gm, '<h3 class="text-xl font-bold mt-4 mb-2 dark:text-gray-200">$1</h3>')
          // 太字
          .replace(/\*\*(.*?)\*\*/g, '<strong class="dark:text-white">$1</strong>')
          // 斜体
          .replace(/\*(.*?)\*/g, '<em class="dark:text-gray-200">$1</em>')
          // 下線
          .replace(/__(.*?)__/g, '<span class="underline dark:text-gray-200">$1</span>')
          // 取り消し線
          .replace(/~~(.*?)~~/g, '<span class="line-through dark:text-gray-300">$1</span>')
          // 引用
          .replace(/^> (.*$)/gm, '<blockquote class="pl-4 border-l-4 border-gray-300 dark:border-gray-600 italic text-gray-700 dark:text-gray-300 my-4">$1</blockquote>')
          // コードブロック
          .replace(/```([\s\S]*?)```/g, '<pre class="bg-gray-100 dark:bg-gray-700 p-4 rounded overflow-x-auto"><code class="text-gray-800 dark:text-gray-800">$1</code></pre>')
          // インラインコード
          .replace(/`([^`]+)`/g, '<code class="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-800 px-1 rounded">$1</code>')
          // 水平線
          .replace(/^---$/gm, '<hr class="my-4 border-t border-gray-300 dark:border-gray-600" />')
          // 順序なしリスト
          .replace(/^- (.*$)/gm, '<li class="ml-6 dark:text-gray-200">$1</li>')
          .replace(/<\/li>\n<li/g, '</li><li')
          .replace(/(<li.*<\/li>)/g, '<ul class="list-disc my-4">$1</ul>')
          // 順序付きリスト
          .replace(/^\d+\. (.*$)/gm, '<li class="ml-6 dark:text-gray-200">$1</li>')
          .replace(/<\/li>\n<li/g, '</li><li')
          // 段落
          .replace(/\n\s*\n/g, '</p><p class="my-4 dark:text-gray-300">')
          // 改行
          .replace(/\n/g, '<br />');
        
        // 最終的に段落タグで囲む
        if (!converted.startsWith('<')) {
          converted = `<p class="my-4 dark:text-gray-300">${converted}</p>`;
        }
        
        // リストタグの重複を修正
        converted = converted
          .replace(/<\/ul><ul[^>]*>/g, '')
          .replace(/<ul[^>]*>(<li class="ml-6[^>]*>\d+\. .*<\/li>)<\/ul>/g, '<ol class="list-decimal my-4">$1</ol>');
        
        setHtml(converted);
      } catch (err) {
        console.error('マークダウン変換エラー:', err);
        setError('マークダウンの変換に失敗しました');
      }
    };
    
    convertMarkdown();
  }, [markdown]);

  // サニタイズ処理はサーバーサイドで実装する予定

  if (error) {
    return (
      <div className="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 p-4 rounded">
        {error}
      </div>
    );
  }

  return (
    <div className={`${styles.markdownPreview} dark:text-gray-200`}>
      {html ? (
        <div dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <p className="text-gray-500 dark:text-gray-400 italic">プレビューする内容がありません</p>
      )}
    </div>
  );
};

export default MarkdownPreview;