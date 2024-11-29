
'use client';

interface UserInfo {
    user_hashtag: string;
}

interface UserSettingsProps {
    userInfo: UserInfo | null;
    onUserInfoChange: (userInfo: UserInfo) => void;
    onUpdate: () => void;
}

export default function UserSettings({ userInfo, onUserInfoChange, onUpdate }: UserSettingsProps) {
    return (
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
                            onChange={(e) => onUserInfoChange({ ...userInfo!, user_hashtag: e.target.value })}
                        />
                    </div>
                </div>
            </div>
            <div className="mt-6">
                <button
                    className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onClick={onUpdate}
                >
                    ユーザー情報を更新
                </button>
            </div>
        </>
    );
}