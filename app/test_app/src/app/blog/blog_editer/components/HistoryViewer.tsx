'use client';
import React from 'react';
import styles from '../BlogEditor.module.css';

interface HistoryViewerProps {
  history: string[];
  currentIndex: number;
  onRevert: (index: number) => void;
}

/**
 * 編集履歴表示コンポーネント
 * 
 * 編集履歴とタイムラインを表示し、過去の状態に戻る機能を提供します
 */
const HistoryViewer: React.FC<HistoryViewerProps> = ({
  history,
  currentIndex,
  onRevert,
}) => {
  // 履歴が空の場合は何も表示しない
  if (history.length === 0) return null;
  
  // 表示用に履歴を整形
  const historyItems = history.map((item, index) => {
    // 簡易的なdiff表示のために、前回との差分文字数を計算
    const prevItem = index > 0 ? history[index - 1] : '';
    const diffLength = item.length - prevItem.length;
    const diffText = diffLength >= 0 ? `+${diffLength}` : `${diffLength}`;
    
    return {
      index,
      isCurrent: index === currentIndex,
      diffText,
      // 簡易コンテンツプレビュー (50文字まで)
      preview: item.length > 50 ? `${item.substring(0, 50)}...` : item,
    };
  });

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-gray-700 dark:text-white">編集履歴</h3>
      
      <div className="flex items-center space-x-2 mb-2 dark:bg-gray-800">
        <div className="text-xs text-gray-500 dark:text-white">
          履歴: {currentIndex + 1}/{history.length}
        </div>
        
        <div className="flex-grow h-1 bg-gray-200 rounded">
          <div
            className="h-1 bg-blue-500 rounded"
            style={{ width: `${((currentIndex + 1) / history.length) * 100}%` }}
          />
        </div>
      </div>
      
      <div className="max-h-40 overflow-y-auto border rounded-md dark:bg-gray-800">
        {historyItems.map((item) => (
          <div
            key={item.index}
            className={`flex items-center justify-between p-2 text-sm border-b dark:bg-gray-800 ${
              item.isCurrent ? 'bg-blue-50' : 'hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center space-x-2 dark:bg-gray-800">
              <span className={`inline-block w-6 text-center ${
                item.isCurrent ? 'font-bold' : ''
              }`}>
                {item.index + 1}
              </span>
              
              <span className="text-xs text-gray-500 dark:text-white">
                {item.diffText} 文字
              </span>
            </div>
            
            {!item.isCurrent && (
              <button
                type="button"
                onClick={() => onRevert(item.index)}
                className="px-2 py-0.5 text-xs bg-gray-100 hover:bg-gray-200 rounded dark:bg-gray-800 dark:text-white"
              >
                この時点に戻る
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default HistoryViewer;