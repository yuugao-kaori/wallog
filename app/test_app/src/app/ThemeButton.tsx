'use client'

import { useTheme } from './ThemeProvider';

export default function ThemeButton() {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <button
      onClick={toggleTheme}
      className="fixed top-4 right-4 px-4 py-2 rounded-md bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 z-50"
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  );
}