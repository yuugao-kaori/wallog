import express from 'express';
import session from 'express-session';
import Redis from "ioredis";
import RedisStore from "connect-redis";
import pkg from 'pg';
const { Client } = pkg;
const router = express.Router();
const app = express();

// bodyParserが必要な場合
app.use(express.json());

// Redisクライアント作成
const redis = new Redis({
  port: 6379,
  host: "redis",
});

// express-sessionの設定
router.use(
  session({
    store: new RedisStore({ client: redis }),
    secret: 'my_secret_key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 1440 * 60 * 1000,
      httpOnly: true,
      secure: false,
    },
    rolling: true,
  })
);

// ユーザ���情報を更新する関数
async function updateUserInfo(userId, updates) {
  const client = new Client({
    user: process.env.POSTGRES_USER,
    host: process.env.POSTGRES_NAME,
    database: process.env.POSTGRES_DB,
    password: process.env.POSTGRES_PASSWORD,
    port: 5432,
  });

  try {
    await client.connect();
    
    const updateFields = [];
    const values = [];
    let valueCounter = 1;

    if (updates.user_hashtag) {
      updateFields.push(`user_hashtag = $${valueCounter}`);
      values.push(updates.user_hashtag); // user_name を user_hashtag に修正
      valueCounter++;
    }

    values.push(userId);
    const query = `
      UPDATE user
      SET ${updateFields.join(', ')}
      WHERE user_id = $${valueCounter}
      RETURNING user_id, user_name, user_email, user_created_at
    `;

    const result = await client.query(query, values);
    return result.rows[0];
  } finally {
    await client.end();
  }
}

// ユーザー情報更新APIの実装
router.put('/user_update', async (req, res) => {
  if (!req.session) {
    return res.status(401).json({ error: 'Session object not found' });
  }

  const sessionId = req.sessionID;

  try {
    const sessionData = await redis.get(`sess:${sessionId}`);
    if (!sessionData) {
      return res.status(401).json({ error: 'No session data found' });
    }

    const parsedSession = JSON.parse(sessionData);
    if (!parsedSession.username) {
      return res.status(401).json({ error: 'User not logged in' });
    }

    const updates = {
      user_name: req.body.user_name,
      user_email: req.body.user_email
    };

    const updatedUser = await updateUserInfo(parsedSession.username, updates);
    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json(updatedUser);

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.use('', router);

export default router;
