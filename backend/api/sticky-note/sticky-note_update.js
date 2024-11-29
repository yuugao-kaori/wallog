import express from 'express';
import session from 'express-session';
import Redis from "ioredis";
import RedisStore from "connect-redis";
import dotenv from "dotenv";
import pkg from 'pg';
const { Client } = pkg;
const router = express.Router();
const app = express();

// ...existing code for Redis setup and session configuration...

router.put('/sticky_note_update', async (req, res) => {
  if (!req.session) {
    console.error('Session object is not found.');
    return res.status(401).json({ error: 'Session object not found' });
  }

  const sessionId = req.sessionID;
  const redis = new Redis({
    port: 6379,
    host: "redis",
  });

  try {
    const sessionData = await redis.get(`sess:${sessionId}`);
    if (!sessionData) {
      return res.status(401).json({ error: 'No session data found' });
    }

    const parsedSession = JSON.parse(sessionData);
    if (!parsedSession.username) {
      return res.status(401).json({ error: 'User not logged in' });
    }

    const client = new Client({
      user: process.env.POSTGRES_USER,
      host: process.env.POSTGRES_NAME,
      database: process.env.POSTGRES_DB,
      password: process.env.POSTGRES_PASSWORD,
      port: 5432,
    });

    await client.connect();

    const {
      sticky_note_id,
      sticky_note_title,
      sticky_note_text,
      sticky_note_attitude,
      sticky_note_hashtag
    } = req.body;

    // ハッシュタグを PostgreSQL の配列形式に変換
    const formattedHashtags = sticky_note_hashtag
      ? `{${sticky_note_hashtag.split(' ').join(',')}}`
      : null;

    const updateQuery = `
      UPDATE "sticky-note"
      SET 
        "sticky-note_title" = COALESCE($1, "sticky-note_title"),
        "sticky-note_text" = COALESCE($2, "sticky-note_text"),
        "sticky-note_attitude" = COALESCE($3, "sticky-note_attitude"),
        "sticky-note_hashtag" = COALESCE($4, "sticky-note_hashtag"),
        "sticky-note_updateat" = CURRENT_TIMESTAMP
      WHERE "sticky-note_id" = $5
      RETURNING *;
    `;

    const result = await client.query(updateQuery, [
      sticky_note_title,
      sticky_note_text,
      sticky_note_attitude,
      formattedHashtags,  // 変換したハッシュタグを使用
      sticky_note_id
    ]);

    await client.end();

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sticky note not found' });
    }

    res.status(200).json({
      message: 'Sticky note updated successfully',
      updated_note: result.rows[0]
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    redis.quit();
  }
});

export default router;
