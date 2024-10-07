// ./api/user/login.js
const express = require('express');

const router = express.Router();

// 簡易的なユーザ情報（テスト用）
const USER_ID = 'myuser';
const USER_PASSWORD = 'mypassword';

// ログインエンドポイント
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  // ユーザー情報の照合
  if (username === USER_ID && password === USER_PASSWORD) {
    req.session.user = USER_ID;
    req.session.rememberMe = req.body.rememberMe;
    res.json({ success: true, message: 'ログイン成功！' });
  } else {
    res.status(401).json({ success: false, message: '認証失敗' });
  }
});

module.exports = router;
