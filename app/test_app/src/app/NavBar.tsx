'use client'

import Link from 'next/link'
import React,{ useState, useEffect, useMemo } from 'react'
import axios from 'axios'

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

// メニューリンクコンポーネント
const MenuLink = React.memo(({ href, children }: { href: string, children: React.ReactNode }) => (
  <Link 
    href={href} 
    className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
  >
    {children}
  </Link>
));

// ハンバーガーメニューボタン
const MenuToggleButton = React.memo(({ isOpen, onClick }: { isOpen: boolean, onClick: () => void }) => (
  <button
    onClick={onClick}
    className="fixed bottom-4 left-4 p-3 rounded-full bg-gray-100 dark:bg-gray-800 md:hidden shadow-lg z-40"
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

export default function NavBar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const api = useApi();

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await api.get('/api/user/login_check');
        if (response.status === 200) {
          setIsLoggedIn(true);
        }
      } catch (err) {
        setIsLoggedIn(false);
      }
    };

    checkSession();
  }, [api]);

  const toggleMenu = () => setIsOpen(prev => !prev);

  return (
    <>
      <nav className={`
        w-64 h-screen bg-gray-100 dark:bg-gray-800 fixed left-0 top-0 p-4
        transform transition-transform duration-300 ease-in-out z-30
        md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col space-y-4">
          <MenuLink href="/diary">Diary</MenuLink>
          <MenuLink href="/blog">Blog</MenuLink>
          <MenuLink href="/search">Search</MenuLink>
          {isLoggedIn && <MenuLink href="/drive">Drive</MenuLink>}
          {isLoggedIn && <MenuLink href="/settings">Settings</MenuLink>}
        </div>
      </nav>

      <MenuToggleButton isOpen={isOpen} onClick={toggleMenu} />
    </>
  )
}