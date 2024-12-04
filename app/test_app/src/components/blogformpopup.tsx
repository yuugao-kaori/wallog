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
  };
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  mode?: 'create' | 'edit';
}

const BlogFormPopup: React.FC<BlogFormPopupProps> = ({
  isOpen,
  onClose,
  blogData,
  onInputChange,
  onSubmit,
  mode = 'create'
}: BlogFormPopupProps) => {
  if (!isOpen) return null;

  const MAX_HISTORY_LENGTH = 100; // 履歴の最大保存数
  const [emptyLineCount, setEmptyLineCount] = useState(0);
  const [textHistory, setTextHistory] = useState<Array<{text: string, cursorPos: number}>>([{
    text: blogData.blog_text,
    cursorPos: 0
  }]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [markdownHistory, setMarkdownHistory] = useState<Array<{start: number, end: number, original: string}>>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const addToHistory = (newText: string, cursorPos: number, isMarkdown = false) => {
    if (!isMarkdown) {
      setTextHistory(prev => {
        const newHistory = [...prev.slice(0, historyIndex + 1)];
        if (newHistory[newHistory.length - 1]?.text !== newText) {
          newHistory.push({ text: newText, cursorPos });
          // 履歴が最大数を超えた場合、古いものから削除
          if (newHistory.length > MAX_HISTORY_LENGTH) {
            newHistory.shift();
          }
          return newHistory;
        }
        return prev;
      });
      setHistoryIndex(prev => Math.min(prev + 1, MAX_HISTORY_LENGTH - 1));
    }
  };

  const insertMarkdown = (markdownSyntax: { prefix: string, suffix?: string }) => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);
    
    // マークダウン挿入前のテキストを履歴に保存
    setMarkdownHistory(prev => [...prev, {
      start,
      end,
      original: selectedText
    }]);

    const scrollTop = textarea.scrollTop;
    
    const isHeading = ['#', '>', '---'].some(symbol => markdownSyntax.prefix.includes(symbol));
    const isList = markdownSyntax.prefix === '- ' || /^\d+\. $/.test(markdownSyntax.prefix);
    
    let newText;
    if (isList && selectedText) {
      const lines = selectedText.split('\n');
      let listNumber = 1;
      
      const processedLines = lines.map((line, index) => {
        if (line.trim().startsWith('- ') || /^\d+\. /.test(line.trim())) {
          return line;
        }
        if (/^\d+\. $/.test(markdownSyntax.prefix)) {
          return `${listNumber++}. ${line}`;
        }
        return markdownSyntax.prefix === '- ' 
          ? `- ${line}`
          : `${index + 1}. ${line}`;
      });

      
      newText = text.substring(0, start) + processedLines.join('\n') + text.substring(end);
    } else {
      newText = text.substring(0, start) + 
        markdownSyntax.prefix + 
        (selectedText || (isHeading || isList ? '' : '')) + 
        (isHeading || isList ? '' : (markdownSyntax.suffix || markdownSyntax.prefix)) + 
        text.substring(end);
    }

    const event = {
      target: {
        name: 'blog_text',
        value: newText
      }
    } as React.ChangeEvent<HTMLTextAreaElement>;
    
    addToHistory(newText, start + markdownSyntax.prefix.length, true);
    onInputChange(event);
    
    setTimeout(() => {
      textarea.focus();
      textarea.scrollTop = scrollTop;
      if (isList && selectedText) {
        textarea.setSelectionRange(start, start + newText.length - text.length + end - start);
      } else {
        const newCursorPos = start + markdownSyntax.prefix.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  const handleTextAreaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      
      if (e.shiftKey) {
        // Ctrl+Shift+Z (Redo)
        if (historyIndex < textHistory.length - 1) {
          const newIndex = historyIndex + 1;
          const historyItem = textHistory[newIndex];
          setHistoryIndex(newIndex);
          
          const event = {
            target: {
              name: 'blog_text',
              value: historyItem.text
            }
          } as React.ChangeEvent<HTMLTextAreaElement>;
          onInputChange(event);
          
          if (textareaRef.current) {
            setTimeout(() => {
              textareaRef.current!.selectionStart = historyItem.cursorPos;
              textareaRef.current!.selectionEnd = historyItem.cursorPos;
            }, 0);
          }
        }
      } else {
        // Ctrl+Z (Undo)
        if (historyIndex > 0) {
          const newIndex = historyIndex - 1;
          const historyItem = textHistory[newIndex];
          setHistoryIndex(newIndex);
          
          const event = {
            target: {
              name: 'blog_text',
              value: historyItem.text
            }
          } as React.ChangeEvent<HTMLTextAreaElement>;
          onInputChange(event);
          
          if (textareaRef.current) {
            setTimeout(() => {
              textareaRef.current!.selectionStart = historyItem.cursorPos;
              textareaRef.current!.selectionEnd = historyItem.cursorPos;
            }, 0);
          }
        }
      }
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.currentTarget;
      const { value, selectionStart, selectionEnd } = textarea;
      
      const newText = value.substring(0, selectionStart) + '\t' + value.substring(selectionEnd);
      const event = {
        target: {
          name: 'blog_text',
          value: newText
        }
      } as React.ChangeEvent<HTMLTextAreaElement>;
      
      onInputChange(event);
      addToHistory(newText, selectionStart + 1);
      
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = selectionStart + 1;
      }, 0);
      return;
    }
  
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        e.preventDefault();
        const mockEvent = { preventDefault: () => {} } as React.FormEvent;
        onSubmit(mockEvent);
        return;
      }

      const textarea = e.currentTarget;
      const { value, selectionStart } = textarea;
      
      const lastNewLine = value.lastIndexOf('\n', selectionStart - 1);
      const currentLineStart = lastNewLine + 1;
      const currentLine = value.slice(currentLineStart, selectionStart);
      
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
            const currentPos = textarea.selectionStart;
            const scrollTop = textarea.scrollTop;
            const newText = value.slice(0, currentLineStart) + value.slice(selectionStart);
            const event = {
              target: {
                name: 'blog_text',
                value: newText
              }
            } as React.ChangeEvent<HTMLTextAreaElement>;
            onInputChange(event);
            setEmptyLineCount(0);
            
            // カーソル位置とスクロール位置を維持
            setTimeout(() => {
              textarea.selectionStart = textarea.selectionEnd = currentPos - (selectionStart - currentLineStart);
              textarea.scrollTop = scrollTop;
            }, 0);
            return;
          }
        } else {
          setEmptyLineCount(0);
        }

        const newText = value.slice(0, selectionStart) + '\n' + prefix + value.slice(selectionStart);
        const event = {
          target: {
            name: 'blog_text',
            value: newText
          }
        } as React.ChangeEvent<HTMLTextAreaElement>;
        onInputChange(event);
        addToHistory(newText, selectionStart + prefix.length + 1);
        
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = selectionStart + prefix.length + 1;
        }, 0);
      } else {
        setEmptyLineCount(0);
      }
    }

  };

  const handleTextAreaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;
    const currentPos = textarea.selectionStart;
    const scrollTop = textarea.scrollTop;
    
    if (e.target.name === 'blog_text') {
      const newText = e.target.value;
      addToHistory(newText, currentPos);
      onInputChange(e);
      
      // カーソル位置とスクロール位置を維持
      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = currentPos;
        textarea.scrollTop = scrollTop;
      });
    } else {
      onInputChange(e);
    }
  };

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
            placeholder="タイトル"
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
            <button
              type="button"
                      onClick={() => insertMarkdown({ prefix: '```', suffix: '```' })}
                      className="px-2 py-1 border rounded hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white"
                    >
                      コードブロック
                    </button>
                    <button
              type="button"
              onClick={() => insertMarkdown({ prefix: '> ' })}
              className="px-2 py-1 border rounded hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white"
            >
              引用
            </button>
            <button
              type="button"
              onClick={() => insertMarkdown({ prefix: '---' })}
              className="px-2 py-1 border rounded hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white"
            >
              区切り線
            </button>
                  </div>
                  <textarea
            ref={textareaRef}
            name="blog_text"
            value={blogData.blog_text}
            onChange={onInputChange}
            onKeyDown={handleTextAreaKeyDown}
            placeholder="本文 (Shift+Enterで送信)"
            required
            className="w-full h-96 px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
                  <div className="flex justify-end space-x-2">
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