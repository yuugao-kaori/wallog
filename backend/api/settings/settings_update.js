import express from 'express';
import session from 'express-session';
import Redis from "ioredis";
import RedisStore from "connect-redis";
import dotenv from 'dotenv';
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

router.post('/settings_update', async (req, res) => {
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

        const { settings_key, settings_value } = req.body;
        if (!settings_key || !settings_value) {
            return res.status(400).json({ error: 'Missing settings_key or settings_value' });
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
                UPDATE settings 
                SET settings_value = $1 
                WHERE settings_key = $2
                RETURNING *;
            `;
            const result = await client.query(query, [settings_value, settings_key]);
            
            if (result.rows.length === 0) {
                // キーが存在しない場合は新規作成
                const insertQuery = `
                    INSERT INTO settings (settings_key, settings_value)
                    VALUES ($1, $2)
                    RETURNING *;
                `;
                const insertResult = await client.query(insertQuery, [settings_key, settings_value]);
                return res.status(201).json(insertResult.rows[0]);
            }
            
            return res.status(200).json(result.rows[0]);
        } catch (error) {
            console.error('Error:', error);
            return res.status(500).json({ error: 'Internal server error' });
        } finally {
            await client.end();
        }
    } catch (error) {
        console.error('Error while retrieving session from Redis:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
