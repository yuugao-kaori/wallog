import express from 'express';
import session from 'express-session';
import Redis from "ioredis";
import RedisStore from "connect-redis";
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import pkg from 'pg';
const { Client } = pkg;
import cors from 'cors';

const router = express.Router();
console.log('file_update:wakeup!');

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

/**
 * ファイルメタデータを更新する関数
 * @param {string} file_id - 更新するファイルのID
 * @param {object} updateData - 更新するデータ（file_exif_title, file_exif_public, file_exif_gps_public等）
 * @returns {Promise<object>} 更新されたファイルのデータ
 */
async function updateFileData(file_id, updateData, userId) {
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

    // ファイルの所有者を確認
    const checkQuery = `SELECT user_id FROM drive WHERE file_id = $1`;
    const checkResult = await client.query(checkQuery, [file_id]);
    
    if (checkResult.rows.length === 0) {
      throw new Error('指定されたファイルが見つかりません。');
    }
    
    if (checkResult.rows[0].user_id !== userId) {
      throw new Error('このファイルを更新する権限がありません。');
    }

    // 更新可能なフィールドの一覧
    const allowedFields = [
      'file_exif_title',
      'file_exif_description',
      'file_exif_public',
      'file_exif_gps_public',
      'file_attitude'
    ];

    // 更新するフィールドとその値のペアを作成
    let updatePairs = [];
    let values = [file_id]; // 最初の値はfile_id
    let index = 2; // パラメータのインデックス（$2から始まる）

    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        updatePairs.push(`${field} = $${index}`);
        values.push(updateData[field]);
        index++;
      }
    }

    // 更新するフィールドが無い場合
    if (updatePairs.length === 0) {
      throw new Error('更新するフィールドが指定されていません。');
    }

    // 更新日時も設定
    updatePairs.push(`file_updateat = CURRENT_TIMESTAMP`);

    const query = `
      UPDATE drive
      SET ${updatePairs.join(', ')}
      WHERE file_id = $1
      RETURNING *;
    `;

    const result = await client.query(query, values);
    
    if (result.rows.length === 0) {
      throw new Error('ファイルの更新に失敗しました。');
    }

    console.log(`File with file_id=${file_id} updated:`, result.rows[0]);
    return result.rows[0];
  } catch (err) {
    throw err;
  } finally {
    await client.end();
  }
}

/**
 * file_update エンドポイントのハンドラー
 */
router.post('/file_update', async (req, res) => {
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

    const { file_id, ...updateData } = req.body;

    if (!file_id) {
      return res.status(400).json({ error: 'file_id is required' });
    }

    // ファイルメタデータを更新
    const updatedFile = await updateFileData(file_id, updateData, parsedSession.username);

    return res.status(200).json({
      message: 'File metadata updated successfully',
      file: updatedFile
    });

  } catch (error) {
    console.error('Error during file metadata update:', error);
    return res.status(error.message.includes('権限') ? 403 : 500).json({
      error: error.message || 'Internal server error'
    });
  }
});

export default router;