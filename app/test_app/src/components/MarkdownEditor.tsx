
'use client';
import React, { useState, useRef } from 'react';

interface MarkdownEditorProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  name: string;
}

const MarkdownEditor = ({ value, onChange, name }: MarkdownEditorProps) => {
  const [emptyLineCount, setEmptyLineCount] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertMarkdown = (markdownSyntax: { prefix: string, suffix?: string }) => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);
    
    const isHeading = markdownSyntax.prefix.includes('#');
    
    const newText = text.substring(0, start) + 
      markdownSyntax.prefix + 
      (selectedText || (isHeading ? '' : '文字を入力')) + 
      (isHeading ? '' : (markdownSyntax.suffix || markdownSyntax.prefix)) + 
      text.substring(end);

    const event = {
      target: {
        name,
        value: newText
      }
    } as React.ChangeEvent<HTMLTextAreaElement>;
    
    onChange(event);
    
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + markdownSyntax.prefix.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const handleTextAreaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
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
            const newText = value.slice(0, selectionStart) + '\n' + value.slice(selectionStart);
            const event = {
              target: {
                name,
                value: newText
              }
            } as React.ChangeEvent<HTMLTextAreaElement>;
            onChange(event);
            setEmptyLineCount(0);
            
            setTimeout(() => {
              textarea.selectionStart = textarea.selectionEnd = selectionStart + 1;
            }, 0);
            return;
          }
        } else {
          setEmptyLineCount(0);
        }

        const newText = value.slice(0, selectionStart) + '\n' + prefix + value.slice(selectionStart);
        const event = {
          target: {
            name,
            value: newText
          }
        } as React.ChangeEvent<HTMLTextAreaElement>;
        onChange(event);
        
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = selectionStart + prefix.length + 1;
        }, 0);
      } else {
        setEmptyLineCount(0);
      }
    }
  };

  return (
    <>
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
          onClick={() => insertMarkdown({ prefix: '