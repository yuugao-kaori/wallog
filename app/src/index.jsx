/*
index.jsx
*/

import './index.css'; 
import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import Diary from './pages/Diary.jsx'; // Diary.jsxをインポート
import Test000 from './pages/test000.jsx'; // 新しいコンポーネントをインポート
import Login from './pages/Login.jsx'; // 新しいコンポーネントをインポート
import Test001 from './pages/test001.jsx'; // 新しいコンポーネントをインポート
import Test002 from './pages/test002.jsx'; // 新しいコンポーネントをインポート
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
            <Route path="/test000" element={<Test000 />} /> {/* 新しいルートを追加 */}
            <Route path="/test001" element={<Test001 />} /> {/* 新しいルートを追加 */}
            <Route path="/test002" element={<Test002 />} /> {/* 新しいルートを追加 */}
            <Route path="/login" element={<Login />} /> {/* 新しいルートを追加 */}
          </Routes>




        </div>
      </div>
    </Router>
  );
};

ReactDOM.render(<App />, document.getElementById('root'));
