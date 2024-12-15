'use client';
import React, { useEffect, useState, useRef } from 'react';

interface BlogFormPopupProps {
  isOpen: boolean;
  onClose: () => void;
  blogData: {
    blog_title: string;
    blog_text: string;
    blog_file: string;
    blog_thumbnail: string;
    blog_id: string;  // 追加
  };
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  mode?: 'create' | 'edit';
  onDelete?: (blogId: string) => void;  // 追加
  onUpdate?: () => void;  // 追加
}

const BlogFormPopup: React.FC<BlogFormPopupProps> = ({
  isOpen,
  onClose,
  blogData,
  onInputChange,
  onSubmit,
  onDelete: handleDelete,  // 追加
  onUpdate,  // 追加
  mode = 'create',  // 追加

}: BlogFormPopupProps) => {
  if (!isOpen) return null;

  const [emptyLineCount, setEmptyLineCount] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const [history, setHistory] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isUndoRedo, setIsUndoRedo] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 履歴に新しいテキストを追加するヘルパー関数を修正
  const addToHistory = (newValue: string, immediate: boolean = false) => {
    if (isUndoRedo) return;

    const updateHistory = () => {
      const lastHistoryItem = history[currentIndex];
      if (lastHistoryItem !== newValue) {
        const newHistory = [...history.slice(0, currentIndex + 1), newValue];
        setHistory(newHistory);
        setCurrentIndex(newHistory.length - 1);
      }
    };

    if (immediate) {
      // マークダウン挿入時は即時に履歴を更新
      updateHistory();
    } else {
      // 通常の入力時はデバウンス処理を適用
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(updateHistory, 500);
    }

    // テキストエリアの値を更新
    const event = {
      target: {
        name: 'blog_text',
        value: newValue
      }
    } as React.ChangeEvent<HTMLTextAreaElement>;
    onInputChange(event);
  };

  // テキストエリアの内容が変更されたときの処理を修正
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    addToHistory(e.target.value, false);
  };

  // Undo/Redoのキーボードショートカット処理を更新
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      e.preventDefault();
      setIsUndoRedo(true);
      
      if (e.shiftKey) {
        // Redo
        if (currentIndex < history.length - 1) {
          const newIndex = currentIndex + 1;
          setCurrentIndex(newIndex);
          const event = {
            target: {
              name: 'blog_text',
              value: history[newIndex]
            }
          } as React.ChangeEvent<HTMLTextAreaElement>;
          onInputChange(event);
        }
      } else {
        // Undo
        if (currentIndex > 0) {
          const newIndex = currentIndex - 1;
          setCurrentIndex(newIndex);
          const event = {
            target: {
              name: 'blog_text',
              value: history[newIndex]
            }
          } as React.ChangeEvent<HTMLTextAreaElement>;
          onInputChange(event);
        }
      }
      
      setTimeout(() => {
        setIsUndoRedo(false);
      }, 100);
    }
  };

  const handleDeleteClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    if (!blogData.blog_id) return;

    try {
      const response = await fetch('/api/blog/blog_delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // セッションCookieを送信するために必要
        body: JSON.stringify({ file_id: blogData.blog_id })
      });

      if (!response.ok) {
        throw new Error('削除に失敗しました');
      }

      onClose(); // ポップアップを閉じる
      if (onUpdate) onUpdate(); // 親コンポーネントの一覧を更新

      // ページ遷移
      window.location.href = '/blog';

    } catch (error) {
      console.error('削除エラー:', error);
      // エラー表示の処理を追加
      alert('削除に失敗しました');
    }
  };

  // マークダウン挿入処理を修正
  const insertMarkdown = (markdownSyntax: { prefix: string, suffix?: string }) => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const scrollPosition = textarea.scrollTop; // スクロール位置を保存
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);
    
    // 見出しタグか箇条書きかを判定
    const isHeading = ['#', '>', '---'].some(symbol => markdownSyntax.prefix.includes(symbol));
    const isList = markdownSyntax.prefix === '- ' || /^\d+\. $/.test(markdownSyntax.prefix);
    
    const newText = text.substring(0, start) + 
      markdownSyntax.prefix + 
      (selectedText || (isHeading || isList ? '' : '')) + 
      (isHeading || isList ? '' : (markdownSyntax.suffix || markdownSyntax.prefix)) + 
      text.substring(end);

    // 履歴に即時追加
    addToHistory(newText, true);
    
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + markdownSyntax.prefix.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
      textarea.scrollTop = scrollPosition; // スクロール位置を復元
    }, 0);
};

const handleTextAreaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
  // Shift+Enterでform submit
  if (e.key === 'Enter' && e.shiftKey) {
    e.preventDefault();
    if (formRef.current) {
      formRef.current.requestSubmit();
    }
    return;
  }

  // 通常のEnterキーの動作（リスト作成など）
  if (e.key === 'Enter' && !e.shiftKey) {
    const textarea = e.currentTarget;
    const { value, selectionStart } = textarea;
    
    const lastNewLine = value.lastIndexOf('\n', selectionStart - 1);
    const currentLineStart = lastNewLine + 1;
    const currentLine = value.slice(currentLineStart, selectionStart);
    
    // 数字による列挙のパターンを検出
    const numberMatch = currentLine.trimStart().match(/^(\d+)\. (.*)/);
    const isList = currentLine.trimStart().startsWith('- ');
    
    if (numberMatch || isList) {
      e.preventDefault();
      let prefix: string;
      let content: string;
      
      if (numberMatch) {
        const [_, num, text] = numberMatch;
        content = text;
        prefix = `${parseInt(num) + 1}. `;
      } else {
        content = currentLine.trim().slice(2);
        prefix = '- ';
      }

      if (content === '') {
        const newCount = emptyLineCount + 1;
        setEmptyLineCount(newCount);

        if (newCount >= 1) {
          // 空行が連続した場合、リストを終了
          const newText = value.slice(0, selectionStart) + '\n' + value.slice(selectionStart);
          const event = {
            target: {
              name: 'blog_text',
              value: newText
            }
          } as React.ChangeEvent<HTMLTextAreaElement>;
          onInputChange(event);
          setEmptyLineCount(0);
          
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = selectionStart + 1;
          }, 0);
          return;
        }
      } else {
        setEmptyLineCount(0);
      }

      // 新しい行を挿入
      const newText = value.slice(0, selectionStart) + '\n' + prefix + value.slice(selectionStart);
      const event = {
        target: {
          name: 'blog_text',
          value: newText
        }
      } as React.ChangeEvent<HTMLTextAreaElement>;
      onInputChange(event);
      
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = selectionStart + prefix.length + 1;
      }, 0);
    } else {
      setEmptyLineCount(0);
    }
  }
};

  // コンポーネントがマウントされたときに初期テキストを履歴に追加
  useEffect(() => {
    if (blogData.blog_text) {
      setHistory([blogData.blog_text]);
      setCurrentIndex(0);
    }
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-11/12 max-w-2xl">
        <h2 className="text-2xl font-bold mb-4 dark:text-white">
          {mode === 'create' ? '新規ブログ作成' : 'ブログ編集'}
        </h2>
        <form ref={formRef} onSubmit={onSubmit} className="space-y-4">
          <input
            type="text"
            name="blog_title"
            value={blogData.blog_title}
            onChange={onInputChange}
            placeholder="タ��トル"
            required
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex flex-wrap gap-2 mb-2">
            <button
              type="button"
              onClick={() => insertMarkdown({ prefix: '# ' })}
              className="px-2 py-1 border rounded hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white"
            >
              H1
            </button>
            <button
              type="button"
              onClick={() => insertMarkdown({ prefix: '## ' })}
              className="px-2 py-1 border rounded hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white"
            >
              H2
            </button>
            <button
              type="button"
              onClick={() => insertMarkdown({ prefix: '### ' })}
              className="px-2 py-1 border rounded hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white"
            >
              H3
            </button>
            <button
              type="button"
              onClick={() => insertMarkdown({ prefix: '**', suffix: '**' })}
              className="px-2 py-1 border rounded hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white"
            >
              太字
            </button>
            <button
              type="button"
              onClick={() => insertMarkdown({ prefix: '*', suffix: '*' })}
              className="px-2 py-1 border rounded hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white"
            >
                    斜体
            </button>
            {/* 新しいマークダウンボタンを追加 */}
            <button
              type="button"
              onClick={() => insertMarkdown({ prefix: '~~', suffix: '~~' })}
              className="px-2 py-1 border rounded hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white"
            >
              打消線
            </button>
            <button
              type="button"
              onClick={() => insertMarkdown({ prefix: '1. ' })}
              className="px-2 py-1 border rounded hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white"
            >
              番号リスト
            </button>
            <button
              type="button"
              onClick={() => insertMarkdown({ prefix: '- ' })}
              className="px-2 py-1 border rounded hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white"
            >
              箇条書き
              </button>
                  </div>
                  <textarea
            ref={textareaRef}
            name="blog_text"
            value={blogData.blog_text}
            onChange={handleTextChange}
            onKeyDown={(e) => {
              handleKeyDown(e);
              handleTextAreaKeyDown(e);
            }}
            placeholder="本文 (Shift+Enterで送信)"
            required
            className="w-full h-96 px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
                  <div className="flex justify-end space-x-2">
                  <button
                      type="button"
                      onClick={handleDeleteClick}
                      className="px-4 py-2 text-gray-600 bg-red-500 rounded-md dark:text-white"
                    >
                      削除
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 text-gray-600 bg-gray-200 rounded-md hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
                    >
                      キャンセル
                    </button>

                    <button
                      type="submit"
                      className="px-4 py-2 text-white bg-blue-500 rounded-md hover:bg-blue-600"
                    >
                      {mode === 'create' ? '作成' : '更新'}
                    </button>
                  </div>
                  </form>
      </div>
    </div>
  );
};

export default BlogFormPopup;