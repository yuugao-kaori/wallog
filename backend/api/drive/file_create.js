import express from 'express';
import session from 'express-session';
import Redis from "ioredis";
import RedisStore from "connect-redis";
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

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

// ストレージの設定
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.resolve(__dirname, '../../app_data');
    // ディレクトリが存在しない場合は作成
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// ファイルアップロード処理
const fileCreateHandler = (req, res) => {
  upload.single('file')(req, res, function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    return res.status(200).json({
      message: 'File uploaded successfully',
      filePath: req.file.path
    });
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
    fileCreateHandler(req, res);
  } catch (error) {
    console.error('Error while retrieving session from Redis:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;