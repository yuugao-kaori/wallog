import express from 'express';
import session from 'express-session';
import Redis from "ioredis";
import RedisStore from "connect-redis";
import pkg from 'pg';
const { Client } = pkg;
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

router.post('/settings_write', async (req, res) => {
  // セッション確認
  if (!req.session) {
    console.error('Session object is not found.');
    return res.status(401).json({ error: 'Session object not found' });
  }

  const sessionId = req.sessionID;
  
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

    // リクエストボディのバリデーション
    const settings = req.body;
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: 'Invalid settings data' });
    }

    // PostgreSQLクライアント初期化
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
      console.log('リクエストボディ:', settings); // デバッグ用

      // トランザクション開始
      await client.query('BEGIN');

      try {
        // 既存の設定を削除する前にカウントを確認
        const beforeCount = await client.query('SELECT COUNT(*) FROM settings');
        console.log('削除前のレコード数:', beforeCount.rows[0].count);

        // 既存の設定を全て削除
        const deleteResult = await client.query('DELETE FROM settings');
        console.log('削除されたレコード数:', deleteResult.rowCount);

        // 新しい設定を一括挿入
        for (const [key, value] of Object.entries(settings)) {
          const safeValue = value === null || value === undefined ? '' : String(value);
          const insertResult = await client.query(
            'INSERT INTO settings (settings_key, settings_value) VALUES ($1, $2) RETURNING *',
            [key, safeValue]
          );
          console.log(`設定が挿入されました: ${key} = ${safeValue}`);
          
          if (insertResult.rowCount !== 1) {
            throw new Error(`Failed to insert setting: ${key}`);
          }
        }

        // 最終的なレコード数を確認
        const afterCount = await client.query('SELECT COUNT(*) FROM settings');
        console.log('挿入後のレコード数:', afterCount.rows[0].count);

        // トランザクションのコミット
        await client.query('COMMIT');
        console.log('トランザクションがコミットされました');
        
        return res.status(200).json({ 
          message: 'Settings updated successfully',
          updatedCount: afterCount.rows[0].count,
          timestamp: Date.now()  // 追加: 更新時のタイムスタンプ
        });
      } catch (error) {
        // エラー発生時はロールバック
        await client.query('ROLLBACK');
        console.error('トランザクションエラー:', error);
        throw error;
      }
    } catch (err) {
      console.error('データベースエラーの詳細:', {
        message: err.message,
        stack: err.stack,
        code: err.code,
        detail: err.detail
      });
      return res.status(500).json({ 
        error: 'Database error occurred',
        details: process.env.NODE_ENV === 'development' ? 
          {
            message: err.message,
            code: err.code
          } : 
          'An internal error occurred'
      });
    } finally {
      await client.end();
      console.log('PostgreSQLから切断しました。');
    }

  } catch (error) {
    console.error('Error while processing request:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
