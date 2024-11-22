import express from 'express';
import session from 'express-session';
import Redis from "ioredis";
import RedisStore from "connect-redis";
const app = express();
const router = express.Router();

// express.json() を使って、JSON形式のリクエストボディをパース
app.use(express.json());

// Redisクライアント作成
const redis = new Redis({
  port: 6379,
  host: "redis", // コンテナ名を指定
});

// express-sessionの設定
app.use(
  session({
    store: new RedisStore({ client: redis }),
    secret: 'my_secret_key', // 任意のシークレットキーを設定
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 1440 * 60 * 1000, // 1000日間セッションを保持
      httpOnly: true,
      secure: false, // テスト環境なのでsecureはfalse
    },
    rolling: true, // アクティブな間セッションIDを更新
  })
);

// 簡易的なユーザ情報（テスト用）
const USER_ID = 'myuser';
const USER_PASSWORD = 'mypassword';

// ログイン処理
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  // ログインのロジックを実行し、認証が成功した場合
  if (username === USER_ID && password === USER_PASSWORD) {
    // セッションにユーザー名を保存
    req.session.username = username;

    res.json({ success: true, message: 'ログイン成功！' });
  } else {
    res.status(401).send('Invalid credentials');
  }
});

app.use('', router);

export default app;
