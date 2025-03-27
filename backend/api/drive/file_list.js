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
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

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

// MinIOクライアントの初期化
const s3Client = new S3Client({
  endpoint: `http://${process.env.MINIO_NAME}:9000`,
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.MINIO_USER || 'myuser',
    secretAccessKey: process.env.MINIO_PASSWORD || 'mypassword',
  },
  forcePathStyle: true,
  signatureVersion: 'v4',
  tls: false,
  apiVersion: 'latest'
});

/**
 * GET /file_list
 * 認証されたユーザーのdriveテーブルの内容をページネーション対応で返却する
 * クエリパラメータ:
 * - limit: 取得する行数（デフォルト: 10）
 * - offset: 開始行（デフォルト: 0）
 * - sort: ソート方法（オプション: 'exif_datetime'を指定するとEXIF日時でソート）
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
    let { limit, offset, sort } = req.query;
    limit = parseInt(limit, 10);
    offset = parseInt(offset, 10);

    // Set default values if parameters are not provided or invalid
    if (isNaN(limit) || limit <= 0) {
      limit = 10; // デフォルトの行数
    }
    if (isNaN(offset) || offset < 0) {
      offset = 0; // デフォルトの開始行
    }

    console.log(`Fetching files with limit=${limit} and offset=${offset}, sort=${sort}`);

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

    // ORDER BY句の作成
    let orderByClause;
    let additionalWhereClause = '';
    
    if (sort === 'exif_datetime') {
      // Exif日時でソートする場合は、file_exif_public=trueのファイルのみをfile_exif_datetimeの降順でソート
      orderByClause = 'file_exif_datetime DESC NULLS LAST, file_createat DESC';
      // file_exif_publicがtrueのデータのみを対象とする追加のWHERE条件
      additionalWhereClause = 'AND file_exif_public = true AND file_exif_datetime IS NOT NULL';
    } else {
      // デフォルトは従来通り作成日時の降順
      orderByClause = 'file_createat DESC';
    }

    // SQLクエリの準備
    const query = `
      SELECT 
        file_id, user_id, file_size, file_format, file_attitude, file_createat, file_updateat,
        file_exif_public, file_exif_gps_public, file_exif_title,
        CASE 
          WHEN file_exif_public = true THEN 
            to_char(file_exif_datetime, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
          ELSE NULL 
        END AS file_exif_datetime,
        CASE 
          WHEN file_exif_public = true THEN file_exif_make 
          ELSE NULL 
        END AS file_exif_make,
        CASE 
          WHEN file_exif_public = true THEN file_exif_model 
          ELSE NULL 
        END AS file_exif_model,
        CASE 
          WHEN file_exif_public = true THEN file_exif_xresolution 
          ELSE NULL 
        END AS file_exif_xresolution,
        CASE 
          WHEN file_exif_public = true THEN file_exif_yresolution 
          ELSE NULL 
        END AS file_exif_yresolution,
        CASE 
          WHEN file_exif_public = true THEN file_exif_resolution_unit 
          ELSE NULL 
        END AS file_exif_resolution_unit,
        CASE 
          WHEN file_exif_public = true THEN file_exif_exposure_time 
          ELSE NULL 
        END AS file_exif_exposure_time,
        CASE 
          WHEN file_exif_public = true THEN file_exif_fnumber 
          ELSE NULL 
        END AS file_exif_fnumber,
        CASE 
          WHEN file_exif_public = true THEN file_exif_iso 
          ELSE NULL 
        END AS file_exif_iso,
        CASE 
          WHEN file_exif_public = true THEN file_exif_metering_mode 
          ELSE NULL 
        END AS file_exif_metering_mode,
        CASE 
          WHEN file_exif_public = true THEN file_exif_flash 
          ELSE NULL 
        END AS file_exif_flash,
        CASE 
          WHEN file_exif_public = true THEN file_exif_exposure_compensation 
          ELSE NULL 
        END AS file_exif_exposure_compensation,
        CASE 
          WHEN file_exif_public = true THEN file_exif_focal_length 
          ELSE NULL 
        END AS file_exif_focal_length,
        CASE 
          WHEN file_exif_public = true THEN file_exif_color_space 
          ELSE NULL 
        END AS file_exif_color_space,
        CASE 
          WHEN file_exif_public = true AND file_exif_gps_public = true THEN file_exif_gps_latitude 
          ELSE NULL 
        END AS file_exif_gps_latitude,
        CASE 
          WHEN file_exif_public = true AND file_exif_gps_public = true THEN file_exif_gps_longitude 
          ELSE NULL 
        END AS file_exif_gps_longitude,
        CASE 
          WHEN file_exif_public = true AND file_exif_gps_public = true THEN file_exif_gps_altitude 
          ELSE NULL 
        END AS file_exif_gps_altitude,
        CASE 
          WHEN file_exif_public = true AND file_exif_gps_public = true THEN file_exif_image_direction 
          ELSE NULL 
        END AS file_exif_image_direction
      FROM drive
      WHERE user_id = $1 ${additionalWhereClause}
      ORDER BY ${orderByClause}
      LIMIT $2 OFFSET $3;
    `;
    const values = [parsedSession.username, limit, offset];

    try {
      const result = await client.query(query, values);
      
      // MinIOからファイル一覧を取得
      const listObjectsResponse = await s3Client.send(new ListObjectsV2Command({
        Bucket: 'publicdata',
        MaxKeys: limit,
        StartAfter: offset > 0 ? result.rows[0].file_id : undefined
      }));

      // PostgreSQLの結果にMinIOの情報を追加
      const files = result.rows.map(file => {
        const minioFile = listObjectsResponse.Contents?.find(obj => obj.Key === file.file_id);
        return {
          ...file,
          minio_last_modified: minioFile?.LastModified,
          minio_size: minioFile?.Size
        };
      });

      return res.status(200).json({
        files,
        pagination: {
          limit,
          offset,
          count: files.length,
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
