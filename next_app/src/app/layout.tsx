"use client";
import './globals.css'
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { FaTwitter } from 'react-icons/fa';
import { PiFediverseLogoFill } from 'react-icons/pi';
import { FaGithub } from 'react-icons/fa6';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch('/api/user/login_check');
        if (response.status === 200) {
          setIsLoggedIn(true);
        }
      } catch (err) {
        setIsLoggedIn(false);
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

  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setIsDarkMode(savedDarkMode);
    document.documentElement.classList.toggle('dark', savedDarkMode);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    localStorage.setItem('darkMode', isDarkMode.toString());
  }, [isDarkMode]);

  return (
    <html>
      <head>
        <link rel="stylesheet" href="/path/to/your/styles.css" />
        <link rel="stylesheet" href="/global.css" />
      </head>
      <body>
        <div className="relative flex h-screen">
          {/* ダークモード切り替えボタン */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="fixed top-4 right-4 bg-gray-800 text-white dark:bg-gray-200 dark:text-black p-2 rounded shadow-lg"
          >
            {isDarkMode ? 'ライトモード' : 'ダークモード'}
          </button>

          {/* ハンバーガーメニュー: 小さい画面でのみ表示 */}
          <button
            onClick={() => setIsNavOpen(true)}
            className="md:hidden z-50 fixed top-4 left-4 bg-gray-800 text-white dark:bg-gray-200 dark:text-black p-2 rounded shadow-lg"
          >
            &#9776;
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
                  href="/diary"
                  className="mt-8 block text-center font-bold p-2 bg-blue-500 text-white dark:bg-blue-700 dark:text-gray-300 rounded"
                  onClick={() => setIsNavOpen(false)}
                >
                  日記-Diary-
                </Link>
              </li>
              <li>
                <Link
                  href="/blog"
                  className="block text-center p-2 bg-blue-500 text-white dark:bg-blue-700 dark:text-gray-300 rounded"
                  onClick={() => setIsNavOpen(false)}
                >
                  ブログ-Blog-
                </Link>
              </li>
              <li>
                <Link
                  href="/search"
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
                      href="/drive"
                      className="block text-center p-2 bg-blue-500 text-white dark:bg-blue-700 dark:text-gray-300 rounded"
                      onClick={() => setIsNavOpen(false)}
                    >
                      ドライブ-Drive-
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/test002"
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
              <a
                href="https://x.com/takumin3211"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-700 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-400"
              >
                <FaTwitter size={30} />
              </a>
              <a
                href="https://misskey.seitendan.com/@takumin3211"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-700 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-400"
              >
                <PiFediverseLogoFill size={30} />
              </a>
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

          <div className="flex-1 h-full px-4 relative bg-white dark:bg-gray-900 text-black dark:text-white overflow-hidden md:w-4/5">
            {children}
          </div>
          <div className="fixed bottom-4 right-4 text-gray-500 dark:text-gray-400">
            v0002
          </div>
        </div>
      </body>
    </html>
  );
};

export default Layout;