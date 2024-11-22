
'use client'

import Link from 'next/link'

export default function NavBar() {
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
      </div>
    </nav>
  )
}