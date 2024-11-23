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
    <nav className="w-1/6 h-screen bg-gray-100 dark:bg-gray-800 fixed left-0 top-0 p-4">
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
  )
}