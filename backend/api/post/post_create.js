import express from 'express';
import session from 'express-session';
import Redis from "ioredis";
import RedisStore from "connect-redis";
import pg from "pg";
const router = express.Router();


const envFilePath = './.env';

if (fs.existsSync(envFilePath)) {
  dotenv.config();
  console.log('.envファイルを認識しました。\n');
  const { POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB, POSTGRES_NAME } = process.env;

  const client = new Client({
    user: POSTGRES_USER,
    host: POSTGRES_NAME,
    database: POSTGRES_DB,
    password: POSTGRES_PASSWORD,
    port: 5432,
  });
}

// Redisクライアント作成
const redis = new Redis({
  port: 6379,
  host: "redis", // Redisコンテナの名前
});

// express-sessionの設定
router.use(
  session({
    store: new RedisStore({ client: redis }),
    secret: 'my_secret_key', // 任意のシークレットキー
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 30 * 60 * 1000, // 30分
      httpOnly: true,
      secure: false, // テスト環境用にsecureはfalse
    },
    rolling: true, // セッションアクティビティでセッションを更新
  })
);

// セッション確認APIの実装
router.get('/post_create', async (req, res) => {
  // セッションが存在しない場合
  if (!req.session) {
    console.error('Session object is not found.');
    return res.status(401).json({ error: 'Session object not found' });
  }

  // セッションIDを取得
  const sessionId = req.sessionID;
  console.log(`Session ID: ${sessionId}`);

  try {
    // Redisからセッション情報を取得
    const sessionData = await redis.get(`sess:${sessionId}`);
    
    if (!sessionData) {
      console.warn('No session data found in Redis for this session ID.');
      return res.status(401).json({ error: 'No session data found' });
    }

    // セッションデータをパースして userId を確認
    const parsedSession = JSON.parse(sessionData);
    
    if (!parsedSession.username) {
      console.warn('Session exists, but userId is not set.');
      return res.status(401).json({ error: 'User not logged in' });
    }

    // 成功レスポンス
    console.log(`Session check successful: username = ${parsedSession.username}`);

    // postテーブルに対する書き込み実装

    const date = new Date();
    const now = formattedDateTime(date);
    const randomDigits = Math.floor(Math.random() * 1000000).toString().padStart(6, '0'); // 6桁の乱数
    const post_id = now + randomDigits
    console.log(post_id)
    
    function formattedDateTime(date) {
      const y = date.getFullYear();
      const m = ('0' + (date.getMonth() + 1)).slice(-2);
      const d = ('0' + date.getDate()).slice(-2);
      const h = ('0' + date.getHours()).slice(-2);
      const mi = ('0' + date.getMinutes()).slice(-2);
      const s = ('0' + date.getSeconds()).slice(-2);
    
      return y + m + d + h + mi + s;
    }
    async function insertPost(postText) {
        const query = `
          INSERT INTO post (post_id, user_id, post_text, post_tag, post_file, post_attitude)
          VALUES ($1, $2, $3, 'none_data', 'none_data', 1)
          RETURNING *;
        `;
      
        const values = [post_id, username, postText];
      
        try {
          // クエリを実行
          const res = await client.query(query, values);
          console.log('Post inserted:', res.rows[0]); // 挿入されたデータを表示
          return res.rows[0]; // 挿入された行を返す
        } catch (err) {
          console.error('Error inserting post:', err.stack);
          throw err; // エラーをキャッチする場合に投げ直す
        }
      }
      
      // 使用例
      (async () => {
        try {
          const newPost = await insertPost(req.post_text);
          console.log('New post:', newPost);
        } catch (err) {
          console.error('Error:', err);
        }
      })();


    return res.status(200).json({ userId: parsedSession.userId });
  } catch (error) {
    console.error('Error while retrieving session from Redis:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
