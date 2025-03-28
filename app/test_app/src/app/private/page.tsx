'use client';
import { useState, useEffect } from 'react';
import SiteSettings from '@/components/site_settings';
import UserSettings from '@/components/user_settings';
import StickyNote from '@/components/sticky_note';
import LogView from '@/components/log_view';

interface Setting {
    settings_key: string;
    settings_value: string;
}

interface UserInfo {
    user_hashtag: string;
}

interface Note {
    'sticky-note_id': string;
    'sticky-note_title': string;
    'sticky-note_text': string;
    created_at: string;
}

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState('sticky-note');  // デフォルトタブを変更
    const [settings, setSettings] = useState<Setting[]>([]);
    const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [siteCardUrl, setSiteCardUrl] = useState('');
    const [siteCardMessage, setSiteCardMessage] = useState<{text: string, type: 'success' | 'error'} | null>(null);
    const [siteCardLoading, setSiteCardLoading] = useState(false);

    // 設定を読み込む
    const fetchSettings = async () => {
        try {
            const response = await fetch('/api/settings/settings_read', {
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                },
                cache: 'no-store'
            });
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

    // 設定を更新する
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
            // null値を空文字列に変換しながらオブジェクトを生成
            const settingsObject = settings.reduce((acc, setting) => ({
                ...acc,
                [setting.settings_key]: setting.settings_value ?? ''  // null/undefinedの場合は空文字列
            }), {});

            const response = await fetch('/api/settings/settings_write', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                },
                body: JSON.stringify(settingsObject),
                credentials: 'include'
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.details || errorData.error || '設定の更新に失敗しました');
            }
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
            
            // 強制的にキャッシュを無視して再取得
            await new Promise(resolve => setTimeout(resolve, 100)); // 少し待機
            await fetchSettings();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred');
            throw err;
        }
    };

    // 設定値の変更を処理
    const handleSettingChange = (key: string, newValue: string) => {
        const newSettings = [...settings];
        const index = newSettings.findIndex(s => s.settings_key === key);
        if (index !== -1) {
            newSettings[index] = {
                settings_key: key,
                settings_value: newValue
            };
            setSettings(newSettings);
        }
    };

    // サイトカードを再生成する
    const regenerateSiteCard = async () => {
        if (!siteCardUrl.trim()) {
            setSiteCardMessage({
                text: 'URLを入力してください',
                type: 'error'
            });
            return;
        }

        setSiteCardLoading(true);
        setSiteCardMessage(null);

        try {
            const response = await fetch('/api/sitecard/sitecard_update', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url: siteCardUrl }),
                credentials: 'include'
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'サイトカードの再生成に失敗しました');
            }

            setSiteCardMessage({
                text: 'サイトカードを再生成しました',
                type: 'success'
            });
            setSiteCardUrl('');
        } catch (err) {
            setSiteCardMessage({
                text: err instanceof Error ? err.message : 'サイトカードの再生成に失敗しました',
                type: 'error'
            });
        } finally {
            setSiteCardLoading(false);
        }
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
        <div className="fixed inset-0 flex bg-white dark:bg-gray-900 duration-300">
            <main className="flex-1 relative md:ml-48 bg-white dark:bg-gray-900 duration-300">
                <div className="absolute inset-0 overflow-auto">
                    <div className="p-8 max-w-4xl mx-auto">
                        <h1 className="text-3xl font-bold mb-6">Private</h1>

                        <div className="mb-6">
                            <div className="border-b border-gray-200">
                                <nav className="-mb-px flex">
                                    <button
                                        className={`mr-4 py-2 px-4 ${activeTab === 'sticky-note' ? 
                                        'border-b-2 border-blue-500 text-blue-600' : 
                                        'text-gray-500 hover:text-gray-700'}`}
                                        onClick={() => setActiveTab('sticky-note')}
                                    >
                                        付箋メモ
                                    </button>
                                    <button
                                        className={`mr-4 py-2 px-4 ${activeTab === 'system' ? 
                                        'border-b-2 border-blue-500 text-blue-600' : 
                                        'text-gray-500 hover:text-gray-700'}`}
                                        onClick={() => setActiveTab('system')}
                                    >
                                        システム設定
                                    </button>
                                    <button
                                        className={`mr-4 py-2 px-4 ${activeTab === 'user' ? 
                                        'border-b-2 border-blue-500 text-blue-600' : 
                                        'text-gray-500 hover:text-gray-700'}`}
                                        onClick={() => setActiveTab('user')}
                                    >
                                        ユーザー設定
                                    </button>
                                    <button
                                        className={`py-2 px-4 ${activeTab === 'utility' ? 
                                        'border-b-2 border-blue-500 text-blue-600' : 
                                        'text-gray-500 hover:text-gray-700'}`}
                                        onClick={() => setActiveTab('utility')}
                                    >
                                        ユーティリティ
                                    </button>
                                    <button
                                        className={`py-2 px-4 ${activeTab === 'logs' ? 
                                        'border-b-2 border-blue-500 text-blue-600' : 
                                        'text-gray-500 hover:text-gray-700'}`}
                                        onClick={() => setActiveTab('logs')}
                                    >
                                        システムログ
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

                        {activeTab === 'sticky-note' ? (
                        <StickyNote />
                        ) : activeTab === 'system' ? (
                        <SiteSettings
                            settings={settings}
                            onSettingChange={(key: string, newValue: string) => handleSettingChange(key, newValue)}
                            onUpdateAll={updateAllSettings}
                        />
                        ) : activeTab === 'user' ? (
                        <UserSettings
                            userInfo={userInfo}
                            onUserInfoChange={(info: UserInfo) => setUserInfo(info)}
                            onUpdate={updateUserInfo}
                        />
                        ) : activeTab === 'utility' ? (
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                                <h2 className="text-2xl font-semibold mb-4">ユーティリティ</h2>
                                <div className="grid grid-cols-1 gap-6">
                                    <div className="p-4 border rounded-md hover:shadow-md transition-shadow">
                                        <h3 className="text-xl font-medium mb-2">サイトカード再生成</h3>
                                        <p className="mb-4 text-gray-600 dark:text-gray-300">既存のサイトカードを再生成します</p>
                                        
                                        {siteCardMessage && (
                                            <div className={`mb-4 px-4 py-3 rounded ${
                                                siteCardMessage.type === 'success' 
                                                    ? 'bg-green-100 border border-green-400 text-green-700' 
                                                    : 'bg-red-100 border border-red-400 text-red-700'
                                            }`}>
                                                {siteCardMessage.text}
                                            </div>
                                        )}
                                        
                                        <div className="flex flex-col space-y-3">
                                            <div className="flex items-center">
                                                <input 
                                                    type="text" 
                                                    value={siteCardUrl}
                                                    onChange={(e) => setSiteCardUrl(e.target.value)}
                                                    placeholder="https://example.com/"
                                                    className="flex-1 border rounded px-3 py-2 mr-2 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                                                />
                                                <button 
                                                    className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded flex items-center"
                                                    onClick={regenerateSiteCard}
                                                    disabled={siteCardLoading}
                                                >
                                                    {siteCardLoading ? (
                                                        <>
                                                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                            </svg>
                                                            処理中
                                                        </>
                                                    ) : "再生成"}
                                                </button>
                                            </div>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                * 既存のサイトカードのURLを入力して再生成してください
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                        <LogView />
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
