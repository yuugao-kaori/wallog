// src/components/Drive.jsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useDropzone } from 'react-dropzone';

// Axiosのデフォルト設定
axios.defaults.baseURL = 'http://192.168.1.148:25000';
axios.defaults.withCredentials = true; // Cookieを送受信できるように設定
axios.defaults.headers.common['Content-Type'] = 'application/json;charset=utf-8';


const Drive = () => {
  const [files, setFiles] = useState([]);
  const [limit, setLimit] = useState(10); // デフォルトの行数
  const [offset, setOffset] = useState(0); // デフォルトの開始行
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFileId, setSelectedFileId] = useState(null);
  const [deleting, setDeleting] = useState(false); // 削除処理中の状態

  const navigate = useNavigate();
  const location = useLocation();

  const fetchFiles = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`/api/drive/file_list?limit=${limit}&offset=${offset}`);
      setFiles(response.data.files);
    } catch (err) {
      if (err.response && err.response.status === 401) {
        setError('認証されていません。ログインしてください。');
      } else {
        setError(`エラー: ${err.response?.status} ${err.response?.statusText}`);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [limit, offset]);

  useEffect(() => {
    if (location.state && location.state.refreshFiles) {
      fetchFiles();
      // Clear the refreshFiles state after fetching
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

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

  const handleDeleteClick = (file_id) => {
    setSelectedFileId(file_id);
    setIsModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedFileId) {
      setError('削除するファイルが選択されていません。');
      setIsModalOpen(false);
      return;
    }

    setDeleting(true); // 削除処理開始
    setError(null);

    try {
      const response = await axios.post('/api/drive/file_delete', { file_id: selectedFileId });

      if (response.status === 200) {
        // 削除成功時にファイルリストを再取得
        await fetchFiles();
        setIsModalOpen(false);
        setSelectedFileId(null);
      } else {
        throw new Error(response.data.error || '削除に失敗しました。');
      }
    } catch (err) {
      console.error('エラーが発生しました:', err);
      setError(err.message || '削除に失敗しました。');
      setIsModalOpen(false);
    } finally {
      setDeleting(false); // 削除処理終了
    }
  };

  const handleEditClick = (file_id) => {
    // 編集ページへの遷移（編集ページのルートは仮定）
    navigate(`/drive/edit/${file_id}`, { state: { refreshFiles: true } });
  };

  const handleCopyUrl = (file_id) => {
    const fileUrl = `http://192.168.1.148:23000/file/${file_id}`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(fileUrl)
        .then(() => {
          alert('URLがコピーされました');
        })
        .catch(err => {
          console.error('コピーに失敗しました:', err);
          fallbackCopyTextToClipboard(fileUrl);
        });
    } else {
      // navigator.clipboardが利用できない場合のフォールバック
      fallbackCopyTextToClipboard(fileUrl);
    }
  };

  // フォールバック関数
  const fallbackCopyTextToClipboard = (text) => {
    const textArea = document.createElement('textarea');
    textArea.value = text;

    // テキストエリアを画面外に配置
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      const successful = document.execCommand('copy');
      if (successful) {
        alert('URLがコピーされました');
      } else {
        throw new Error('コピーに失敗しました');
      }
    } catch (err) {
      console.error('コピーに失敗しました:', err);
      alert('URLのコピーに失敗しました。手動でコピーしてください。');
    }

    document.body.removeChild(textArea);
  };

  // ファイルアップロードのためのコンポーネント
  const FileUpload = () => {
    const [file, setFile] = useState(null);        // 選択されたファイル
    const [message, setMessage] = useState('');    // サーバからのメッセージ
    const [filePath, setFilePath] = useState('');  // アップロードされたファイルのパス

    const onDrop = useCallback((acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        setFile(acceptedFiles[0]);
        setMessage('');
      }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, multiple: false });

    const handleSubmit = async (e) => {
      e.preventDefault();
      if (!file) {
        setMessage('ファイルを選択してください。');
        return;
      }

      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await axios.post('/api/drive/file_create', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        if (response.status === 200) {
          // 成功時の処理
          setMessage('ファイルのアップロードが成功しました！');
          setFilePath(response.data.filePath);
          setFile(null); // 選択をリセット
          fetchFiles(); // ファイルリストを再取得
        } else {
          setMessage('アップロードに失敗しました。');
        }
      } catch (error) {
        // エラーハンドリング
        if (error.response && error.response.status === 401) {
          setMessage('ログインしていません。');
        } else {
          setMessage('アップロードに失敗しました。');
        }
      }
    };

    return (
      <div className="w-1/5 fixed right-0 px-4 pt-12 min-h-full bg-gray-100 dark:bg-gray-800 shadow-lg">
        <h2 className="text-xl font-semibold mb-4 text-center">ファイルアップロード</h2>
        <form onSubmit={handleSubmit} className="flex flex-col items-center">
          <div
            {...getRootProps()}
            className={`w-full border-2 border-dashed p-4 mb-4 rounded cursor-pointer ${
              isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white'
            }`}
          >
            <input {...getInputProps()} />
            {
              isDragActive ?
                <p className="text-blue-500">ファイルをドロップしてください...</p> :
                <p className="text-gray-700">ここにファイルをドラッグ＆ドロップするか、クリックして選択してください。</p>
            }
          </div>
          {file && <p className="mb-2 text-gray-700">選択されたファイル: {file.name}</p>}
          <button
            type="submit"
            className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
          >
            アップロード
          </button>
        </form>

        {message && <p className="mt-4 text-center text-green-500">{message}</p>}
        {filePath && (
          <div className="mt-4 text-center">
            <p>アップロードされたファイルのパス:</p>
            <a href={filePath} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">
              {filePath}
            </a>
          </div>
        )}
      </div>
    );
  };

  // ファイルカードのコンポーネント
  const Card = ({ file }) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef(null);

    const toggleMenu = (event) => {
      if (event && event.stopPropagation) {
        event.stopPropagation();
      }
      setMenuOpen(!menuOpen);
    };

    useEffect(() => {
      const handleClickOutside = (event) => {
        if (menuRef.current && !menuRef.current.contains(event.target)) {
          setMenuOpen(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, []);

    return (
      <div className="flex items-center justify-between p-4 bg-white shadow rounded dark:bg-gray-800 relative">
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

        {/* ハンバーガーメニュー */}
        <div className="absolute top-2 right-2">
          <button onClick={toggleMenu} className="p-2 text-gray-700 dark:text-gray-300" aria-haspopup="true" aria-expanded={menuOpen}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 6h16M4 12h16m-7 6h7" />
            </svg>
          </button>
          {menuOpen && (
            <div ref={menuRef} className="absolute top-14 right-4 bg-white shadow-lg rounded-lg p-2 z-10 dark:bg-gray-900">
              <ul>
                <li
                  className="text-sm py-2 px-4 whitespace-nowrap hover:bg-gray-100 hover:rounded-lg cursor-pointer dark:text-gray-100 dark:hover:bg-gray-800"
                  onClick={(event) => { toggleMenu(event); handleDeleteClick(file.file_id); }}
                >
                  削除
                </li>
                <li
                  className="text-sm py-2 px-4 whitespace-nowrap hover:bg-gray-100 hover:rounded-lg cursor-pointer dark:text-gray-100 dark:hover:bg-gray-800"
                  onClick={(event) => { toggleMenu(event); handleEditClick(file.file_id); }}
                >
                  修正
                </li>
                <li
                  className="text-sm py-2 px-4 whitespace-nowrap hover:bg-gray-100 hover:rounded-lg cursor-pointer dark:text-gray-100 dark:hover:bg-gray-800"
                  onClick={(event) => { toggleMenu(event); handleCopyUrl(file.file_id); }}
                >
                  URLコピー
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex">
      {/* メインコンテンツエリア */}
      <div className="flex-1 max-w-4xl mx-auto p-6">
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
        <div className="space-y-4 max-h-128 overflow-y-auto">
          {files.map(file => (
            <Card key={file.file_id} file={file} />
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

        {/* 削除確認モーダル */}
        {isModalOpen && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-80">
              <h2 className="text-xl font-semibold mb-4">確認</h2>
              <p>本当にこのファイルを削除しますか？</p>
              <div className="flex justify-end mt-6 space-x-4">
                <button
                  className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-600"
                  onClick={() => setIsModalOpen(false)}
                  disabled={deleting} // 削除中は無効化
                >
                  キャンセル
                </button>
                <button
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-700"
                  onClick={confirmDelete}
                  disabled={deleting} // 削除中は無効化
                >
                  {deleting ? '削除中...' : '削除'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ファイルアップロードサイドバー */}
      <FileUpload />
    </div>
  );
};

export default Drive;
