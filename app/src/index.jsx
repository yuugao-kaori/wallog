// index.jsx または main.jsx として保存
import './index.css';
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client'; // React 18 以降では createRoot を使用
import { BrowserRouter as Router, Route, Routes, Link, useParams, useLocation } from 'react-router-dom';
import { FaSquareXTwitter } from 'react-icons/fa6'; // アイコンをインポート
import { FaTwitter  } from 'react-icons/fa'; // アイコンをインポート
import { PiFediverseLogoFill  } from 'react-icons/pi'; // アイコンをインポート
import { FaGithub  } from 'react-icons/fa6'; // アイコンをインポート
import Diary from './pages/Diary.jsx';
import Drive from './pages/Drive.jsx';
import Blog from './pages/Blog.jsx';
import PostDetail from './pages/PostRead.jsx';
import Search from './pages/Search.jsx';
import FileRead from './pages/file_read.jsx';
import Test000 from './pages/test000.jsx';
import Login from './pages/Login.jsx';
import Test001 from './pages/test001.jsx';
import Test002 from './pages/test002.jsx';
import Test003 from './pages/test003.jsx';
import { ThemeProvider, useTheme } from './ThemeContext.jsx';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import axios from 'axios';

console.log('SITE DOMAIN:', process.env.REACT_APP_SITE_DOMAIN);

// TitleUpdaterコンポーネントを定義
const TitleUpdater = () => {
  const location = useLocation();
  const siteTitle = 'My Sustainer'; // 環境変数からタイトルを取得
  const getTitle = (pathname) => {
    if (pathname.startsWith('/diary/')) {
      return 'Diary | My Sustainer';
    }
    switch (pathname) {
      case '/':
        return `Home | ${siteTitle}`;
      case '/diary':
        return `Diary | ${siteTitle}`;
      case '/drive':
        return `Drive | ${siteTitle}`;
        case '/blog':
          return `Blog | ${siteTitle}`;
      case '/test000':
        return `Test000 | ${siteTitle}`;
      case '/test001':
        return `Test001 | ${siteTitle}`;
      case '/test002':
        return `Test002 | ${siteTitle}`;
      case '/test003':
        return `Test003 | ${siteTitle}`;
      case '/login':
        return `Login | ${siteTitle}`;
      case '/search':
        return `Search | ${siteTitle}`;
      default:
        return siteTitle;
    }
  };

  const title = getTitle(location.pathname);

  return (
    <Helmet>
      <title>{title}</title>
      <link rel="icon" href="https://wallog.seitendan.com/api/drive/file/file-1729302780901-814424877" />
    </Helmet>
  );
};

const Home = ({ startLoading, stopLoading }) => {
  return <h1 className="text-xl font-bold">HelloWorld</h1>;
};

