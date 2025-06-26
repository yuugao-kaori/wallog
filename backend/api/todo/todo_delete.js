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

// TODOを削除する関数
async function deleteTodo(todoId, userId) {
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

    // トランザクションを開始
    await client.query('BEGIN');

    // 対象のTODOが存在するか確認し、ユーザーが所有者かどうかをチェック
    const checkQuery = `
      SELECT * FROM todo 
      WHERE todo_id = $1 AND user_id = $2
    `;
    const checkResult = await client.query(checkQuery, [todoId, userId]);

    if (checkResult.rows.length === 0) {
      throw new Error('TODOが見つからないか、アクセス権がありません。');
    }

    // 更新対象フィールドの準備は不要（削除のため）

    // todoテーブルから削除
    const deleteQuery = `
      DELETE FROM todo 
      WHERE todo_id = $1
      RETURNING *
    `;

    const deleteResult = await client.query(deleteQuery, [todoId]);
    
    if (deleteResult.rows.length === 0) {
      throw new Error('TODOの削除に失敗しました。');
    }
    
    const deletedTodo = deleteResult.rows[0];
    console.log('TODOが削除されました:', deletedTodo);

    // トランザクションをコミット
    await client.query('COMMIT');
    return deletedTodo;
  } catch (err) {
    // エラー発生時はロールバック
    await client.query('ROLLBACK');
    throw err;
  } finally {
    // クライアントを切断
    await client.end();
    console.log('PostgreSQLから切断しました。');
  }
}

// TODOを削除するAPIエンドポイント
router.delete('/', async (req, res) => {
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

    // 成功レスポンス - ユーザーが認証済み
    console.log(`Session check successful: username = ${parsedSession.username}`);

    // 環境変数の読み取り実装
    const envFilePath = './.env';

    if (fs.existsSync(envFilePath)) {
      dotenv.config();
      console.log('.envファイルを認識しました。');

      // リクエストボディからTODO IDを取得
      const { todo_id } = req.body;

      // TODO IDの検証
      if (!todo_id) {
        return res.status(400).json({ error: 'TODO IDが必要です' });
      }

      console.log(`Deleting TODO ID: ${todo_id}`);

      // TODOをデータベースから削除
      try {
        console.log('削除処理開始');
        const deletedTodo = await deleteTodo(
          todo_id,
          parsedSession.username
        );
        
        console.log('Deleted TODO:', deletedTodo);
        return res.status(200).json({ deleted_todo: deletedTodo });
      } catch (err) {
        console.error('Error:', err);
        return res.status(500).json({ error: err.message || 'Internal server error' });
      }

    } else {
      console.error('.envファイルが存在しません。');
      return res.status(500).json({ error: '.envファイルが存在しません。' });
    }

  } catch (error) {
    console.error('Error while retrieving session from Redis:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
