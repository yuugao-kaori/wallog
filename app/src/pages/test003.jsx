import React, { useState } from 'react';
import axios from 'axios';
axios.defaults.baseURL = 'http://192.168.1.148:25000';
axios.defaults.withCredentials = true; // Cookieを送受信できるように設定


function FileUpload() {
  const [file, setFile] = useState(null);        // 選択されたファイル
  const [message, setMessage] = useState('');    // サーバからのメッセージ
  const [filePath, setFilePath] = useState('');  // アップロードされたファイルのパス

  // ファイルが選択されたときのハンドラ
  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  // フォーム送信時のハンドラ
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setMessage('ファイルを選択してください。');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('http://192.168.1.148:25000/api/drive/file_create', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // 成功時の処理
      setMessage('ファイルのアップロードが成功しました！');
      setFilePath(response.data.filePath);
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
    <div>
      <h1>ファイルアップロード</h1>
      <form onSubmit={handleSubmit}>
        <input type="file" onChange={handleFileChange} />
        <button type="submit">アップロード</button>
      </form>

      {message && <p>{message}</p>}
      {filePath && (
        <div>
          <p>アップロードされたファイルのパス:</p>
          <a href={filePath} target="_blank" rel="noopener noreferrer">
            {filePath}
          </a>
        </div>
      )}
    </div>
  );
}

export default FileUpload;
