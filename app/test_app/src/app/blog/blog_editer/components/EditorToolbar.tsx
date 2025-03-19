'use client';
import React from 'react';
import styles from '../BlogEditor.module.css';

export interface MarkdownSyntax {
  prefix: string;
  suffix?: string;
}

interface EditorToolbarProps {
  onInsertMarkdown: (syntax: MarkdownSyntax) => void;
}

/**
 * エディターツールバーコンポーネント
 * 
 * マークダウン書式のボタンを提供します
 */
const EditorToolbar: React.FC<EditorToolbarProps> = ({ onInsertMarkdown }) => {
  const markdownButtons = [
    { icon: 'H1', tooltip: '見出し1', prefix: '# ' },
    { icon: 'H2', tooltip: '見出し2', prefix: '## ' },
    { icon: 'H3', tooltip: '見出し3', prefix: '### ' },
    { icon: 'B', tooltip: '太字', prefix: '**', suffix: '**' },
    { icon: 'I', tooltip: '斜体', prefix: '*', suffix: '*' },
    { icon: 'U', tooltip: '下線', prefix: '__', suffix: '__' },
    { icon: 'S', tooltip: '取り消し線', prefix: '~~', suffix: '~~' },
    { icon: '-', tooltip: 'リスト', prefix: '- ' },
    { icon: '1.', tooltip: '番号付きリスト', prefix: '1. ' },
    { icon: '>', tooltip: '引用', prefix: '> ' },
    { icon: '```', tooltip: 'コードブロック', prefix: '```\n', suffix: '\n```' },
    { icon: '`', tooltip: 'インラインコード', prefix: '`', suffix: '`' },
    { icon: '---', tooltip: '水平線', prefix: '---\n' },
  ];

  return (
    <div className={`${styles.toolbar} mb-2 flex flex-wrap gap-1 p-2 bg-gray-100 dark:bg-gray-700 rounded-md border border-gray-300 dark:border-gray-600`}>
      {markdownButtons.map((button, index) => (
        <button
          key={index}
          type="button"
          onClick={() => onInsertMarkdown({ prefix: button.prefix, suffix: button.suffix })}
          className="px-3 py-1.5 text-sm font-medium rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          title={button.tooltip}
        >
          {button.icon}
        </button>
      ))}
      <div className="ml-auto text-xs text-gray-500 dark:text-gray-400 self-center">
        Ctrl+S: 保存 | Ctrl+Z: 元に戻す | Ctrl+Shift+Z: やり直し
      </div>
    </div>
  );
};

export default EditorToolbar;