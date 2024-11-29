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

async function getStickyNotes(limit = 20, lastId = null) {
  const client = new Client({
    user: process.env.POSTGRES_USER,
    host: process.env.POSTGRES_NAME,
    database: process.env.POSTGRES_DB,
    password: process.env.POSTGRES_PASSWORD,
    port: 5432,
  });

  try {
    await client.connect();
    
    let query = `
      SELECT *
      FROM "sticky-note"
      WHERE "sticky-note_attitude" = 1
    `;
    
    const params = [];
    if (lastId) {
      query += ` AND "sticky-note_id" < $1`;
      params.push(lastId);
    }
    
    query += `
      ORDER BY "sticky-note_id" DESC
      LIMIT $${params.length + 1}
    `;
    params.push(limit);

    const result = await client.query(query, params);
    return result.rows;
  } finally {
    await client.end();
  }
}

router.get('/sticky_note_read', async (req, res) => {
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

    const limit = parseInt(req.query.limit) || 20;
    const lastId = req.query.last_id || null;

    const stickyNotes = await getStickyNotes(limit, lastId);
    return res.status(200).json({ sticky_notes: stickyNotes });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.use('', router);

export default router;
