import './index.css'; 
import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter as Router, Route, Routes, Link, useParams } from 'react-router-dom';
import Diary from './pages/Diary.jsx'; 
import PostDetail from './pages/PostRead.jsx'; 
import Test000 from './pages/test000.jsx'; 
import Login from './pages/Login.jsx'; 
import Test001 from './pages/test001.jsx'; 
import Test002 from './pages/test002.jsx'; 
import { ThemeProvider, useTheme } from './ThemeContext.jsx';

const Home = () => <h1 className="text-xl font-bold">HelloWorld</h1>;
const Test1 = () => {
  const { postId } = useParams();
  return <h1 className="text-xl font-bold">Test 1 Page, Post ID: {postId}</h1>;
};
const Test2 = () => <h1 className="text-xl font-bold">Test 2 Page</h1>;

const App = () => {
  const [showLogin, setShowLogin] = useState(false);
  const [loading, setLoading] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const toggleLoginPopup = () => {
    setShowLogin(!showLogin);
  };

  const startLoading = () => {
    setLoading(true);
  };

  const stopLoading = () => {
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  };

  return (
    <Router>
      <div className={`relative flex h-screen ${theme}`}>
        <button 
          onClick={toggleTheme} 
          className="fixed z-50 top-4 right-4 bg-gray-800 text-white dark:bg-gray-200 dark:text-black p-2 rounded shadow-lg"
        >
          {theme === 'dark' ? 'ダークモード' : 'ライトモード'}
        </button>

        {/* 左側のナビゲーション */}
        <nav className="w-1/5 h-full bg-gray-200 dark:bg-gray-800 p-4 overflow-hidden">
          <h1 className="text-2xl font-bold mb-2 dark:text-gray-100 ">My Sustainer</h1>
          <h2 className="text-1xl font-bold mb-2 dark:text-gray-100">誰とも繋がらないプライベートマイクロブログ</h2>

          <ul className="flex flex-col space-y-4">
            <li>
              <Link to="/diary" className="mt-8 block text-center font-bold p-2 bg-blue-500 text-white dark:bg-blue-700 dark:text-gray-300 rounded">
                日記-Diary-
              </Link>
            </li>
            <li>
              <Link to="/test2" className="block text-center p-2 bg-blue-500 text-white dark:bg-blue-700 dark:text-gray-300 rounded">
                実装中
              </Link>
            </li>
          </ul>
        </nav>

        <div className="w-3/5 h-full p-4 relative bg-white dark:bg-gray-900 text-black dark:text-white overflow-hidden">
          {loading && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="text-white">読み込み中...</div>
            </div>
          )}
          <Routes>
            <Route 
              path="/" 
              element={<Home />} 
              onEnter={startLoading} 
              onLeave={stopLoading} 
            />
            <Route 
              path="/diary" 
              element={<Diary />} 
              onEnter={startLoading} 
              onLeave={stopLoading} 
            />
            <Route 
              path="/test2" 
              element={<Test2 />} 
              onEnter={startLoading} 
              onLeave={stopLoading} 
            />
            <Route 
              path="/test000" 
              element={<Test000 />} 
              onEnter={startLoading} 
              onLeave={stopLoading} 
            />
            <Route 
              path="/test001" 
              element={<Test001 />} 
              onEnter={startLoading} 
              onLeave={stopLoading} 
            />
            <Route 
              path="/test002" 
              element={<Test002 />} 
              onEnter={startLoading} 
              onLeave={stopLoading} 
            />
            <Route 
              path="/login" 
              element={<Login />} 
              onEnter={startLoading} 
              onLeave={stopLoading} 
            />
            <Route 
              path="/diary/:postId" 
              element={<PostDetail />} 
              onEnter={startLoading} 
              onLeave={stopLoading} 
            />
          </Routes>
        </div>
        {/* 右側のナビゲーション */}
        <nav className="w-1/5 h-full bg-gray-200 dark:bg-gray-800 p-4 overflow-hidden">
          <ul className="">
          </ul>
        </nav>
      </div>
    </Router>
  );
};

const AppWithTheme = () => (
  <ThemeProvider>
    <App />
  </ThemeProvider>
);

ReactDOM.render(<AppWithTheme />, document.getElementById('root'));
