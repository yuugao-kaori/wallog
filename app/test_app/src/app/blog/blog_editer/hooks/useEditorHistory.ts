import { useState, useRef, useCallback } from 'react';

/**
 * エディター履歴管理カスタムフック
 * 
 * テキストエディタの編集履歴を保持し、Undo/Redo操作を可能にします
 * 
 * @param initialText 初期テキスト
 * @returns 履歴管理オブジェクト
 */
const useEditorHistory = (initialText: string = '') => {
  // 履歴配列と現在の位置
  const [history, setHistory] = useState<string[]>(initialText ? [initialText] : []);
  const [currentIndex, setCurrentIndex] = useState(initialText ? 0 : -1);
  const [isUndoRedo, setIsUndoRedo] = useState(false);
  
  // debounce用のタイマー参照
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * 履歴に新しい状態を追加
   * @param newText 新しいテキスト内容
   * @param immediate 即時追加するか（debounceを適用しないか）
   */
  const addToHistory = useCallback((newText: string, immediate: boolean = false) => {
    if (isUndoRedo) return;
    
    const updateHistoryState = () => {
      const lastHistoryItem = history[currentIndex];
      
      // 前回と同じ内容なら追加しない
      if (lastHistoryItem !== newText) {
        // 現在位置以降の履歴を削除し、新しい状態を追加
        const newHistory = [...history.slice(0, currentIndex + 1), newText];
        setHistory(newHistory);
        setCurrentIndex(newHistory.length - 1);
      }
    };
    
    if (immediate) {
      // 即時更新（マークダウン挿入など、ユーザーの明示的な操作）
      updateHistoryState();
    } else {
      // 通常の入力に対してはデバウンス処理を適用
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      
      debounceTimerRef.current = setTimeout(updateHistoryState, 500);
    }
  }, [history, currentIndex, isUndoRedo]);

  /**
   * 履歴を1つ前に戻す (Undo)
   * @returns 戻った後のテキスト
   */
  const undo = useCallback(() => {
    if (currentIndex > 0) {
      setIsUndoRedo(true);
      setCurrentIndex(prevIndex => prevIndex - 1);
      
      // Undo/Redo操作のフラグをリセット
      setTimeout(() => {
        setIsUndoRedo(false);
      }, 100);
      
      return history[currentIndex - 1];
    }
    
    return history[currentIndex];
  }, [history, currentIndex]);

  /**
   * 履歴を1つ先に進める (Redo)
   * @returns 進んだ後のテキスト
   */
  const redo = useCallback(() => {
    if (currentIndex < history.length - 1) {
      setIsUndoRedo(true);
      setCurrentIndex(prevIndex => prevIndex + 1);
      
      // Undo/Redo操作のフラグをリセット
      setTimeout(() => {
        setIsUndoRedo(false);
      }, 100);
      
      return history[currentIndex + 1];
    }
    
    return history[currentIndex];
  }, [history, currentIndex]);

  /**
   * 特定の履歴ポイントに戻る
   * @param index 履歴のインデックス
   * @returns 選択した履歴のテキスト
   */
  const goToHistoryPoint = useCallback((index: number) => {
    if (index >= 0 && index < history.length && index !== currentIndex) {
      setIsUndoRedo(true);
      setCurrentIndex(index);
      
      setTimeout(() => {
        setIsUndoRedo(false);
      }, 100);
      
      return history[index];
    }
    
    return history[currentIndex];
  }, [history, currentIndex]);

  /**
   * 履歴を初期化
   * @param initialText 初期テキスト
   */
  const resetHistory = useCallback((initialText: string = '') => {
    const newHistory = initialText ? [initialText] : [];
    setHistory(newHistory);
    setCurrentIndex(initialText ? 0 : -1);
  }, []);

  return {
    history,
    currentIndex,
    isUndoRedo,
    addToHistory,
    undo,
    redo,
    goToHistoryPoint,
    resetHistory,
  };
};

export default useEditorHistory;