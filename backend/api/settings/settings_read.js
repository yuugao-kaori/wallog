import express from 'express';
import dotenv from 'dotenv';
import session from 'express-session';
import Redis from "ioredis";
import RedisStore from "connect-redis";
import pkg from 'pg';
const { Client } = pkg;

dotenv.config();
const router = express.Router();

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

router.get('/settings_read', async (req, res) => {
    // セッションチェック
    let isAuthenticated = false;
    if (req.session) {
        const sessionId = req.sessionID;
        try {
            const sessionData = await redis.get(`sess:${sessionId}`);
            if (sessionData) {
                const parsedSession = JSON.parse(sessionData);
                isAuthenticated = !!parsedSession.username;
            }
        } catch (error) {
            console.warn('セッション確認時のエラー:', error);
        }
    }

    const { POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB, POSTGRES_NAME } = process.env;
    const client = new Client({
        user: POSTGRES_USER,
        host: POSTGRES_NAME,
        database: POSTGRES_DB,
        password: POSTGRES_PASSWORD,
        port: 5432,
    });

    try {
        await client.connect();
        console.log('PostgreSQLに接続しました。');

        // 認証状態に応じてクエリを変更
        const query = isAuthenticated
            ? `SELECT settings_key, settings_value
               FROM settings
               ORDER BY settings_key;`
            : `SELECT settings_key, settings_value
               FROM settings
               WHERE is_public = true
               ORDER BY settings_key;`;

        const result = await client.query(query);
        console.log('設定取得結果:', result.rows);
        
        res.set('Cache-Control', 'no-store'); // キャッシュを無効化
        return res.status(200).json(result.rows);

    } catch (error) {
        console.error('詳細なエラー情報:', {
            message: error.message,
            stack: error.stack,
            code: error.code,
            detail: error.detail
        });

        // クライアントへの応答
        return res.status(500).json({
            error: 'データベースエラーが発生しました',
            message: process.env.NODE_ENV === 'development' ? error.message : '内部サーバーエラー'
        });

    } finally {
        try {
            await client.end();
            console.log('PostgreSQL接続を終了しました');
        } catch (err) {
            console.error('接続終了時にエラーが発生:', err);
        }
    }
});

export default router;
