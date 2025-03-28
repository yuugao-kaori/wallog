'use client';
import React, { createContext, useState, useContext, ReactNode } from 'react';

// エディター設定の型定義
interface EditorSettings {
  autoSave: boolean;
  autoSaveInterval: number; // ミリ秒単位
  fontSize: 'small' | 'medium' | 'large';
  theme: 'light' | 'dark' | 'system';
  tabSize: 2 | 4;
  lineWrapping: boolean;
  spellCheck: boolean;
  previewStyle: 'split' | 'tab';
  keyboardShortcuts: {
    save: boolean;
    undo: boolean;
    redo: boolean;
    bold: boolean;
    italic: boolean;
  };
}

// デフォルト設定
const defaultSettings: EditorSettings = {
  autoSave: true,
  autoSaveInterval: 30000, // 30秒
  fontSize: 'medium',
  theme: 'system',
  tabSize: 2,
  lineWrapping: true,
  spellCheck: false,
  previewStyle: 'split',
  keyboardShortcuts: {
    save: true,
    undo: true,
    redo: true,
    bold: true,
    italic: true,
  },
};

// コンテキストの型定義
interface EditorContextType {
  settings: EditorSettings;
  updateSetting: <K extends keyof EditorSettings>(
    key: K,
    value: EditorSettings[K]
  ) => void;
  resetSettings: () => void;
}

// コンテキストの作成
const EditorContext = createContext<EditorContextType | undefined>(undefined);

// コンテキストプロバイダー
export const EditorProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // ローカルストレージから設定を読み込む
  const loadSettings = (): EditorSettings => {
    if (typeof window === 'undefined') return defaultSettings;
    
    const savedSettings = localStorage.getItem('editor_settings');
    if (!savedSettings) return defaultSettings;
    
    try {
      return { ...defaultSettings, ...JSON.parse(savedSettings) };
    } catch (error) {
      console.error('設定の読み込みに失敗しました:', error);
      return defaultSettings;
    }
  };
  
  const [settings, setSettings] = useState<EditorSettings>(loadSettings);
  
  // 設定の更新
  const updateSetting = <K extends keyof EditorSettings>(
    key: K,
    value: EditorSettings[K]
  ) => {
    setSettings(prev => {
      const newSettings = { ...prev, [key]: value };
      localStorage.setItem('editor_settings', JSON.stringify(newSettings));
      return newSettings;
    });
  };
  
  // 設定のリセット
  const resetSettings = () => {
    setSettings(defaultSettings);
    localStorage.removeItem('editor_settings');
  };
  
  const value = {
    settings,
    updateSetting,
    resetSettings,
  };
  
  return (
    <EditorContext.Provider value={value}>
      {children}
    </EditorContext.Provider>
  );
};

// カスタムフック
export const useEditor = (): EditorContextType => {
  const context = useContext(EditorContext);
  if (context === undefined) {
    throw new Error('useEditor must be used within an EditorProvider');
  }
  return context;
};

// ショートカット: EditorProvider と useEditor をデフォルトエクスポート
export default {
  EditorProvider,
  useEditor,
};