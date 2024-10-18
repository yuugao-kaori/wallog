import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';

const router = express.Router();

// __dirname を定義
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CORS を全てのオリジンから許可
router.use(cors());

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
