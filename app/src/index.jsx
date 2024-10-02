/*
index.jsx
*/

import './index.css'; 
import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import Diary from './pages/Diary.jsx'; // Diary.jsxをインポート

// 各画面のコンポーネントを定義
const Home = () => <h1>HelloWorld</h1>;
const Test1 = () => <h1>Test 1 Page</h1>;
const Test2 = () => <h1>Test 2 Page</h1>;

const App = () => {
  const [showLogin, setShowLogin] = useState(false); // ログインポップアップの表示状態

  const toggleLoginPopup = () => {
    setShowLogin(!showLogin);
  };

  return (
    <Router>
      <div className="relative flex">
        {/* 左側のナビゲーション */}
        <nav className="w-1/4 h-screen bg-gray-200 p-4">
          <ul className="flex flex-col space-y-4">
            <li>
              <Link to="/diary" className="block text-center p-2 bg-blue-500 text-white rounded">テスト1</Link> {/* パスを/diaryに変更 */}
            </li>
            <li>
              <Link to="/test2" className="block text-center p-2 bg-blue-500 text-white rounded">テスト2</Link>
            </li>
          </ul>
        </nav>

        {/* 右側のコンテンツ */}
        <div className="w-3/4 p-4 relative">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/diary" element={<Diary />} /> {/* Diaryコンポーネントを表示 */}
            <Route path="/test2" element={<Test2 />} />
          </Routes>

          {/* 右上にログインボタンを表示 */}
          <button 
            className="absolute top-4 right-4 bg-blue-500 text-white p-2 rounded" 
            onClick={toggleLoginPopup}
          >
            ログイン
          </button>

          {/* ログインポップアップ */}
          {showLogin && (
            <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50">
              <div className="bg-white p-6 rounded shadow-lg w-1/3">
                <h2 className="text-lg font-bold mb-4">ログイン</h2>
                <form>
                  <div className="mb-4">
                    <label className="block text-gray-700">ユーザ名</label>
                    <input type="text" className="w-full p-2 border border-gray-300 rounded" />
                  </div>
                  <div className="mb-4">
                    <label className="block text-gray-700">パスワード</label>
                    <input type="password" className="w-full p-2 border border-gray-300 rounded" />
                  </div>
                  <div className="flex justify-end">
                    <button type="button" className="bg-red-500 text-white p-2 rounded mr-2" onClick={toggleLoginPopup}>
                      キャンセル
                    </button>
                    <button type="submit" className="bg-blue-500 text-white p-2 rounded">
                      ログイン
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </Router>
  );
};

ReactDOM.render(<App />, document.getElementById('root'));
