'use client';
import React, { useState } from 'react';
import { useEditor } from '../context/EditorContext';
import styles from '../BlogEditor.module.css';

interface EditorSettingsProps {
  onClose: () => void;
}

/**
 * エディター設定コンポーネント
 * 
 * エディターの設定を変更するためのモーダルUI
 */
const EditorSettings: React.FC<EditorSettingsProps> = ({ onClose }) => {
  const { settings, updateSetting, resetSettings } = useEditor();
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  // タブの状態管理
  const [activeTab, setActiveTab] = useState<'general' | 'appearance' | 'shortcuts'>('general');

  // 一般設定のハンドラ
  const handleAutoSaveChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateSetting('autoSave', e.target.checked);
  };

  const handleAutoSaveIntervalChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateSetting('autoSaveInterval', parseInt(e.target.value));
  };

  const handleSpellCheckChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateSetting('spellCheck', e.target.checked);
  };

  const handleLineWrappingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateSetting('lineWrapping', e.target.checked);
  };

  // 表示設定のハンドラ
  const handleFontSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateSetting('fontSize', e.target.value as 'small' | 'medium' | 'large');
  };

  const handleThemeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateSetting('theme', e.target.value as 'light' | 'dark' | 'system');
  };

  const handleTabSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateSetting('tabSize', parseInt(e.target.value) as 2 | 4);
  };

  const handlePreviewStyleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateSetting('previewStyle', e.target.value as 'split' | 'tab');
  };

  // ショートカット設定のハンドラ
  const handleShortcutChange = (shortcut: keyof typeof settings.keyboardShortcuts) => {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      updateSetting('keyboardShortcuts', {
        ...settings.keyboardShortcuts,
        [shortcut]: e.target.checked,
      });
    };
  };

  // 設定リセットのハンドラ
  const handleResetSettings = () => {
    resetSettings();
    setShowConfirmReset(false);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center border-b p-4 dark:bg-gray-800">
          <h2 className="text-xl font-semibold text-blue-500 dark:text-white">エディター設定</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            aria-label="閉じる"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex border-b dark:border-gray-900 dark:bg-gray-800">
          <button
            className={`px-4 py-2 ${activeTab === 'general' ? 'border-b-2 border-blue-500 text-blue-500 dark:text-white' : 'text-gray-600'}`}
            onClick={() => setActiveTab('general')}
          >
            一般
          </button>
          <button
            className={`px-4 py-2 ${activeTab === 'appearance' ? 'border-b-2 border-blue-500 text-blue-500 dark:text-white' : 'text-gray-600'}`}
            onClick={() => setActiveTab('appearance')}
          >
            表示
          </button>
          <button
            className={`px-4 py-2 ${activeTab === 'shortcuts' ? 'border-b-2 border-blue-500 text-blue-500 dark:text-white' : 'text-gray-600'}`}
            onClick={() => setActiveTab('shortcuts')}
          >
            ショートカット
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh] dark:bg-gray-800">
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-4 text-blue-500 dark:text-white">一般設定</h3>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label htmlFor="autoSave" className="block text-sm font-medium text-gray-700 dark:text-white">
                      自動保存
                    </label>
                    <input
                      type="checkbox"
                      id="autoSave"
                      checked={settings.autoSave}
                      onChange={handleAutoSaveChange}
                      className="h-4 w-4 text-blue-600 rounded"
                    />
                  </div>

                  {settings.autoSave && (
                    <div className="flex items-center justify-between ml-6">
                      <label htmlFor="autoSaveInterval" className="block text-sm font-medium text-gray-700 dark:text-white">
                        保存間隔
                      </label>
                      <select
                        id="autoSaveInterval"
                        value={settings.autoSaveInterval}
                        onChange={handleAutoSaveIntervalChange}
                        className="mt-1 block w-40 py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                      >
                        <option value="5000">5秒</option>
                        <option value="10000">10秒</option>
                        <option value="30000">30秒</option>
                        <option value="60000">1分</option>
                        <option value="300000">5分</option>
                      </select>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <label htmlFor="spellCheck" className="block text-sm font-medium text-gray-700 dark:text-white">
                      スペルチェック
                    </label>
                    <input
                      type="checkbox"
                      id="spellCheck"
                      checked={settings.spellCheck}
                      onChange={handleSpellCheckChange}
                      className="h-4 w-4 text-blue-600 rounded"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <label htmlFor="lineWrapping" className="block text-sm font-medium text-gray-700 dark:text-white">
                      テキスト折り返し
                    </label>
                    <input
                      type="checkbox"
                      id="lineWrapping"
                      checked={settings.lineWrapping}
                      onChange={handleLineWrappingChange}
                      className="h-4 w-4 text-blue-600 rounded"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-4">表示設定</h3>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label htmlFor="fontSize" className="block text-sm font-medium text-gray-700 dark:text-white">
                      フォントサイズ
                    </label>
                    <select
                      id="fontSize"
                      value={settings.fontSize}
                      onChange={handleFontSizeChange}
                      className="mt-1 block w-40 py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                    >
                      <option value="small">小</option>
                      <option value="medium">中</option>
                      <option value="large">大</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between">
                    <label htmlFor="theme" className="block text-sm font-medium text-gray-700 dark:text-white">
                      テーマ
                    </label>
                    <select
                      id="theme"
                      value={settings.theme}
                      onChange={handleThemeChange}
                      className="mt-1 block w-40 py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                    >
                      <option value="light">ライト</option>
                      <option value="dark">ダーク</option>
                      <option value="system">システム設定に従う</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between">
                    <label htmlFor="tabSize" className="block text-sm font-medium text-gray-700 dark:text-white">
                      タブサイズ
                    </label>
                    <select
                      id="tabSize"
                      value={settings.tabSize}
                      onChange={handleTabSizeChange}
                      className="mt-1 block w-40 py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                    >
                      <option value="2">2 スペース</option>
                      <option value="4">4 スペース</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between">
                    <label htmlFor="previewStyle" className="block text-sm font-medium text-gray-700 dark:text-white">
                      プレビュースタイル
                    </label>
                    <select
                      id="previewStyle"
                      value={settings.previewStyle}
                      onChange={handlePreviewStyleChange}
                      className="mt-1 block w-40 py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                    >
                      <option value="split">分割表示</option>
                      <option value="tab">タブ表示</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'shortcuts' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-4 text-gray-700 dark:text-white">ショートカット設定</h3>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label htmlFor="shortcutSave" className="block text-sm font-medium text-gray-700 dark:text-white">
                      保存 (Ctrl+S)
                    </label>
                    <input
                      type="checkbox"
                      id="shortcutSave"
                      checked={settings.keyboardShortcuts.save}
                      onChange={handleShortcutChange('save')}
                      className="h-4 w-4 text-blue-600 rounded"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <label htmlFor="shortcutUndo" className="block text-sm font-medium text-gray-700 dark:text-white">
                      元に戻す (Ctrl+Z)
                    </label>
                    <input
                      type="checkbox"
                      id="shortcutUndo"
                      checked={settings.keyboardShortcuts.undo}
                      onChange={handleShortcutChange('undo')}
                      className="h-4 w-4 text-blue-600 rounded"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <label htmlFor="shortcutRedo" className="block text-sm font-medium text-gray-700 dark:text-white">
                      やり直し (Ctrl+Shift+Z)
                    </label>
                    <input
                      type="checkbox"
                      id="shortcutRedo"
                      checked={settings.keyboardShortcuts.redo}
                      onChange={handleShortcutChange('redo')}
                      className="h-4 w-4 text-blue-600 rounded"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <label htmlFor="shortcutBold" className="block text-sm font-medium text-gray-700 dark:text-white">
                      太字 (Ctrl+B)
                    </label>
                    <input
                      type="checkbox"
                      id="shortcutBold"
                      checked={settings.keyboardShortcuts.bold}
                      onChange={handleShortcutChange('bold')}
                      className="h-4 w-4 text-blue-600 rounded"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <label htmlFor="shortcutItalic" className="block text-sm font-medium text-gray-700 dark:text-white">
                      斜体 (Ctrl+I)
                    </label>
                    <input
                      type="checkbox"
                      id="shortcutItalic"
                      checked={settings.keyboardShortcuts.italic}
                      onChange={handleShortcutChange('italic')}
                      className="h-4 w-4 text-blue-600 rounded"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-gray-50 px-4 py-3 flex justify-between dark:bg-gray-800 ">
          {showConfirmReset ? (
            <div className="flex items-center space-x-4">
              <p className="text-sm text-red-600">本当にリセットしますか？</p>
              <button
                type="button"
                onClick={() => setShowConfirmReset(false)}
                className="text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleResetSettings}
                className="text-sm font-medium text-red-600 hover:text-red-700"
              >
                リセット確定
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowConfirmReset(true)}
              className="text-sm font-medium text-red-600 hover:text-red-700"
            >
              設定をリセット
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditorSettings;