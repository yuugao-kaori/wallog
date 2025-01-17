'use client';
import { useState } from 'react';

interface Setting {
    settings_key: string;
    settings_value: string;
}

interface SiteSettingsProps {
    settings: Setting[];
    onSettingChange: (key: string, newValue: string) => void;  // indexをkeyに変更
    onUpdateAll: () => void;
}

export default function SiteSettings({ settings, onSettingChange, onUpdateAll }: SiteSettingsProps) {
    const [isUpdating, setIsUpdating] = useState(false);
    const [isClearing, setIsClearing] = useState(false);

    const handleUpdateAll = async () => {
        if (isUpdating) return;
        setIsUpdating(true);
        try {
            await onUpdateAll();
        } finally {
            setIsUpdating(false);
        }
    };

    const handleClearCache = () => {
        setIsClearing(true);
        try {
            // キャッシュを削除
            localStorage.removeItem('siteSettings');
            
            // カスタムイベントを発火してNavBarに通知
            const event = new CustomEvent('settingsUpdated', {
                detail: { timestamp: Date.now() }
            });
            window.dispatchEvent(event);
        } finally {
            setIsClearing(false);
        }
    };

    return (
        <>
            <div className="space-y-4">
                {settings.map((setting) => (
                    <div key={setting.settings_key} className="flex items-center gap-4">
                        <div className="w-1/3">
                            <label className="block text-gray-700 dark:text-white text-l">{setting.settings_key}</label>
                        </div>
                        <div className="w-2/3">
                            <input
                                type="text"
                                className="w-full ml-6 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                value={setting.settings_value || ''}
                                onChange={(e) => onSettingChange(setting.settings_key, e.target.value)}
                            />
                        </div>
                    </div>
                ))}
            </div>
            <div className="mt-6 flex gap-4">
                <button
                    className={`${isUpdating ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'} bg-blue-500 text-white font-bold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    onClick={handleUpdateAll}
                    disabled={isUpdating}
                >
                    {isUpdating ? '更新中...' : 'すべての設定を更新'}
                </button>
                <button
                    className={`${isClearing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-600'} bg-red-500 text-white font-bold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-red-500`}
                    onClick={handleClearCache}
                    disabled={isClearing}
                >
                    キャッシュを破棄
                </button>
            </div>
        </>
    );
}