// fileList.js

import express from 'express';
import session from 'express-session';
import Redis from 'ioredis';
import RedisStore from 'connect-redis';
import dotenv from 'dotenv';
import pkg from 'pg';
const { Client } = pkg;
import { fileURLToPath } from 'url';
import path from 'path';

// Initialize environment variables
dotenv.config();

const envFilePath = './.env';
dotenv.config({ path: envFilePath }); // dotenvを使用して環境変数を読み込み

// ESM環境での__dirnameの代替
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create Express router
const router = express.Router();

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
/**
 * GET /file_list
 * 認証されたユーザーのdriveテーブルの内容をページネーション対応で返却する
 * クエリパラメータ:
 * - limit: 取得する行数（デフォルト: 10）
 * - offset: 開始行（デフォルト: 0）
 */
router.get('/file_list', async (req, res) => {
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
      console.warn('Session exists, but username is not set.');
      return res.status(401).json({ error: 'User not logged in' });
    }

    console.log(`Session check successful: username = ${parsedSession.username}`);

    // Parse query parameters for pagination
    let { limit, offset } = req.query;
    limit = parseInt(limit, 10);
    offset = parseInt(offset, 10);

    // Set default values if parameters are not provided or invalid
    if (isNaN(limit) || limit <= 0) {
      limit = 10; // デフォルトの行数
    }
    if (isNaN(offset) || offset < 0) {
      offset = 0; // デフォルトの開始行
    }

    console.log(`Fetching files with limit=${limit} and offset=${offset}`);

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

    // SQLクエリの準備
    const query = `
      SELECT file_id, user_id, file_size, file_format, file_attitude, file_createat, file_updateat
      FROM drive
      WHERE user_id = $1
      ORDER BY file_createat DESC
      LIMIT $2 OFFSET $3;
    `;
    const values = [parsedSession.username, limit, offset];

    try {
      const result = await client.query(query, values);
      console.log(`Retrieved ${result.rows.length} files`);

      return res.status(200).json({
        files: result.rows,
        pagination: {
          limit,
          offset,
          count: result.rows.length,
        },
      });
    } catch (dbError) {
      console.error('Database query error:', dbError);
      return res.status(500).json({ error: 'Database query failed' });
    } finally {
      await client.end();
      console.log('PostgreSQL connection closed');
    }
  } catch (error) {
    console.error('Error while retrieving session from Redis:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
