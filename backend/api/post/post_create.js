import express from 'express';
import session from 'express-session';
import Redis from "ioredis";
import RedisStore from "connect-redis";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
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

// タグを取得または作成してそのIDを返すヘルパー関数
async function getOrCreateTagId(client, tag) {
  const cleanedTag = tag.startsWith('#') ? tag.slice(1) : tag; // 先頭の'#'を削除
  // タグが既に存在するかチェック
  const selectQuery = 'SELECT post_tag_id FROM post_tag WHERE post_tag_id = $1';
  const selectResult = await client.query(selectQuery, [cleanedTag]);

  if (selectResult.rows.length > 0) {
    return selectResult.rows[0].post_tag_id;
  } else {
    // タグが存在しない場合、新しく挿入
    const insertQuery = 'INSERT INTO post_tag (post_tag_id, post_tag_text) VALUES ($1, $2) RETURNING post_tag_id';
    const insertResult = await client.query(insertQuery, [cleanedTag, tag]);
    return insertResult.rows[0].post_tag_id;
  }
}

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

// 投稿とハッシュタグを挿入する関数
async function insertPostAndTags(postId, postText, fileId, tags, parsedSession) {
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

    // postテーブルに挿入
    const insertPostQuery = `
      INSERT INTO post (post_id, user_id, post_text, post_tag, post_file, post_attitude)
      VALUES ($1, $2, $3, $4, $5, 1)
      RETURNING *;
    `;
    const postValues = [
      postId,
      parsedSession.username,
      postText,
      tags.length > 0 ? tags.join(' ') : 'none_data',
      fileId
    ];

    const postResult = await client.query(insertPostQuery, postValues);
    if (postResult.rows.length === 0) {
      throw new Error('投稿の挿入に失敗しました。');
    }
    const newPost = postResult.rows[0];
    console.log('投稿が挿入されました:', newPost);

    // タグが存在する場合は処理を行う
    if (tags.length > 0) {
      // タグIDを格納する配列
      const tagIds = [];

      // 各タグについてIDを取得または作成
      for (const tag of tags) {
        const tagId = await getOrCreateTagId(client, tag);
        tagIds.push(tagId);
      }

      // posts_post_tagsテーブルへの挿入ステートメントを準備
      const insertTagsQuery = `
        INSERT INTO posts_post_tags (post_id, post_tag_id)
        VALUES ${tagIds.map((_, idx) => `($1, $${idx + 2})`).join(', ')}
      `;
      const tagValues = [postId, ...tagIds];

      await client.query(insertTagsQuery, tagValues);
      console.log('タグがposts_post_tagsに挿入されました。');
    }

    // トランザクションをコミット
    await client.query('COMMIT');
    return newPost;
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

// セッション確認APIの実装
router.post('/post_create', async (req, res) => {
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

    // 成功レスポンス
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
      const post_id = now + randomDigits;
      console.log(`Generated Post ID: ${post_id}`);
      console.log(`Post Text: ${req.body.post_text}`);

      // 投稿テキストからハッシュタグを抽出
      const post_text_mid = req.body.post_text;
      let post_tags = post_text_mid.match(/(?<=\s|^)#\S+(?=\s|$)/g);
      if (post_tags) {
        console.log("抽出されたハッシュタグ:", post_tags);
      } else {
        console.log("ハッシュタグは抽出されませんでした。");
        post_tags = []; // ハッシュタグがない場合は空配列に設定
      }

      // 投稿とタグを挿入
      try {
        console.log('処理開始');
        const newPost = await insertPostAndTags(post_id, req.body.post_text, req.body.post_file, post_tags, parsedSession);
        console.log('New post:', newPost);
        return res.status(200).json({ created_note: newPost });
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

app.use('', router);

export default app;
