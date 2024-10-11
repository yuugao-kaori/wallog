// ./api/user/logout.js
import express from 'express';
import session from 'express-session';
const router = express.Router();

// ログアウトエンドポイント
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'ログアウト失敗' });
    }
    res.json({ success: true, message: 'ログアウト成功！' });
  });
});

export default router;
