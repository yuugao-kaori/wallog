import express from 'express'; 
import session from 'express-session'; 
import Redis from "ioredis"; 
import RedisStore from "connect-redis"; 
import path from 'path'; 
import { fileURLToPath } from 'url'; 
import fs from 'fs/promises'; // fsのpromise版を使用 
import dotenv from 'dotenv'; 
import pkg from 'pg'; 
const { Client } = pkg; 
import cors from 'cors'; 
const router = express.Router(); 
console.log('file_delete:wakeup!'); 

// ESM環境での__dirnameの代替 
const __filename = fileURLToPath(import.meta.url); 
const __dirname = path.dirname(__filename); 

// CORS の設定を詳細に指定し、セッションミドルウェアの前に配置
router.use(cors({
  origin: 'http://192.168.1.148:23000', // フロントエンドのオリジンに置き換え
  methods: ['GET', 'POST', 'DELETE', 'PUT', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

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
      sameSite: 'lax', // 必要に応じて'strict'や'none'に変更
    }, 
    rolling: true, 
  }) 
); 

// 環境変数の読み取り実装 
const envFilePath = './.env'; 
dotenv.config({ path: envFilePath }); // dotenvを使用して環境変数を読み込み 

/** 
 * データベースから指定された file_id のレコードを削除します。 
 * @param {string} file_id - 削除するファイルのID 
 * @returns {Promise<void>} 
 */ 
async function deleteFileRecord(file_id) { 
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

    const query = `DELETE FROM drive WHERE file_id = $1 RETURNING *;`; 
    const values = [file_id]; 

    const result = await client.query(query, values); 
    if (result.rowCount === 0) { 
      throw new Error('指定されたfile_idのレコードが見つかりませんでした。'); 
    } 

    console.log(`File record with file_id=${file_id} deleted:`, result.rows[0]); 
  } catch (err) { 
    throw err; 
  } finally { 
    await client.end(); 
  } 
} 

/** 
 * 指定された file_id のファイルを削除します。 
 * @param {string} file_id - 削除するファイルのID 
 * @returns {Promise<void>} 
 */ 
async function deleteFileFromDisk(file_id) { 
  const filePath = path.resolve(__dirname, '../../../app_data', file_id); 

  try { 
    await fs.unlink(filePath); 
    console.log(`File ${filePath} deleted successfully.`); 
  } catch (err) { 
    if (err.code === 'ENOENT') { 
      console.warn(`File ${filePath} does not exist.`); 
    } else { 
      throw err; 
    } 
  } 
} 

/** 
 * file_delete エンドポイントのハンドラー 
 */ 
router.post('/file_delete', async (req, res) => { 
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

    const { file_id } = req.body; 

    if (!file_id) { 
      return res.status(400).json({ error: 'file_id is required' }); 
    } 

    // ここで必要に応じてユーザーがファイルを所有しているか確認できます 
    // 例: 
    // const ownsFile = await checkUserOwnsFile(parsedSession.username, file_id); 
    // if (!ownsFile) { 
    //   return res.status(403).json({ error: 'You do not have permission to delete this file' }); 
    // } 

    // ファイルを削除 
    await deleteFileFromDisk(file_id); 

    // データベースからレコードを削除 
    await deleteFileRecord(file_id); 

    return res.status(200).json({ message: 'File deleted successfully' }); 

  } catch (error) { 
    console.error('Error during file deletion:', error); 
    return res.status(500).json({ error: error.message || 'Internal server error' }); 
  } 
}); 

export default router;
