// SessionCheck.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
axios.defaults.baseURL = 'http://192.168.1.148:25000';
axios.defaults.headers.common['Content-Type'] = 'application/json;charset=utf-8';
axios.defaults.withCredentials = true; // Cookieを送受信できるように設定

const SessionCheck = () => {
  const [sessionData, setSessionData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // コンポーネントがマウントされたときにセッション確認APIを呼び出す
    const checkSession = async () => {
      try {
        const response = await axios.get('http://192.168.1.148:25000/api/user/login_check'); // APIのエンドポイントを変更する場合、ここを修正してください
        setSessionData(response.data);
      } catch (err) {
        setError(err.response ? err.response.data.error : 'Error connecting to server');
      }
    };

    checkSession();
  }, []); // 初回のみ実行

  return (
    <div>
      {sessionData ? (
        <div>
          <h2>Logged in User ID: {sessionData.username}</h2>
        </div>
      ) : (
        <div>
          <h2>{error ? error : 'Checking session...'}</h2>
        </div>
      )}
    </div>
  );
};

export default SessionCheck;
