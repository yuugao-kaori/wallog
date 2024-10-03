// APIの接続テスト


const express = require('express');
const router = express.Router();

router.get('/test1', (req, res) => {
  res.send('test_OK');
  console.log('api/test/test1 エンドポイント');
});

module.exports = router;