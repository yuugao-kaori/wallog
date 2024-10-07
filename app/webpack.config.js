// webpack.config.js

const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: './src/index.jsx', // エントリーポイント
  output: {
    path: path.resolve(__dirname, 'dist'), // 出力先ディレクトリ
    filename: 'bundle.js', // 出力ファイル名
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/, 
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react'], // React用のBabelプリセット
          },
        },
      },
      {
        test: /\.css$/, // CSSファイルに対するルール
        use: [
          'style-loader',
          'css-loader',
          'postcss-loader',
        ], // スタイルローダーとCSSローダーを使用
      },
    ],
  },
  resolve: {
    extensions: ['.js', '.jsx'], // .jsx ファイルの解決を追加
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/index.html', // HTMLテンプレート
    tailwindcss: {},
    autoprefixer: {},
    }),
  ],
  devServer: {
    static: {
      directory: path.join(__dirname, 'dist'),
    },
    historyApiFallback: true,  
    compress: true,
    port: 3000, // 開発サーバーのポート
  },
  mode: 'development',
};

/* 
const path = require('path');

module.exports = {

  mode: 'development',
  entry: './src/index.jsx',
  entry: './src/index.jsx',
  output: {
    path: path.join(__dirname, 'dist'),
    filename: 'main.js',
  },
  
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-react'],
          },
        },
      },
      {
        test: /\.scss$/,
        use: ['style-loader', 'css-loader', 'sass-loader']
      },
    ],
  },
  devServer: {
    static: {
      directory: path.join(__dirname, 'dist'),
    },
    port: 3000,
  },
  resolve: {
    extensions: ['.ts', '.jsx', '.js', '.json'],
  },
  target: 'web',
};
*/