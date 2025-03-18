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

// 日付フォーマット関数
function formattedDateTime(date) {
  const y = date.getFullYear();
  const m = ('0' + (date.getMonth() + 1)).slice(-2);
  const d = ('0' + date.getDate()).slice(-2);
  const h = ('0' + date.getHours()).slice(-2);
  const mi = ('0' + date.getMinutes()).slice(-2);
  const s = ('0' + date.getSeconds()).slice(-2);

  return `${y}${m}${d}${h}${mi}${s}`;
}

// TODOを挿入する関数
async function insertTodo(todoId, userId, todoText, todoPriority, todoLimitAt, todoCategory, todoPublic, todoComplete) {
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

    // タイムゾーン処理のデバッグログ
    if (todoLimitAt) {
      console.log(`Original todo_limitat: ${todoLimitAt}`);
      console.log(`Date object: ${todoLimitAt instanceof Date ? 'Date object' : 'Not a Date object'}`);
    }

    // todoテーブルに挿入
    const insertTodoQuery = `
      INSERT INTO todo (
        todo_id, user_id, todo_text, todo_priority, todo_limitat, todo_category,
        todo_public, todo_complete
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;
    `;
    
    // 日付オブジェクトがDateクラスのインスタンスでない場合は変換
    let limitDate = todoLimitAt;
    if (todoLimitAt && !(todoLimitAt instanceof Date)) {
      limitDate = new Date(todoLimitAt);
      console.log(`Converted todo_limitat: ${limitDate.toISOString()}`);
    }
    
    const todoValues = [
      todoId,
      userId,
      todoText,
      todoPriority || 3, // デフォルト優先度は3
      limitDate || new Date(),
      todoCategory || 'default',
      todoPublic !== undefined ? todoPublic : true,  // 指定がなければデフォルトでpublic
      todoComplete !== undefined ? todoComplete : false  // 指定がなければデフォルトで未完了
    ];

    const todoResult = await client.query(insertTodoQuery, todoValues);
    if (todoResult.rows.length === 0) {
      throw new Error('TODOの挿入に失敗しました。');
    }
    
    const newTodo = todoResult.rows[0];
    console.log('TODOが挿入されました:', newTodo);

    // トランザクションをコミット
    await client.query('COMMIT');
    return newTodo;
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

// TODOを作成するAPIエンドポイント
router.post('/todo_create', async (req, res) => {
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

      // 日付と投稿IDの生成
      const date = new Date();
      const now = formattedDateTime(date);
      const randomDigits = Math.floor(Math.random() * 1000000).toString().padStart(6, '0'); // 6桁の乱数
      const todo_id = now + randomDigits;
      console.log(`Generated TODO ID: ${todo_id}`);

      // リクエストボディから必要なデータを取得
      const { todo_text, todo_priority, todo_limitat, todo_category, todo_public, todo_complete } = req.body;
      console.log(`TODO Text: ${todo_text}`);
      console.log(`TODO Limit At (original): ${todo_limitat}`);
      console.log(`TODO Public: ${todo_public !== undefined ? todo_public : true}`);
      console.log(`TODO Complete: ${todo_complete !== undefined ? todo_complete : false}`);

      // TODOをデータベースに挿入
      try {
        console.log('処理開始');
        const newTodo = await insertTodo(
          todo_id,
          parsedSession.username,
          todo_text,
          todo_priority,
          todo_limitat,
          todo_category,
          todo_public,
          todo_complete
        );
        
        console.log('New TODO:', newTodo);
        return res.status(200).json({ created_todo: newTodo });
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
