/*
index.jsx
*/

import './index.css'; 
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter as Router, Route, Routes, Link, useParams  } from 'react-router-dom';
import Diary from './pages/Diary.jsx'; 
import PostDetail from './pages/PostRead.jsx'; 
import Test000 from './pages/test000.jsx'; 
import Login from './pages/Login.jsx'; 
import Test001 from './pages/test001.jsx'; 
import Test002 from './pages/test002.jsx'; 

const Home = () => <h1 className="text-xl font-bold">HelloWorld</h1>;
const Test1 = () => {
  const { postId } = useParams(); // URLのパラメータを取得
  return <h1 className="text-xl font-bold">Test 1 Page, Post ID: {postId}</h1>;
};
const Test2 = () => <h1 className="text-xl font-bold">Test 2 Page</h1>;

const App = () => {
  const [theme, setTheme] = useState('light');
  const [showLogin, setShowLogin] = useState(false);

  // ダークモードの初期設定を行う
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.add(savedTheme);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
      document.documentElement.classList.add('dark');
    }
  }, []);

  // テーマの切り替えを行う
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.classList.remove(theme);
    document.documentElement.classList.add(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const toggleLoginPopup = () => {
    setShowLogin(!showLogin);
  };

  return (
    <Router>
      <div className={`relative flex ${theme === 'dark' ? 'dark' : ''}`}>
        {/* テーマ切り替えボタン */}
        <button 
          onClick={toggleTheme} 
          className="fixed z-50 top-4 right-4 bg-gray-800 text-white dark:bg-gray-200 dark:text-black p-2 rounded shadow-lg"
        >
          {theme === 'light' ? 'ダークモード' : 'ライトモード'}
        </button>

        {/* 左側のナビゲーション */}
        <nav className="w-1/4 h-screen bg-gray-200 dark:bg-gray-800 p-4">
          <ul className="flex flex-col space-y-4">
            <li>
              <Link to="/diary" className="block text-center p-2 bg-blue-500 text-white dark:bg-blue-700 dark:text-gray-300 rounded">Diary</Link>
            </li>
            <li>
              <Link to="/test2" className="block text-center p-2 bg-blue-500 text-white dark:bg-blue-700 dark:text-gray-300 rounded">実装中</Link>
            </li>
          </ul>
        </nav>

        {/* 右側のコンテンツ */}
        <div className="w-3/4 p-4 relative bg-white dark:bg-gray-900 text-black dark:text-white">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/diary" element={<Diary />} />
            <Route path="/test2" element={<Test2 />} />
            <Route path="/test000" element={<Test000 />} />
            <Route path="/test001" element={<Test001 />} />
            <Route path="/test002" element={<Test002 />} />
            <Route path="/login" element={<Login />} />
            <Route path="/diary/:postId" element={<PostDetail />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
};

ReactDOM.render(<App />, document.getElementById('root'));