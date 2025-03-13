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

// TODOを更新する関数
async function updateTodo(todoId, userId, updatedData) {
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

    // 更新対象フィールドの準備
    const updateFields = [];
    const values = [todoId]; // 最初の値はtodoId
    let paramCount = 2; // パラメータカウンターの開始値

    // 更新可能なフィールドをチェック
    if (updatedData.todo_text !== undefined) {
      updateFields.push(`todo_text = $${paramCount++}`);
      values.push(updatedData.todo_text);
    }
    
    if (updatedData.todo_priority !== undefined) {
      updateFields.push(`todo_priority = $${paramCount++}`);
      values.push(updatedData.todo_priority);
    }
    
    if (updatedData.todo_limitat !== undefined) {
      updateFields.push(`todo_limitat = $${paramCount++}`);
      values.push(new Date(updatedData.todo_limitat));
    }
    
    if (updatedData.todo_category !== undefined) {
      updateFields.push(`todo_category = $${paramCount++}`);
      values.push(updatedData.todo_category);
    }
    
    if (updatedData.todo_attitude !== undefined) {
      updateFields.push(`todo_attitude = $${paramCount++}`);
      values.push(updatedData.todo_attitude);
    }

    if (updatedData.todo_public !== undefined) {
      updateFields.push(`todo_public = $${paramCount++}`);
      values.push(updatedData.todo_public);
    }
    
    if (updatedData.todo_complete !== undefined) {
      updateFields.push(`todo_complete = $${paramCount++}`);
      values.push(updatedData.todo_complete);
    }
    
    // 更新タイムスタンプを常に更新
    updateFields.push(`todo_updateat = CURRENT_TIMESTAMP`);

    // 更新するフィールドがない場合
    if (updateFields.length === 1) { // todo_updateatのみの場合
      throw new Error('更新するフィールドがありません。');
    }

    // todoテーブルの更新
    const updateQuery = `
      UPDATE todo 
      SET ${updateFields.join(', ')} 
      WHERE todo_id = $1
      RETURNING *
    `;

    const updateResult = await client.query(updateQuery, values);
    
    if (updateResult.rows.length === 0) {
      throw new Error('TODOの更新に失敗しました。');
    }
    
    const updatedTodo = updateResult.rows[0];
    console.log('TODOが更新されました:', updatedTodo);

    // トランザクションをコミット
    await client.query('COMMIT');
    return updatedTodo;
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

// TODOを更新するAPIエンドポイント
router.put('/todo_update', async (req, res) => {
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

      // リクエストボディからTODO IDと更新データを取得
      const { todo_id, ...updateData } = req.body;

      // TODO IDの検証
      if (!todo_id) {
        return res.status(400).json({ error: 'TODO IDが必要です' });
      }

      console.log(`Updating TODO ID: ${todo_id}`);
      console.log('Update data:', updateData);

      // TODOをデータベースで更新
      try {
        console.log('更新処理開始');
        const updatedTodo = await updateTodo(
          todo_id,
          parsedSession.username,
          updateData
        );
        
        console.log('Updated TODO:', updatedTodo);
        return res.status(200).json({ updated_todo: updatedTodo });
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
