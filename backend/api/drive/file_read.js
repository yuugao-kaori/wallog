import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import fs from 'fs/promises';
import mime from 'mime-types';
import pkg from 'pg';
import dotenv from 'dotenv';

const { Client } = pkg;
dotenv.config();

const router = express.Router();

// __dirname を定義
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CORS の設定を詳細に指定し、セッションミドルウェアの前に配置
router.use(cors({
    origin: 'http://192.168.1.148:23000', // フロントエンドのオリジンに置き換え
    methods: ['GET', 'POST', 'DELETE', 'PUT', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  }));

// ファイルを返すエンドポイント
router.get('/file/:file_id', async (req, res) => {
    const fileId = req.params.file_id;

    // セキュリティ対策: fileIdにパス操作が含まれていないことを確認
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
        
        // ヘッダーを設定
        res.setHeader('Content-Type', contentType);
        res.setHeader('X-File-Format', file_format || 'unknown');
        
        // ファイルを送信
        res.sendFile(filePath, (err) => {
            if (err) {
                console.error(err);
                res.status(err.status || 500).send('File not found');
            }
        });
    } catch (error) {
        console.error(error);
        res.status(404).send('File not found');
    } finally {
        await client.end();
    }
});

export default router;
