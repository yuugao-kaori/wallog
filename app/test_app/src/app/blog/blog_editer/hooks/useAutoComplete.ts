import { useCallback } from 'react';

interface AutoCompleteOptions {
  /**
   * リスト項目の自動継続を有効にするか
   */
  enableListContinuation?: boolean;
  /**
   * インデントの自動検出を有効にするか
   */
  enableIndentDetection?: boolean;
  /**
   * 空行でのリスト終了を有効にするか
   */
  enableListTermination?: boolean;
}

/**
 * エディターのオートコンプリート機能を提供するカスタムフック
 * 
 * @param options オートコンプリートのオプション
 * @returns オートコンプリート関連の関数
 */
const useAutoComplete = (options: AutoCompleteOptions = {}) => {
  const {
    enableListContinuation = true,
    enableIndentDetection = true,
    enableListTermination = true,
  } = options;
  
  /**
   * エディタでEnterキーが押されたときのオートコンプリート処理
   * 
   * @param value 現在のテキスト
   * @param selectionStart カーソル位置
   * @returns 変更後のテキストとカーソル位置の新しい情報
   */
  const handleEnterKey = useCallback((value: string, selectionStart: number) => {
    if (!enableListContinuation) {
      return { newText: value, newCursorPosition: selectionStart };
    }
    
    // 現在の行を取得
    const lastNewLine = value.lastIndexOf('\n', selectionStart - 1);
    const currentLineStart = lastNewLine + 1;
    const currentLine = value.slice(currentLineStart, selectionStart);
    
    // 順序付きリスト
    const numberMatch = currentLine.match(/^(\s*)(\d+)\. (.*)/);
    // 順序なしリスト
    const bulletMatch = currentLine.match(/^(\s*)[*-] (.*)/);
    // タスクリスト
    const taskMatch = currentLine.match(/^(\s*)[*-] \[([ xX])\] (.*)/);
    
    if (numberMatch || bulletMatch || taskMatch) {
      let indent = '';
      let prefix = '';
      let content = '';
      
      if (numberMatch) {
        // 順序付きリスト
        const [_, spaces, num, text] = numberMatch;
        indent = spaces || '';
        content = text;
        prefix = `${indent}${parseInt(num) + 1}. `;
      } else if (taskMatch) {
        // タスクリスト
        const [_, spaces, checkMark, text] = taskMatch;
        indent = spaces || '';
        content = text;
        prefix = `${indent}- [ ] `;
      } else if (bulletMatch) {
        // 順序なしリスト
        const [_, spaces, text] = bulletMatch;
        indent = spaces || '';
        content = text;
        prefix = `${indent}- `;
      }
      
      // 空行の場合はリストを終了
      if (enableListTermination && content.trim() === '') {
        return {
          newText: value.slice(0, selectionStart) + '\n' + value.slice(selectionStart),
          newCursorPosition: selectionStart + 1,
        };
      }
      
      // 新しい行を挿入
      return {
        newText: value.slice(0, selectionStart) + '\n' + prefix + value.slice(selectionStart),
        newCursorPosition: selectionStart + prefix.length + 1,
      };
    }
    
    return { newText: value, newCursorPosition: selectionStart };
  }, [enableListContinuation, enableListTermination]);

  /**
   * エディタでTabキーが押されたときのインデント処理
   * 
   * @param value 現在のテキスト
   * @param selectionStart 選択開始位置
   * @param selectionEnd 選択終了位置
   * @param isShiftKey Shiftキーが押されているか
   * @returns 変更後のテキストとカーソル位置の新しい情報
   */
  const handleTabKey = useCallback((
    value: string,
    selectionStart: number,
    selectionEnd: number,
    isShiftKey: boolean
  ) => {
    if (!enableIndentDetection) {
      return { 
        newText: value, 
        newSelectionStart: selectionStart,
        newSelectionEnd: selectionEnd
      };
    }
    
    // 選択範囲がある場合
    if (selectionStart !== selectionEnd) {
      const selectedText = value.substring(selectionStart, selectionEnd);
      const lines = selectedText.split('\n');
      
      let modifiedText = '';
      if (isShiftKey) {
        // アウトデント
        modifiedText = lines.map(line => {
          if (line.startsWith('  ')) return line.substring(2);
          if (line.startsWith('\t')) return line.substring(1);
          return line;
        }).join('\n');
      } else {
        // インデント
        modifiedText = lines.map(line => '  ' + line).join('\n');
      }
      
      const newText = 
        value.substring(0, selectionStart) + 
        modifiedText + 
        value.substring(selectionEnd);
      
      return {
        newText,
        newSelectionStart: selectionStart,
        newSelectionEnd: selectionStart + modifiedText.length
      };
    } else {
      // 選択範囲がない場合はカーソル位置にインデント追加
      if (isShiftKey) {
        // 現在行の先頭部分を確認してインデントがあれば削除
        const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
        const linePrefix = value.substring(lineStart, selectionStart);
        
        if (linePrefix.startsWith('  ')) {
          // 2スペースのインデントを削除
          const newText = 
            value.substring(0, lineStart) + 
            linePrefix.substring(2) + 
            value.substring(selectionStart);
          
          return {
            newText,
            newSelectionStart: selectionStart - 2 < lineStart ? lineStart : selectionStart - 2,
            newSelectionEnd: selectionStart - 2 < lineStart ? lineStart : selectionStart - 2
          };
        } else if (linePrefix.startsWith('\t')) {
          // タブを削除
          const newText = 
            value.substring(0, lineStart) + 
            linePrefix.substring(1) + 
            value.substring(selectionStart);
          
          return {
            newText,
            newSelectionStart: selectionStart - 1 < lineStart ? lineStart : selectionStart - 1,
            newSelectionEnd: selectionStart - 1 < lineStart ? lineStart : selectionStart - 1
          };
        }
      } else {
        // インデント追加
        const newText = 
          value.substring(0, selectionStart) + 
          '  ' + 
          value.substring(selectionStart);
        
        return {
          newText,
          newSelectionStart: selectionStart + 2,
          newSelectionEnd: selectionStart + 2
        };
      }
    }
    
    return { 
      newText: value, 
      newSelectionStart: selectionStart,
      newSelectionEnd: selectionEnd
    };
  }, [enableIndentDetection]);

  return {
    handleEnterKey,
    handleTabKey
  };
};

export default useAutoComplete;