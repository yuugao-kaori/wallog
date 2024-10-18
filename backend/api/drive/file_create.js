import express from 'express';
import session from 'express-session';
import Redis from "ioredis";
import RedisStore from "connect-redis";
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv'; // dotenvをインポート
import pkg from 'pg';
const { Client } = pkg; // pgライブラリからClientをインポート

const router = express.Router();
console.log('file_create:wakeup!');

// ESM環境での__dirnameの代替
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Redisクライアント作成
const redis = new Redis({
  port: 6379,
  host: "redis", // Redisコンテナの名前
});

// express-sessionの設定
router.use(
  session({
    store: new RedisStore({ client: redis }),
    secret: 'my_secret_key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 30 * 60 * 1000,
      httpOnly: true,
      secure: false,
    },
    rolling: true,
  })
);

// 環境変数の読み取り実装
const envFilePath = './.env';
dotenv.config({ path: envFilePath }); // dotenvを使用して環境変数を読み込み

async function insertPost(file_id, user_name, file_size, file_format) {
  const { POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB, POSTGRES_NAME } = process.env;

  const client = new Client({
    user: POSTGRES_USER,
    host: POSTGRES_NAME,
    database: POSTGRES_DB,
    password: POSTGRES_PASSWORD,
    port: 5432,
  });

  // クライアントを接続
  await client.connect();
  console.log('PostgreSQLに接続しました。');
  const query = `
      INSERT INTO drive (file_id, user_id, file_size, file_format, file_attitude)
      VALUES ($1, $2, $3, $4, 1)
      RETURNING *;
      `;
  const values = [file_id, user_name, file_size, file_format];

  try {
    const result = await client.query(query, values);
    if (result && result.rows && result.rows.length > 0) {
      console.log('Post inserted:', result.rows[0]);
      return result.rows[0];
    } else {
      throw new Error('No rows returned from the query');
    }
  } catch (err) {
    throw err;
  } finally {
    await client.end();
  }
}

// ストレージの設定
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.resolve(__dirname, '../../../app_data');
    // ディレクトリが存在しない場合は作成
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix);
  }
});

const upload = multer({ storage: storage });

// ファイルアップロード処理
const fileCreateHandler = (req, res, user_name) => {
  upload.single('file')(req, res, async function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
      console.log('async_ok');
      const file_id = path.basename(req.file.path); // ファイル名を取得
      const file_size = req.file.size; // ファイルのサイズを取得
      const file_format = path.extname(req.file.originalname); // ファイルの拡張子を取得

      const new_file = await insertPost(file_id, user_name, file_size, file_format);
      console.log('New file:', new_file);
      return res.status(200).json({
        message: 'File uploaded successfully',
        filePath: req.file.path
      });

    } catch (err) {
      console.error('Error:', err);
      return res.status(500).json({ error: err });
    }
  });
};

router.post('/file_create', async (req, res) => {
  if (!req.session) {
    console.error('Session object is not found.');
    return res.status(401).json({ error: 'Session object not found' });
  }

  const sessionId = req.sessionID;
  console.log(`Session ID: ${sessionId}`);

  try {
    const sessionData = await redis.get(`sess:${sessionId}`);
    console.log('sessionId:', sessionId);
    console.log('sessionData:', sessionData);
    
    if (!sessionData) {
      console.warn('No session data found in Redis for this session ID.');
      return res.status(401).json({ error: 'No session data found' });
    }

    const parsedSession = JSON.parse(sessionData);
    console.log('parsedSession.username:', parsedSession.username);
    if (!parsedSession.username) {
      console.warn('Session exists, but userId is not set.');
      return res.status(401).json({ error: 'User not logged in' });
    }

    console.log(`Session check successful: username = ${parsedSession.username}`);
    fileCreateHandler(req, res, parsedSession.username);
  } catch (error) {
    console.error('Error while retrieving session from Redis:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
