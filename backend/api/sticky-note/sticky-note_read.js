import express from 'express';
import session from 'express-session';
import Redis from "ioredis";
import RedisStore from "connect-redis";
import pkg from 'pg';
const { Client } = pkg;
const router = express.Router();
const app = express();

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

router.get('/sticky_note_read', async (req, res) => {
  if (!req.session) {
    return res.status(401).json({ error: 'Session object not found' });
  }

  const client = new Client({
    user: process.env.POSTGRES_USER,
    host: process.env.POSTGRES_NAME,
    database: process.env.POSTGRES_DB,
    password: process.env.POSTGRES_PASSWORD,
    port: 5432,
  });

  try {
    await client.connect();
    const query = `
      SELECT 
        "sticky-note_id",
        "sticky-note_title",
        "sticky-note_text",
        "sticky-note_hashtag",
        "sticky-note_createat",
        "sticky-note_updateat"
      FROM "sticky-note"
      ORDER BY "sticky-note_updateat" DESC;
    `;
    const result = await client.query(query);
    return res.status(200).json({ sticky_notes: result.rows });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    await client.end();
  }
});

app.use('', router);

export default router;
