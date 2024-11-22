// index.js側の接続テスト用ファイル


const express = require('express');
const router = express.Router();
const app = express();


router.get('/test3', (req, res) => {
  res.send('Connection_OK');
  console.log('接続OK');
});

app.use('', router);

export default app;
