// src/components/Drive.jsx

import React, { useState, useEffect } from 'react';

const Drive = () => {
  const [files, setFiles] = useState([]);
  const [limit, setLimit] = useState(10); // デフォルトの行数
  const [offset, setOffset] = useState(0); // デフォルトの開始行
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchFiles = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`http://192.168.1.148:25000/api/drive/file_list?limit=${limit}&offset=${offset}`, {
        method: 'GET',
        credentials: 'include', // クッキーを含める
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('認証されていません。ログインしてください。');
        } else {
          throw new Error(`エラー: ${response.status} ${response.statusText}`);
        }
      }

      const data = await response.json();
      setFiles(data.files);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit, offset]); // limit または offset が変更されたときに再フェッチ

  const handleNext = () => {
    setOffset(prevOffset => prevOffset + limit);
  };

  const handlePrevious = () => {
    setOffset(prevOffset => Math.max(prevOffset - limit, 0));
  };

  const handleLimitChange = (e) => {
    const newLimit = parseInt(e.target.value, 10);
    if (!isNaN(newLimit) && newLimit > 0) {
      setLimit(newLimit);
      setOffset(0); // limitが変更されたらoffsetをリセット
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-center">Drive</h1>

      {/* ページネーションコントロール */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={handlePrevious}
            disabled={offset === 0}
            className={`px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400`}
          >
            Previous
          </button>
          <button
            onClick={handleNext}
            disabled={files.length < limit}
            className={`px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400`}
          >
            Next
          </button>
        </div>
        <div className="flex items-center space-x-2">
          <label htmlFor="limit" className="text-gray-700">Items per page:</label>
          <input
            type="number"
            id="limit"
            value={limit}
            onChange={handleLimitChange}
            min="1"
            className="w-16 px-2 py-1 border rounded dark:bg-gray-800 "
          />
        </div>
      </div>

      {/* ローディング状態 */}
      {loading && <p className="text-center text-gray-500">Loading files...</p>}

      {/* エラーメッセージ */}
      {error && <p className="text-center text-red-500 font-semibold">Error: {error}</p>}

      {/* ファイルカードの表示 */}
      <div className="space-y-4">
        {files.map(file => (
          <div key={file.file_id} className="flex items-center justify-between p-4 bg-white shadow rounded dark:bg-gray-800">
            <div className="flex-1">
              <p className="text-lg font-medium text-gray-800 dark:text-gray-100"><strong>File ID:</strong> {file.file_id}</p>
              <p className="text-gray-600"><strong>File Size:</strong> {file.file_size} bytes</p>
              <p className="text-gray-600"><strong>Created At:</strong> {new Date(file.file_createat).toLocaleString()}</p>
            </div>
            <div className="w-24 h-24 ml-4 bg-gray-200 flex items-center justify-center rounded relative">
              {/* 画像を表示 */}
              <img
                src={`http://192.168.1.148:25000/api/drive/file/${file.file_id}`}
                alt={`File ${file.file_id}`}
                className="w-full h-full object-cover rounded absolute top-0 left-0"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
              {/* 画像読み込み失敗時は灰色の正方形が表示されたまま */}
            </div>
          </div>
        ))}
      </div>

      {/* ページネーションコントロール（下部） */}
      <div className="flex items-center justify-between mt-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={handlePrevious}
            disabled={offset === 0}
            className={`px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400`}
          >
            Previous
          </button>
          <button
            onClick={handleNext}
            disabled={files.length < limit}
            className={`px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400`}
          >
            Next
          </button>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-gray-700">
            Showing {offset + 1} to {offset + files.length} of {files.length} files
          </span>
        </div>
      </div>
    </div>
  );
};

export default Drive;
