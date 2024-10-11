// APIの接続テスト


import express from 'express';
import session from 'express-session';
const router = express.Router();

router.get('/test1', (req, res) => {
  res.send('test_OK');
  console.log('api/test/test1 エンドポイント');
});

export default router;