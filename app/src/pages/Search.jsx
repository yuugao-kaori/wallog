import React, { useState } from 'react';
import moment from 'moment';

const SearchPage = () => {
  const [searchText, setSearchText] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async () => {
    if (searchText.trim() === '') {
      alert('検索文字を入力してください。');
      return;
    }

    setLoading(true);
    setError(null);
    setResults([]);

    // 現在の日時をyyyymmddhhMMss形式で取得
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const formattedDate = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}000000`;

    const apiUrl = `http://192.168.1.148:25000/api/post/search/${encodeURIComponent(searchText)}`;

    const params = new URLSearchParams({
      offset: formattedDate,
      limit: '10',
    });

    try {
      const response = await fetch(`${apiUrl}?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`エラー: ${response.status}`);
      }
      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // post_file をパースしてオブジェクトに変換
  const parsePostFile = (postFile) => {
    if (!postFile) return null;
    try {
      return JSON.parse(postFile);
    } catch (e) {
      console.error('post_fileのパースに失敗しました:', e);
      return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-2xl mx-auto mb-6">
        <h1 className="text-2xl font-bold mb-4 text-center">検索ページ</h1>
        <div className="flex">
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="検索キーワードを入力"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-blue-500 text-white font-semibold rounded-r-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            検索
          </button>
        </div>
      </div>

      {loading && (
        <div className="text-center text-gray-500">検索中...</div>
      )}

      {error && (
        <div className="text-center text-red-500">エラー: {error}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {results.map((item) => (
          <div key={item.post_id} className="bg-white p-4 rounded-lg shadow">
            {/* 投稿テキスト */}
            <p className="text-gray-800 whitespace-pre-wrap">{item.post_text}</p>

            {/* タグ */}
            {item.post_tag && (
              <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mt-2">
                {item.post_tag}
              </span>
            )}

            {/* 画像ファイル */}
            {parsePostFile(item.post_file) && (
              <div className="mt-4">
                {/* 例として、画像ファイルのURLが含まれていると仮定 */}
                <img
                  src={parsePostFile(item.post_file).url || '#'}
                  alt="投稿画像"
                  className="w-full h-auto rounded"
                />
              </div>
            )}

            {/* 作成日時 */}
            <div className="text-gray-500 text-sm mt-2">
              作成日時: {moment(item.post_createat).format('YYYY-MM-DD HH:mm:ss')}
            </div>

            {/* 更新日時 */}
            <div className="text-gray-500 text-sm">
              更新日時: {moment(item.post_updateat).format('YYYY-MM-DD HH:mm:ss')}
            </div>
          </div>
        ))}
      </div>

      {(!loading && results.length === 0 && !error) && (
        <div className="text-center text-gray-500 mt-4">結果が見つかりませんでした。</div>
      )}
    </div>
  );
};

export default SearchPage;
