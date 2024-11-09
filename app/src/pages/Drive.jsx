// src/components/Drive.jsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useDropzone } from 'react-dropzone';
import DriveCard from '../component/DriveCard';
import { FaUpload } from 'react-icons/fa';
// Axiosのデフォルト設定
axios.defaults.baseURL = `${process.env.REACT_APP_SITE_DOMAIN}`;
axios.defaults.withCredentials = true;
axios.defaults.headers.common['Content-Type'] = 'application/json;charset=utf-8';

const Drive = () => {
  const [files, setFiles] = useState([]);
  const [limit, setLimit] = useState(10);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFileId, setSelectedFileId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [showUpload, setShowUpload] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const fetchFiles = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${process.env.REACT_APP_SITE_DOMAIN}/api/drive/file_list?limit=${limit}&offset=${offset}`);
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
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  const handleNext = () => {
    setOffset((prevOffset) => prevOffset + limit);
  };

  const handlePrevious = () => {
    setOffset((prevOffset) => Math.max(prevOffset - limit, 0));
  };

  const handleLimitChange = (e) => {
    const newLimit = parseInt(e.target.value, 10);
    if (!isNaN(newLimit) && newLimit > 0) {
      setLimit(newLimit);
      setOffset(0);
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
    setDeleting(true);
    setError(null);

    try {
      const response = await axios.post('/api/drive/file_delete', { file_id: selectedFileId });

      if (response.status === 200) {
        await fetchFiles();
        setIsModalOpen(false);
        setSelectedFileId(null);
      } else {
        throw new Error(response.data.error || '削除に失敗しました。');
      }
    } catch (err) {
      setError(err.message || '削除に失敗しました。');
      setIsModalOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  const handleEditClick = (file_id) => {
    navigate(`/drive/edit/${file_id}`, { state: { refreshFiles: true } });
  };

  const handleCopyUrl = (file_id) => {
    const fileUrl = `${process.env.REACT_APP_SITE_DOMAIN}/file/${file_id}`;

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
      fallbackCopyTextToClipboard(fileUrl);
    }
  };

  const fallbackCopyTextToClipboard = (text) => {
    const textArea = document.createElement('textarea');
    textArea.value = text;

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
      alert('URLのコピーに失敗しました。手動でコピーしてください。');
    }

    document.body.removeChild(textArea);
  };

  const FileUpload = () => {
    const [file, setFile] = useState(null);
    const [message, setMessage] = useState('');
    const [filePath, setFilePath] = useState('');

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
        const response = await axios.post(`${process.env.REACT_APP_SITE_DOMAIN}/api/drive/file_create`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        if (response.status === 200) {
          setMessage('ファイルのアップロードが成功しました！');
          setFilePath(response.data.filePath);
          setFile(null);
          fetchFiles();
        } else {
          setMessage('アップロードに失敗しました。');
        }
      } catch (error) {
        if (error.response && error.response.status === 401) {
          setMessage('ログインしていません。');
        } else {
          setMessage('アップロードに失敗しました。');
        }
      }
    };

    return (
      <div className={`fixed bottom-0 right-0 md:right-0 md:bottom-auto md:relative p-4 md:w-1/5 ${showUpload ? "block" : "hidden"} md:block bg-gray-100 dark:bg-gray-800 shadow-lg rounded-lg`}>
        <h2 className="text-xl font-semibold mb-4 text-center">ファイルアップロード</h2>
        <form onSubmit={handleSubmit} className="flex flex-col items-center">
          <div
            {...getRootProps()}
            className={`w-full border-2 border-dashed p-4 mb-4 rounded cursor-pointer ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white'}`}
          >
            <input {...getInputProps()} />
            {isDragActive ? (
              <p className="text-blue-500">ファイルをドロップしてください...</p>
            ) : (
              <p className="text-gray-700">ここにファイルをドラッグ＆ドロップするか、クリックして選択してください。</p>
            )}
          </div>
          {file && <p className="mb-2 text-gray-700">選択されたファイル: {file.name}</p>}
          <button type="submit" className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600">アップロード</button>
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

  return (
    <div className="flex">
      <div className="flex-1 max-w-4xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6 text-center">Drive</h1>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <button onClick={handlePrevious} disabled={offset === 0} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400">
              Previous
            </button>
            <button onClick={handleNext} disabled={files.length < limit} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400">
              Next
            </button>
          </div>
          <div className="flex items-center space-x-2">
            <label htmlFor="limit" className="text-gray-700">Items per page:</label>
            <input type="number" id="limit" value={limit} onChange={handleLimitChange} min="1" className="w-16 px-2 py-1 border rounded dark:bg-gray-800" />
          </div>
        </div>

        {loading && <p className="text-center text-gray-500">Loading files...</p>}
        {error && <p className="text-center text-red-500 font-semibold">Error: {error}</p>}

        <div className="space-y-4 max-h-[600px] overflow-y-auto">
          {files.map(file => (
            <DriveCard key={file.file_id} file={file} handleDeleteClick={handleDeleteClick} handleEditClick={handleEditClick} handleCopyUrl={handleCopyUrl} />
          ))}
        </div>

        <div className="flex items-center justify-between mt-6">
          <div className="flex items-center space-x-4">
            <button onClick={handlePrevious} disabled={offset === 0} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400">
              Previous
            </button>
            <button onClick={handleNext} disabled={files.length < limit} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400">
              Next
            </button>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-gray-700">Showing {offset + 1} to {offset + files.length} of {files.length} files</span>
          </div>
        </div>

        {isModalOpen && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-80">
              <h2 className="text-xl font-semibold mb-4">確認</h2>
              <p>本当にこのファイルを削除しますか？</p>
              <div className="flex justify-end mt-6 space-x-4">
                <button className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-600" onClick={() => setIsModalOpen(false)} disabled={deleting}>
                  キャンセル
                </button>
                <button className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-700" onClick={confirmDelete} disabled={deleting}>
                  {deleting ? '削除中...' : '削除'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <FileUpload />

      {/* フロートアップロードボタン */}
      <button onClick={() => setShowUpload(!showUpload)} className="md:hidden fixed bottom-4 left-4 bg-blue-500 text-white p-4 rounded-full shadow-lg">
        <FaUpload size={24} />
      </button>
    </div>
  );
};

export default Drive;
