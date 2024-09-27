module.exports = {
    darkMode: 'class', // ダークモードの切り替えを有効にする
    content: ['./src/**/*.{js,jsx,ts,tsx}', './public/index.html'],
    theme: {
      extend: {
        colors: {
          primary: '#1a202c',
          secondary: '#2d3748',
        },
      },
    },
    plugins: [],
  };
  