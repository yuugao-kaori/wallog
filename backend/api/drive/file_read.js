import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';

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
router.get('/file/:file_id', (req, res) => {
    const fileId = req.params.file_id;

    // セキュリティ対策: fileIdにパス操作が含まれていないことを確認
    if (fileId.includes('..') || path.isAbsolute(fileId)) {
        return res.status(400).send('Invalid file ID');
    }

    // ファイルのパスを構築
    const filePath = path.join(__dirname, '../../../app_data', fileId);

    // ファイルを送信
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error(err);
            res.status(err.status || 500).send('File not found');
        }
    });
});

export default router;
