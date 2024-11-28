'use client';
import { useState, useEffect } from 'react';

interface Setting {
    settings_key: string;
    settings_value: string;
}

interface UserInfo {
    user_hashtag: string;
}

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState('system'); // 'system' or 'user'
    const [settings, setSettings] = useState<Setting[]>([]);
    const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // 設定を読み込む
    const fetchSettings = async () => {
        try {
            const response = await fetch('/api/settings/settings_read');
            if (!response.ok) throw new Error('設定の読み込みに失敗しました');
            const data = await response.json();
            setSettings(data);
            setError(null);
        } catch (err) {
            setError('設定の読み込みに失敗しました');
        } finally {
            setLoading(false);
        }
    };

    // ユーザー情報を読み込む
    const fetchUserInfo = async () => {
        try {
            const response = await fetch('/api/user/user_read');
            if (!response.ok) throw new Error('ユーザー情報の読み込みに失敗しました');
            const data = await response.json();
            setUserInfo(data);
            setError(null);
        } catch (err) {
            setError('ユーザー情報の読み込みに失敗しました');
        } finally {
            setLoading(false);
        }
    };

    // 設定を��新する
    const updateSetting = async (key: string, value: string) => {
        try {
            const response = await fetch('/api/settings/settings_update', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    settings_key: key,
                    settings_value: value
                }),
                credentials: 'include' // Cookieを添付
            });

            if (!response.ok) throw new Error('設定の更新に失敗しました');
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
            await fetchSettings(); // 設定を再読み込み
        } catch (err) {
            setError('設定の更新に失敗しました');
        }
    };

    // ユーザー情報を更新する
    const updateUserInfo = async () => {
        if (!userInfo) return;
        try {
            const response = await fetch('/api/user/user_update', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userInfo),
                credentials: 'include'
            });

            if (!response.ok) throw new Error('ユーザー情報の更新に失敗しました');
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            setError('ユーザー情報の更新に失敗しました');
        }
    };

    // 全ての設定を一括更新する
    const updateAllSettings = async () => {
        try {
            for (const setting of settings) {
                await updateSetting(setting.settings_key, setting.settings_value);
            }
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            setError('設定の更新に失敗しました');
        }
    };

    // 設定値の変更を処理
    const handleSettingChange = (index: number, newValue: string) => {
        const newSettings = [...settings];
        newSettings[index] = {
            ...newSettings[index],
            settings_value: newValue
        };
        setSettings(newSettings);
    };

    useEffect(() => {
        if (activeTab === 'system') {
            fetchSettings();
        } else {
            fetchUserInfo();
        }
    }, [activeTab]);

    if (loading) return (
        <div className="flex justify-center items-center h-screen">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
    );

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">設定</h1>

            <div className="mb-6">
                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex">
                        <button
                            className={`mr-4 py-2 px-4 ${activeTab === 'system' ? 
                                'border-b-2 border-blue-500 text-blue-600' : 
                                'text-gray-500 hover:text-gray-700'}`}
                            onClick={() => setActiveTab('system')}
                        >
                            システム設定
                        </button>
                        <button
                            className={`py-2 px-4 ${activeTab === 'user' ? 
                                'border-b-2 border-blue-500 text-blue-600' : 
                                'text-gray-500 hover:text-gray-700'}`}
                            onClick={() => setActiveTab('user')}
                        >
                            ユーザー設定
                        </button>
                    </nav>
                </div>
            </div>

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                </div>
            )}
            {success && (
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                    設定を更新しました
                </div>
            )}

            {activeTab === 'system' ? (
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
                                        onChange={(e) => handleSettingChange(index, e.target.value)}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-6">
                        <button
                            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            onClick={updateAllSettings}
                        >
                            すべての設定を更新
                        </button>
                    </div>
                </>
            ) : (
                <>
                    <div className="space-y-4">
                        <div className="flex items-center gap-4">
                            <div className="w-1/3">
                                <label className="block text-gray-700 dark:text-white text-l">ハッシュタグ</label>
                            </div>
                            <div className="w-2/3">
                                <input
                                    type="text"
                                    className="w-full ml-6 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    value={userInfo?.user_hashtag || ''}
                                    onChange={(e) => setUserInfo(prev => prev ? {...prev, user_hashtag: e.target.value} : null)}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="mt-6">
                        <button
                            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            onClick={updateUserInfo}
                        >
                            ユーザー情報を更新
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
