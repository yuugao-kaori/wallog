import './index.css'; 
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter as Router, Route, Routes, Link, useParams, useLocation } from 'react-router-dom';
import Diary from './pages/Diary.jsx'; 
import Drive from './pages/Drive.jsx'; 
import PostDetail from './pages/PostRead.jsx'; 
import FileRead from './pages/file_read.jsx'; 
import Test000 from './pages/test000.jsx'; 
import Login from './pages/Login.jsx'; 
import Test001 from './pages/test001.jsx'; 
import Test002 from './pages/test002.jsx'; 
import Test003 from './pages/test003.jsx'; 
import { ThemeProvider, useTheme } from './ThemeContext.jsx';
import { Helmet, HelmetProvider } from 'react-helmet-async';

// TitleUpdaterコンポーネントを定義
const TitleUpdater = () => {
  const location = useLocation();

  // パスに基づいてタイトルを返す関数
  const getTitle = (pathname) => {
    if (pathname.startsWith('/diary/')) {
      return 'Diary';
    }
    switch (pathname) {
      case '/':
        return 'Home | My Sustainer';
      case '/diary':
        return 'Diary | My Sustainer';
      case '/drive':
        return 'Drive | My Sustainer';
      case '/test000':
        return 'Test000 | My Sustainer';
      case '/test001':
        return 'Test001 | My Sustainer';
      case '/test002':
        return 'Test002 | My Sustainer';
      case '/test003':
        return 'Test003 | My Sustainer';
      case '/login':
        return 'Login | My Sustainer';
      default:
        return 'My Sustainer';
    }
  };

  const title = getTitle(location.pathname);

  return (
    <Helmet>
      <title>{title}</title>
    </Helmet>
  );
};

const Home = ({ startLoading, stopLoading }) => {
  useEffect(() => {
    startLoading();
    const timer = setTimeout(() => {
      stopLoading();
    }, 1000);
    return () => clearTimeout(timer);
  }, [startLoading, stopLoading]);

  return <h1 className="text-xl font-bold">HelloWorld</h1>;
};

const Test1 = () => {
  const { postId } = useParams();
  return <h1 className="text-xl font-bold">Test 1 Page, Post ID: {postId}</h1>;
};

const Test2 = ({ startLoading, stopLoading }) => {
  useEffect(() => {
    startLoading();
    const timer = setTimeout(() => {
      stopLoading();
    }, 1000);
    return () => clearTimeout(timer);
  }, [startLoading, stopLoading]);

  return <h1 className="text-xl font-bold">Test 2 Page</h1>;
};

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
        {/* TitleUpdaterを挿入 */}
        <TitleUpdater />

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
              <Link to="/test002" className="block text-center p-2 bg-blue-500 text-white dark:bg-blue-700 dark:text-gray-300 rounded">
                ブログ-Blog-
              </Link>
            </li>
            <li>
              <Link to="/test002" className="block text-center p-2 bg-blue-500 text-white dark:bg-blue-700 dark:text-gray-300 rounded">
                検索-Search-
              </Link>
            </li>
            <li>
              <Link to="/drive" className="block text-center p-2 bg-blue-500 text-white dark:bg-blue-700 dark:text-gray-300 rounded">
                ドライブ-Drive-
              </Link>
            </li>
            <li>
              <Link to="/test002" className="block text-center p-2 bg-blue-500 text-white dark:bg-blue-700 dark:text-gray-300 rounded">
                設定-Settings-
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
              element={<Home startLoading={startLoading} stopLoading={stopLoading} />} 
            />
            <Route 
              path="/diary" 
              element={<Diary startLoading={startLoading} stopLoading={stopLoading} />} 
            />
            <Route 
              path="/drive" 
              element={<Drive startLoading={startLoading} stopLoading={stopLoading} />} 
            />
            <Route 
              path="/test000" 
              element={<Test000 startLoading={startLoading} stopLoading={stopLoading} />} 
            />
            <Route 
              path="/test001" 
              element={<Test001 startLoading={startLoading} stopLoading={stopLoading} />} 
            />
            <Route 
              path="/test002" 
              element={<Test002 startLoading={startLoading} stopLoading={stopLoading} />} 
            />
            <Route 
              path="/test003" 
              element={<Test003 startLoading={startLoading} stopLoading={stopLoading} />} 
            />
            <Route 
              path="/login" 
              element={<Login startLoading={startLoading} stopLoading={stopLoading} />} 
            />
            <Route 
              path="/diary/:postId" 
              element={<PostDetail startLoading={startLoading} stopLoading={stopLoading} />} 
            />
            <Route 
              path="/file/:file_id" 
              element={<FileRead startLoading={startLoading} stopLoading={stopLoading} />} 
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

const AppWithProviders = () => (
  <HelmetProvider>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </HelmetProvider>
);

ReactDOM.render(<AppWithProviders />, document.getElementById('root'));  
