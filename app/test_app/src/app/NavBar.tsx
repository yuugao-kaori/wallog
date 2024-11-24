'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import axios from 'axios'

const api = axios.create({
  baseURL: 'https://wallog.seitendan.com',
  headers: { 
    'Content-Type': 'application/json;charset=utf-8',
    'Access-Control-Allow-Credentials': 'true'
  },
  withCredentials: true
});

export default function NavBar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

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
  }, []);

  return (
    <>
      <nav className={`
        w-64 h-screen bg-gray-100 dark:bg-gray-800 fixed left-0 top-0 p-4
        transform transition-transform duration-300 ease-in-out z-30
        md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col space-y-4">
          <Link 
            href="/diary" 
            className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            Diary
          </Link>
          <Link 
            href="/blog" 
            className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            Blog
          </Link>
          <Link 
            href="/search" 
            className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            Search
          </Link>
          {isLoggedIn && (
            <Link 
              href="/drive" 
              className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              Drive
            </Link>
          )}
          {isLoggedIn && (
            <Link 
              href="/settings" 
              className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              Settings
            </Link>
          )}
        </div>
      </nav>

      {/* モバイル用トグルボタン */}
      <button
        onClick={() => setIsOpen(!isOpen)}
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
    </>
  )
}