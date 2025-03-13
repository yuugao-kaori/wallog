import express from 'express';
import session from 'express-session';
import Redis from "ioredis";
import RedisStore from "connect-redis";
import dotenv from "dotenv";
import pkg from 'pg';
const { Client } = pkg;
import cors from 'cors';
const router = express.Router();
const app = express();

// bodyParserが必要な場合
app.use(express.json());

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
      maxAge: 1000 * 1440 * 60 * 1000, // 1000日間セッションを保持
      httpOnly: true,
      secure: false, // テスト環境用にsecureはfalse
    },
    rolling: true, // セッションアクティビティでセッションを更新
  })
);

// ToDoリスト取得API
router.get('/todo_list', async (req, res) => {
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

    // セッションデータをパースして username を確認
    const parsedSession = JSON.parse(sessionData);

    if (!parsedSession.username) {
      console.warn('Session exists, but username is not set.');
      return res.status(401).json({ error: 'User not logged in' });
    }

    // ユーザーのToDoリストを取得
    const client = new Client({
      user: process.env.POSTGRES_USER,
      host: process.env.POSTGRES_NAME,
      database: process.env.POSTGRES_DB,
      password: process.env.POSTGRES_PASSWORD,
      port: 5432,
    });

    try {
      // PostgreSQLクライアントに接続
      await client.connect();
      console.log('PostgreSQLに接続しました。');

      // クエリパラメータからフィルタリング条件を取得
      const category = req.query.category;
      const priority = req.query.priority;
      const limit = parseInt(req.query.limit) || 100; // デフォルトは100件
      const offset = parseInt(req.query.offset) || 0;
      
      // ベースクエリ
      let query = 'SELECT * FROM todo WHERE user_id = $1';
      let params = [parsedSession.username];
      let paramCount = 2;
      
      // カテゴリでフィルタリング
      if (category) {
        query += ` AND todo_category = $${paramCount}`;
        params.push(category);
        paramCount++;
      }
      
      // 優先度でフィルタリング
      if (priority) {
        query += ` AND todo_priority = $${paramCount}`;
        params.push(parseInt(priority));
        paramCount++;
      }
      
      // ソート順と制限を追加
      query += ' ORDER BY todo_priority DESC, todo_limitat ASC LIMIT $' + paramCount + ' OFFSET $' + (paramCount + 1);
      params.push(limit, offset);
      
      const result = await client.query(query, params);

      // 総件数を取得
      let countQuery = 'SELECT COUNT(*) FROM todo WHERE user_id = $1';
      let countParams = [parsedSession.username];
      let countParamIndex = 2;
      
      if (category) {
        countQuery += ` AND todo_category = $${countParamIndex}`;
        countParams.push(category);
        countParamIndex++;
      }
      
      if (priority) {
        countQuery += ` AND todo_priority = $${countParamIndex}`;
        countParams.push(parseInt(priority));
      }
      
      const countResult = await client.query(countQuery, countParams);
      const totalCount = parseInt(countResult.rows[0].count);

      return res.status(200).json({
        todos: result.rows,
        total: totalCount,
        limit: limit,
        offset: offset
      });

    } catch (err) {
      console.error('データベースエラー:', err);
      return res.status(500).json({ error: 'データベース操作中にエラーが発生しました' });
    } finally {
      // クライアントを切断
      await client.end();
      console.log('PostgreSQLから切断しました。');
    }

  } catch (error) {
    console.error('Error while retrieving session from Redis:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
