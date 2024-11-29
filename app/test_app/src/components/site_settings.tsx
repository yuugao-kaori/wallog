
'use client';
import { useState } from 'react';

interface Setting {
    settings_key: string;
    settings_value: string;
}

interface SiteSettingsProps {
    settings: Setting[];
    onSettingChange: (index: number, newValue: string) => void;
    onUpdateAll: () => void;
}

export default function SiteSettings({ settings, onSettingChange, onUpdateAll }: SiteSettingsProps) {
    return (
        <>
            <div className="space-y-4">
                {settings.map((setting, index) => (
                    <div key={setting.settings_key} className="flex items-center gap-4">
                        <div className="w-1/3">
                            <label className="block text-gray-700 dark:text-white text-l">{setting.settings_key}</label>
                        </div>
                        <div className="w-2/3">
                            <input
                                type="text"
                                className="w-full ml-6 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                value={setting.settings_value}
                                onChange={(e) => onSettingChange(index, e.target.value)}
                            />
                        </div>
                    </div>
                ))}
            </div>
            <div className="mt-6">
                <button
                    className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onClick={onUpdateAll}
                >
                    すべての設定を更新
                </button>
            </div>
        </>
    );
}