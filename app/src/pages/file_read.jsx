// src/components/FileView.js

import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

const FileView = () => {
  const { file_id } = useParams();
  const [imageSrc, setImageSrc] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // APIエンドポイント
    const apiUrl = `http://192.168.1.148:25000/api/drive/file/${file_id}`;

    // 画像のURLを設定
    setImageSrc(apiUrl);
    setLoading(false);
  }, [file_id]);

  return (
    <div style={styles.container}>
      {loading && <p>読み込み中...</p>}
      {error && <p style={styles.error}>{error}</p>}
      {!loading && !error && (
        <img
          src={imageSrc}
          alt={`File ${file_id}`}
          style={styles.image}
          onError={() => setError('画像の読み込みに失敗しました。')}
        />
      )}
    </div>
  );
};

const styles = {
  container: {
    textAlign: 'center',
    marginTop: '50px',
  },
  image: {
    maxWidth: '80%',
    height: 'auto',
  },
  error: {
    color: 'red',
  },
};

export default FileView;
