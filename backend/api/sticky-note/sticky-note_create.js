import express from 'express';
import session from 'express-session';
import Redis from "ioredis";
import RedisStore from "connect-redis";
import dotenv from "dotenv";
import fs from "fs";
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

// sticky-note IDを生成する関数
function generateStickyNoteId() {
  const now = new Date();
  const timestamp = now.getFullYear() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0') +
    String(now.getHours()).padStart(2, '0') +
    String(now.getMinutes()).padStart(2, '0') +
    String(now.getSeconds()).padStart(2, '0') +
    String(now.getMilliseconds()).padStart(3, '0');
  const randomDigits = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
  return `sn-${timestamp}${randomDigits}`;
}

// sticky-noteを作成する関数
async function createStickyNote(stickyNoteId, title, text, remind, hashtags) {
  const client = new Client({
    user: process.env.POSTGRES_USER,
    host: process.env.POSTGRES_NAME,
    database: process.env.POSTGRES_DB,
    password: process.env.POSTGRES_PASSWORD,
    port: 5432,
  });

  try {
    await client.connect();
    await client.query('BEGIN');

    const insertQuery = `
      INSERT INTO "sticky-note" (
        "sticky-note_id",
        "sticky-note_title",
        "sticky-note_text",
        "sticky-note_remind",
        "sticky-note_hashtag"
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;

    const result = await client.query(insertQuery, [
      stickyNoteId,
      title,
      text,
      remind,
      hashtags
    ]);

    await client.query('COMMIT');
    return result.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    await client.end();
  }
}

router.post('/sticky_note_create', async (req, res) => {
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

    const {
      title,
      text,
      remind,
      hashtags
    } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const stickyNoteId = generateStickyNoteId();
    const newStickyNote = await createStickyNote(
      stickyNoteId,
      title,
      text || null,
      remind || null,
      hashtags || []
    );

    return res.status(200).json({ created_sticky_note: newStickyNote });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.use('', router);

export default router;
