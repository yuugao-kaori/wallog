/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // ダークモードの設定
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        card: 'var(--card)',
        'card-foreground': 'var(--card-foreground)',
      },
    },
  },
  plugins: [
    require('tailwind-scrollbar-hide')
    // もしトランジション関連のプラグインがあれば削除
  ],
}