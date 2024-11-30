import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import fs from 'fs/promises';
import mime from 'mime-types';
import pkg from 'pg';
import dotenv from 'dotenv';
import sharp from 'sharp';

const { Client } = pkg;
dotenv.config();

const router = express.Router();

// __dirname を定義
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CORS の設定を詳細に指定し、セッションミドルウェアの前に配置
router.use(cors({
    origin: ['http://192.168.1.148:23000', 'https://wallog.seitendan.com'],
    methods: ['GET', 'POST', 'DELETE', 'PUT', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400
}));

// ファイルを返すエンドポイント
router.get('/file/:file_id', async (req, res) => {
    const fileId = req.params.file_id;

    // セ��ュリティ対策: fileIdにパス操作が含まれていないことを確認
    if (fileId.includes('..') || path.isAbsolute(fileId)) {
        return res.status(400).send('Invalid file ID');
    }

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
        
        // ファイル情報をDBから取得
        const query = 'SELECT file_format FROM drive WHERE file_id = $1';
        const result = await client.query(query, [fileId]);
        
        if (result.rows.length === 0) {
            return res.status(404).send('File not found in database');
        }

        const { file_format } = result.rows[0];
        const filePath = path.join(__dirname, '../../../app_data', fileId);
        
        // ファイルの存在確認
        await fs.access(filePath);
        
        // Content-Typeをfile_formatから判定
        let contentType;
        if (file_format) {
            contentType = mime.lookup(`.${file_format}`) || 'application/octet-stream';
        } else {
            contentType = mime.lookup(filePath) || 'application/octet-stream';
        }
        
        // キャッシュ制御のヘッダーを追加
        res.setHeader('Cache-Control', 'public, max-age=31536000');
        res.setHeader('Content-Type', contentType);
        res.setHeader('X-File-Format', file_format || 'unknown');
        
        // ファイルを読み込んでバッファとして送信
        const fileBuffer = await fs.readFile(filePath);
        res.send(fileBuffer);
        
    } catch (error) {
        console.error(error);
        res.status(404).send('File not found');
    } finally {
        await client.end();
    }
});

// ファイルをダウンロードするエンドポイント
router.get('/file_download/:file_id', async (req, res) => {
    const fileId = req.params.file_id;

    // セキュ���ティ対策: fileIdにパス操作が含まれていないことを確認
    if (fileId.includes('..') || path.isAbsolute(fileId)) {
        return res.status(400).send('Invalid file ID');
    }

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
        
        // ファイル情報をDBから取得
        const query = 'SELECT file_format FROM drive WHERE file_id = $1';
        const result = await client.query(query, [fileId]);
        
        if (result.rows.length === 0) {
            return res.status(404).send('File not found in database');
        }

        const { file_format } = result.rows[0];
        const filePath = path.join(__dirname, '../../../app_data', fileId);
        
        // ファイルの存在確認
        await fs.access(filePath);
        
        // Content-Typeをfile_formatから判定
        const contentType = mime.lookup(`.${file_format}`) || 'application/octet-stream';
        
        // ダウンロード用のヘッダーを設定
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${fileId}.${file_format}"`);
        
        // ファイルを読み込んでバッファとして送信
        const fileBuffer = await fs.readFile(filePath);
        res.send(fileBuffer);
        
    } catch (error) {
        console.error(error);
        res.status(404).send('File not found');
    } finally {
        await client.end();
    }
});

router.get('/file/:fileId/thumbnail', async (req, res) => {
  const fileId = req.params.fileId;
  const filePath = path.resolve(__dirname, `../../../app_data/${fileId}`);

  try {
    // ファイルの存在確認
    await fs.access(filePath);

    // ファイルを読み込む
    const fileBuffer = await fs.readFile(filePath);
    
    // 画像フォーマットを検出
    const image = sharp(fileBuffer);
    const metadata = await image.metadata();
    
    if (metadata.format && ['jpeg', 'png', 'webp', 'gif'].includes(metadata.format)) {
      // 画像の場合は圧縮して返す
      const thumbnail = await image
        .resize(300, 300, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: 60 })
        .toBuffer();

      res.setHeader('Content-Type', 'image/jpeg');
      res.send(thumbnail);
    } else {
      // 画像以外はそのまま返す
      res.setHeader('Content-Type', mime.lookup(filePath) || 'application/octet-stream');
      res.send(fileBuffer);
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(404).send('File not found');
  }
});

export default router;
