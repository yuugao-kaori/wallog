'use client';
import React, { useRef, useState, useEffect } from 'react';
import styles from '../BlogEditor.module.css';

interface EditorTextareaProps {
  content: string;
  onChange: (text: string) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}

/**
 * エディタテキストエリアコンポーネント
 * 
 * マークダウン編集用の特化したテキストエリア
 */
const EditorTextarea: React.FC<EditorTextareaProps> = ({ content, onChange, onKeyDown }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [lineCount, setLineCount] = useState(1);
  
  // テキスト変更ハンドラ
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    onChange(newText);
    
    // 行数を更新
    const lines = newText.split('\n').length;
    setLineCount(lines);
  };
  
  // 特殊キー操作の処理
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // 親コンポーネントのキーハンドラを呼び出す
    if (onKeyDown) {
      onKeyDown(e);
    }
    
    const textarea = e.currentTarget;
    const { selectionStart, selectionEnd, value } = textarea;
    
    // Tab キーの処理
    if (e.key === 'Tab') {
      e.preventDefault();
      const newText = value.substring(0, selectionStart) + '  ' + value.substring(selectionEnd);
      
      onChange(newText);
      
      // カーソル位置を調整
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = selectionStart + 2;
        }
      }, 0);
    }
    
    // Enter キーの処理（リスト項目の自動継続）
    if (e.key === 'Enter') {
      const currentLine = value.substring(0, selectionStart).split('\n').pop() || '';
      
      // リスト項目（箇条書き）
      const unorderedMatch = currentLine.match(/^(\s*)- (.*)$/);
      if (unorderedMatch) {
        const [, indent, content] = unorderedMatch;
        
        // 空の項目の場合はリストを終了
        if (!content.trim()) {
          e.preventDefault();
          const newText = value.substring(0, selectionStart - (indent.length + 2)) + '\n' + value.substring(selectionEnd);
          onChange(newText);
          
          setTimeout(() => {
            if (textareaRef.current) {
              textareaRef.current.selectionStart = textareaRef.current.selectionEnd = 
                selectionStart - (indent.length + 1);
            }
          }, 0);
          return;
        }
        
        e.preventDefault();
        const insertion = `\n${indent}- `;
        const newText = value.substring(0, selectionStart) + insertion + value.substring(selectionEnd);
        onChange(newText);
        
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.selectionStart = textareaRef.current.selectionEnd = 
              selectionStart + insertion.length;
          }
        }, 0);
        return;
      }
      
      // 順序付きリスト
      const orderedMatch = currentLine.match(/^(\s*)(\d+)\. (.*)$/);
      if (orderedMatch) {
        const [, indent, num, content] = orderedMatch;
        
        // 空の項目の場合はリストを終了
        if (!content.trim()) {
          e.preventDefault();
          const newText = value.substring(0, selectionStart - (indent.length + num.length + 2)) + '\n' + value.substring(selectionEnd);
          onChange(newText);
          
          setTimeout(() => {
            if (textareaRef.current) {
              textareaRef.current.selectionStart = textareaRef.current.selectionEnd = 
                selectionStart - (indent.length + num.length + 1);
            }
          }, 0);
          return;
        }
        
        e.preventDefault();
        const nextNum = parseInt(num, 10) + 1;
        const insertion = `\n${indent}${nextNum}. `;
        const newText = value.substring(0, selectionStart) + insertion + value.substring(selectionEnd);
        onChange(newText);
        
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.selectionStart = textareaRef.current.selectionEnd = 
              selectionStart + insertion.length;
          }
        }, 0);
      }
    }
  };
  
  // 自動リサイズ
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.max(300, textareaRef.current.scrollHeight)}px`;
    }
  }, [content]);

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        name="blog_text"
        value={content}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        className={`${styles.editor} w-full min-h-[300px] px-4 py-3 text-base border border-gray-300 dark:border-gray-600 rounded-md resize-y bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono leading-normal focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
        placeholder="マークダウン記法でブログコンテンツを作成できます"
        spellCheck={false}
      />
      <div className="absolute bottom-2 right-2 text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 px-2 py-1 rounded">
        行数: {lineCount}
      </div>
    </div>
  );
};

export default EditorTextarea;