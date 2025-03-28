'use client';
import React, { useState, useRef, useEffect } from 'react';

interface TagSelectorProps {
  tags: string[];
  onChange: (tags: string[]) => void;
}

/**
 * タグセレクターコンポーネント
 * 
 * ブログのタグ入力と管理を行います
 */
const TagSelector: React.FC<TagSelectorProps> = ({ tags, onChange }) => {
  const [inputValue, setInputValue] = useState<string>('');
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionRef = useRef<HTMLDivElement>(null);

  // 既存のタグを取得する
  useEffect(() => {
    const fetchExistingTags = async () => {
      try {
        const response = await fetch('/api/blog/tag_list', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          setSuggestedTags(data);
        }
      } catch (error) {
        console.error('タグ取得エラー:', error);
      }
    };
    
    fetchExistingTags();
  }, []);

  // 入力値が変わったときの処理
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    
    // タグ候補を絞り込む
    if (value.trim()) {
      const filtered = suggestedTags
        .filter(tag => tag.toLowerCase().includes(value.toLowerCase()))
        .filter(tag => !tags.includes(tag));
      
      setShowSuggestions(filtered.length > 0);
    } else {
      setShowSuggestions(false);
    }
  };

  // 入力欄でキーを押したときの処理
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      addTag(inputValue.trim());
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      // 入力値が空でBackspaceが押されたら最後のタグを削除
      removeTag(tags.length - 1);
    }
  };

  // タグを追加
  const addTag = (tag: string) => {
    if (tag && !tags.includes(tag)) {
      const newTags = [...tags, tag];
      onChange(newTags);
      setInputValue('');
      setShowSuggestions(false);
    }
  };

  // タグを削除
  const removeTag = (index: number) => {
    const newTags = tags.filter((_, i) => i !== index);
    onChange(newTags);
  };

  // 候補からタグを選択
  const selectSuggestion = (tag: string) => {
    addTag(tag);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // 外部クリックで候補を閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionRef.current && !suggestionRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        タグ
      </label>
      
      <div className="flex flex-wrap gap-2 p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 min-h-[42px]">
        {tags.map((tag, index) => (
          <div
            key={index}
            className="flex items-center bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-md"
          >
            <span className="mr-1">#{tag}</span>
            <button
              type="button"
              onClick={() => removeTag(index)}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
            >
              ×
            </button>
          </div>
        ))}
        
        <div className="relative flex-grow">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={tags.length > 0 ? "" : "タグを入力（Enterで追加）"}
            className="w-full min-w-[120px] p-1 border-none bg-transparent focus:outline-none text-gray-800 dark:text-gray-200"
          />
          
          {showSuggestions && (
            <div
              ref={suggestionRef}
              className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto"
            >
              {suggestedTags
                .filter(tag => tag.toLowerCase().includes(inputValue.toLowerCase()))
                .filter(tag => !tags.includes(tag))
                .map((tag, index) => (
                  <div
                    key={index}
                    onClick={() => selectSuggestion(tag)}
                    className="px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200"
                  >
                    {tag}
                  </div>
                ))
              }
            </div>
          )}
        </div>
      </div>
      
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Enterキーでタグを追加、Backspaceキーで最後のタグを削除できます
      </p>
    </div>
  );
};

export default TagSelector;