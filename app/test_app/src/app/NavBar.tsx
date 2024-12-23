'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React, { useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import dynamic from 'next/dynamic'
import { FaGithub, FaXTwitter, FaTwitter, FaBluesky, FaLink } from 'react-icons/fa6'
import { PiFediverseLogoFill } from 'react-icons/pi'
import { useTheme } from './ThemeProvider'

// APIインスタンスをメモ化
const useApi = () => {
  return useMemo(() => axios.create({
    baseURL: 'https://wallog.seitendan.com',
    headers: { 
      'Content-Type': 'application/json;charset=utf-8',
      'Access-Control-Allow-Credentials': 'true'
    },
    withCredentials: true
  }), []);
};

// メニューリンクコンポーネントを更新
const MenuLink = React.memo(({ href, children }: { href: string, children: React.ReactNode }) => {
  const pathname = usePathname();
  const isActive = pathname === href;
  
  return (
    <Link 
      href={href} 
      className={`p-2 rounded transition-colors ${
        isActive 
          ? 'bg-gray-200 dark:bg-gray-700 font-bold'
          : 'hover:bg-gray-200 dark:hover:bg-gray-700'
      }`}
    >
      {children}
    </Link>
  );
});

// ハンバーガーメニューボタン
// 既存のz-indexが問題ない場合は変更不要
// もし他に高いz-indexがある場合は調整してください
// 例:
// メニュートグルボタンのz-indexを保持または必要に応じて調整
const MenuToggleButton = React.memo(({ isOpen, onClick }: { isOpen: boolean, onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`fixed bottom-4 left-4 p-3 rounded-full bg-gray-100 dark:bg-gray-800 md:hidden shadow-lg z-40 transition-opacity
      ${isOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-6 w-6"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 6h16M4 12h16m-7 6h7"
      />
    </svg>
  </button>
));

// クライアントサイドのみにで実行されるコンポーネントとして定義
const NavBarClient = () => {
  const pathname = usePathname();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [isDark, setIsDark] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const api = useApi();
  const [copyMessage, setCopyMessage] = useState<string>('タイトルとURLをコピー');
  const [isBubbleVisible, setIsBubbleVisible] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDark(theme === 'dark' || (theme === 'system' && mediaQuery.matches));

    const handleChange = () => {
      if (theme === 'system') {
        setIsDark(mediaQuery.matches);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  useEffect(() => {
    // マウント後にのみ状態を更新
    setIsMounted(true);
    const checkSession = async () => {
      try {
        const response = await api.get('/api/user/login_check');
        setIsLoggedIn(response.status === 200);
      } catch (err) {
        setIsLoggedIn(false);
      }
    };
    checkSession();
  }, [api]);

  useEffect(() => {
    // パスに基づいてタイトルを更新
    const pageName = pathname.substring(1);
    const formattedPageName = pageName ? pageName.charAt(0).toUpperCase() + pageName.slice(1) : 'Home';
    document.title = `${formattedPageName} | ${process.env.NEXT_PUBLIC_SITE_TITLE}`;
  }, [pathname]);

  // スクロール制御のためのuseEffect追加
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleOutsideClick = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    if (!target.closest('.bubble') && !target.closest('.toggle-button')) {
      setIsBubbleVisible(false);
    }
  };

  useEffect(() => {
    if (isBubbleVisible) {
      document.addEventListener('click', handleOutsideClick);
    } else {
      document.removeEventListener('click', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('click', handleOutsideClick);
    };
  }, [isBubbleVisible]);

  const copyCurrentPageUrl = () => {
    const pageTitle = document.title;
    const url = window.location.href;
    const textToCopy = `${pageTitle}\n${url}`;
    
    navigator.clipboard.writeText(textToCopy)
      .then(() => {
        setCopyMessage('コピーしました');
        setTimeout(() => {
          setCopyMessage('タイトルとURLをコピー');
        }, 2000);
      })
      .catch((err) => {
        console.error('コピーに失敗しました:', err);
      });
  };

  // サーバーサイドレンダリング時やマウント前は何も表示しない
  if (!isMounted) {
    return (
      <nav className="w-48 h-screen bg-gray-100 dark:bg-gray-800 fixed left-0 top-0 p-4 
        transform -translate-x-full md:translate-x-0 transition-transform duration-300 ease-in-out z-30">
      </nav>
    );
  }

  const toggleMenu = () => setIsOpen(prev => !prev);
  const closeMenu = () => setIsOpen(false);

  return (
    <>
      {/* オーバーレイを追加 */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
          onClick={closeMenu}
        />
      )}
      <nav className={`
        w-48 h-screen bg-gray-100 dark:bg-gray-800 fixed left-0 top-0 p-4
        transform transition-transform duration-300 ease-in-out z-30
        md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        flex flex-col justify-between
      `}>
        <div className="space-y-1">
          <Link href="/" className="block hover:opacity-80 transition-opacity">
            <h2 className="text-xl font-bold dark:text-white">{process.env.NEXT_PUBLIC_SITE_TITLE}</h2>
            <p className="text-sm dark:text-white">{process.env.NEXT_PUBLIC_SITE_EXPLANATION}</p>
          </Link>
        </div>
        <div className="flex flex-col space-y-4">
          <MenuLink href="/diary">Diary</MenuLink>
          <MenuLink href="/blog">Blog</MenuLink>
          <MenuLink href="/search">Search</MenuLink>
          {isLoggedIn && <MenuLink href="/drive">Drive</MenuLink>}
          {isLoggedIn && <MenuLink href="/private">Private</MenuLink>}
        </div>

        <div className="flex flex-col space-y-4">
          <div className="flex items-center space-x-4 justify-center">
            <button
              onClick={toggleTheme}
              className="w-10 h-10 flex items-center justify-center rounded bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              {isDark ? '☀️' : '🌙'}
            </button>
            <div
              className="w-10 h-10 flex items-center justify-center rounded bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors cursor-pointer"
              onClick={copyCurrentPageUrl}
            >
              <FaLink />
            </div>
            <button
              className="w-10 h-10 flex items-center justify-center rounded bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors cursor-pointer toggle-button"
              onClick={() => setIsBubbleVisible(prev => !prev)}
            >
              {isBubbleVisible ? '＜' : '＞'}
            </button>
          </div>
          {isBubbleVisible && (
            <div className="bubble flex justify-end space-x-1 p-2 bg-white dark:bg-blue-900 rounded-lg shadow-lg absolute right-0">
              <Link 
                href="https://github.com/yuugao-kaori/wallog" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <FaGithub className="text-2xl" />
              </Link>
              <Link 
                href="https://twitter.com/takumin3211" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <FaXTwitter className="text-2xl" />
              </Link>
              <Link 
                href="https://twitter.com/takumin3211" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <FaTwitter className="text-2xl" />
              </Link>
              <Link 
                href="https://misskey.seitendan.com/@takumin3211" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <PiFediverseLogoFill  className="text-2xl" />
              </Link>
              <Link 
                href="https://bsky.app/profile/takumin3211.bsky.social" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <FaBluesky  className="text-2xl" />
              </Link>
            </div>
          )}
          <div className="text-center text-sm text-gray-500 dark:text-gray-400 mb-4">
            Dev 2024.12.22.0007
                  
          </div>
        </div>
      </nav>
      
      <MenuToggleButton isOpen={isOpen} onClick={toggleMenu} />
    </>
  );
};

// Dynamic importを使用してクライアントサイドのみでレンダリング
const NavBar = dynamic(() => Promise.resolve(NavBarClient), {
  ssr: false,
});

export default NavBar;