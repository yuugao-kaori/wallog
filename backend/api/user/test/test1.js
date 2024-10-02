// 必要なモジュールの読み込み
const express = require('express');

// Expressアプリケーションの作成
const app = express();

// ポート番号を指定
const port = process.env.PORT || 23000;

// /api/test/test1 エンドポイントにGETリクエストが来た時に "PONG" を返す
app.get('/api/test/test1', (req, res) => {
  res.send('PONG');
});

// サーバーを起動
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