const App = () => {
  const [showLogin, setShowLogin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false); // 追加
  const { theme, toggleTheme } = useTheme();

  const [isNavOpen, setIsNavOpen] = useState(false);

  const toggleLoginPopup = () => {
    setShowLogin(!showLogin);
  };

  const startLoading = () => {
    setLoading(true);
  };

  const stopLoading = () => {
    setTimeout(() => {
      setLoading(false);
    }, 500); // ローディングを短めに設定してUXを向上
  };

  useEffect(() => {
    const checkSession = async () => {
      startLoading();
      try {
        const response = await axios.get(`${process.env.REACT_APP_SITE_DOMAIN}/api/user/login_check`);
        if (response.status === 200) {
          setIsLoggedIn(true);
        }
      } catch (err) {
        setIsLoggedIn(false);
      } finally {
        stopLoading();
      }
    };

    checkSession();
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsNavOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <Router>
      <div className={`relative flex h-screen ${theme}`}>
        <TitleUpdater />

        {/* ハンバーガーメニュー: 小さい画面でのみ表示 */}
        <button
          onClick={() => setIsNavOpen(true)}
          className="md:hidden z-50 fixed top-4 left-4 bg-gray-800 text-white dark:bg-gray-200 dark:text-black p-2 rounded shadow-lg"
        >
          &#9776;
        </button>

        {/* テーマ切り替えボタン */}
        <button
          onClick={toggleTheme}
          className="fixed z-50 top-4 right-4 bg-gray-800 text-white dark:bg-gray-200 dark:text-black p-2 rounded shadow-lg"
        >
          {theme === 'dark' ? 'ダークモード' : 'ライトモード'}
        </button>

        {/* ナビゲーション: 大きい画面では常に表示, 小さい画面ではオーバーレイ */}
        <nav
          className={`fixed top-0 left-0 h-full bg-gray-200 dark:bg-gray-800 p-4 transform transition-transform duration-300 ease-in-out
            ${isNavOpen ? 'translate-x-0' : '-translate-x-full'} 
            md:relative md:translate-x-0 md:w-1/5
          `}
          style={{ zIndex: 50 }}
        >
          <div className="flex justify-between items-center md:hidden">
            <button
              onClick={() => setIsNavOpen(false)}
              className="text-2xl font-bold"
            >
              &times;
            </button>
          </div>

          <div className="flex flex-col items-center mb-8">
            <h1 className="text-2xl font-bold text-center mb-2 dark:text-gray-100">My Sustainer</h1>
            <p className="text-center text-sm dark:text-gray-300">繋がらないマイクロブログ</p>
          </div>
          <ul className="flex flex-col space-y-4 mt-4 md:mt-0">
            <li>
              <Link
                to="/diary"
                className="mt-8 block text-center font-bold p-2 bg-blue-500 text-white dark:bg-blue-700 dark:text-gray-300 rounded"
                onClick={() => setIsNavOpen(false)}
              >
                日記-Diary-
              </Link>
            </li>
            <li>
              <Link
                to="/blog"
                className="block text-center p-2 bg-blue-500 text-white dark:bg-blue-700 dark:text-gray-300 rounded"
                onClick={() => setIsNavOpen(false)}
              >
                ブログ-Blog-
              </Link>
            </li>
            <li>
              <Link
                to="/search"
                className="block text-center p-2 bg-blue-500 text-white dark:bg-blue-700 dark:text-gray-300 rounded"
                onClick={() => setIsNavOpen(false)}
              >
                検索-Search-
              </Link>
            </li>
            {isLoggedIn && (
              <>
                <li>
                  <Link
                    to="/drive"
                    className="block text-center p-2 bg-blue-500 text-white dark:bg-blue-700 dark:text-gray-300 rounded"
                    onClick={() => setIsNavOpen(false)}
                  >
                    ドライブ-Drive-
                  </Link>
                </li>
                <li>
                  <Link
                    to="/test002"
                    className="block text-center p-2 bg-blue-500 text-white dark:bg-blue-700 dark:text-gray-300 rounded"
                    onClick={() => setIsNavOpen(false)}
                  >
                    設定-Settings-
                  </Link>
                </li>
              </>
            )}
          </ul>
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4 mt-4 md:mt-0">
            {/* Twitterアカウントのリンク */}
            <a
              href="https://x.com/takumin3211"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-700 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-400"
            >
              <FaTwitter  size={30} />
            </a>
            {/* Xアカウントのリンク */}
            <a
              href="https://x.com/none_none_days"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-700 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-400"
            >
              <FaSquareXTwitter size={30} />
            </a>

            {/* Fediverseアカウントのリンク */}
            <a
              href="https://misskey.seitendan.com/@takumin3211"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-700 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-400"
            >
              <PiFediverseLogoFill size={30} />
            </a>
              {/* Githubアカウントのリンク */}
              <a
              href="https://github.com/yuugao-kaori/wallog"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-700 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-400"
            >
              <FaGithub size={30} />
            </a>
          </div>
        </nav>

        {isNavOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
            onClick={() => setIsNavOpen(false)}
          ></div>
        )}

        <div className={`flex-1 h-full px-4 relative bg-white dark:bg-gray-900 text-black dark:text-white overflow-hidden md:w-4/5`}>
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
              path="/search"
              element={<Search startLoading={startLoading} stopLoading={stopLoading} />}
            />
            <Route
              path="/search/:searchText"
              element={<Search startLoading={startLoading} stopLoading={stopLoading} />}
            />
            <Route
              path="/diary/:postId"
              element={<PostDetail startLoading={startLoading} stopLoading={stopLoading} />}
            />
            <Route
              path="/file/:file_id"
              element={<FileRead startLoading={startLoading} stopLoading={stopLoading} />}
            />
                        <Route
              path="/blog"
              element={<Blog startLoading={startLoading} stopLoading={stopLoading} />}
            />
          </Routes>
        </div>
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

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<AppWithProviders />);
