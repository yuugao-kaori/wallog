import express from 'express';
import session from 'express-session';
import Redis from "ioredis";
import RedisStore from "connect-redis";
import pkg from 'pg';
const { Client } = pkg;
const router = express.Router();
const app = express();

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

// 付箋削除の関数
async function deleteStickyNote(stickyNoteId) {
  const client = new Client({
    user: process.env.POSTGRES_USER,
    host: process.env.POSTGRES_NAME,
    database: process.env.POSTGRES_DB,
    password: process.env.POSTGRES_PASSWORD,
    port: 5432,
  });

  try {
    await client.connect();
    console.log('PostgreSQLに接続しました。');

    const deleteQuery = `
      DELETE FROM "sticky-note"
      WHERE "sticky-note_id" = $1
      RETURNING *;
    `;

    const result = await client.query(deleteQuery, [stickyNoteId]);
    
    if (result.rows.length === 0) {
      throw new Error('付箋が見つかりません。');
    }

    console.log('付箋が削除されました:', result.rows[0]);
    return result.rows[0];

  } catch (err) {
    throw err;
  } finally {
    await client.end();
    console.log('PostgreSQLから切断しました。');
  }
}

// 削除APIエンドポイント
router.put('/sticky_note_delete', async (req, res) => {
  if (!req.session) {
    console.error('Session object is not found.');
    return res.status(401).json({ error: 'Session object not found' });
  }

  const sessionId = req.sessionID;
  console.log(`Session ID: ${sessionId}`);

  try {
    const sessionData = await redis.get(`sess:${sessionId}`);

    if (!sessionData) {
      console.warn('No session data found in Redis for this session ID.');
      return res.status(401).json({ error: 'No session data found' });
    }

    const parsedSession = JSON.parse(sessionData);

    if (!parsedSession.username) {
      console.warn('Session exists, but username is not set.');
      return res.status(401).json({ error: 'User not logged in' });
    }

    const { sticky_note_id } = req.body;

    if (!sticky_note_id) {
      return res.status(400).json({ error: 'sticky_note_id is required' });
    }

    const deletedNote = await deleteStickyNote(sticky_note_id);
    return res.status(200).json({ deleted_note: deletedNote });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

app.use('', router);

export default router;
