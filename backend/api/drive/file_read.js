import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import mime from 'mime-types';
import pkg from 'pg';
import dotenv from 'dotenv';
import sharp from 'sharp';
import { S3Client, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

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

// ファイルを返すエンドポイント
router.get('/file/:file_id', async (req, res) => {
    const fileId = req.params.file_id;

    // セキュリティ対策: fileIdにパス操作が含まれていないことを確認
    if (fileId.includes('..') || path.isAbsolute(fileId)) {
        return res.status(400).send('Invalid file ID');
    }

    // サイトカードのサムネイルの場合は直接返す
    if (fileId.startsWith('thumbnail-card-') || fileId.startsWith('thumbnail-')) {
        try {
            // オブジェクトのメタデータを取得
            const metadata = await getObjectMetadata('publicdata', fileId);
            
            // 拡張子からContent-Typeを推測
            let contentType;
            if (fileId.includes('.')) {
                const extension = fileId.substring(fileId.lastIndexOf('.') + 1).toLowerCase();
                contentType = mime.lookup(extension) || metadata?.contentType || 'image/png';
            } else {
                contentType = metadata?.contentType || 'image/png'; // デフォルトはpng
            }

            const command = new GetObjectCommand({
                Bucket: 'publicdata',
                Key: fileId,
            });

            const s3Response = await s3Client.send(command);
            
            // ヘッダーを設定してストリームを直接返す
            res.setHeader('Cache-Control', 'public, max-age=31536000');
            res.setHeader('Content-Type', contentType);
            s3Response.Body.pipe(res);
            return;
        } catch (error) {
            console.error('Error fetching thumbnail:', error);
            return res.status(404).send('Thumbnail not found');
        }
    }

    // 通常のファイルの処理（既存のコード）
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
        
        // MinIOからファイルを取得
        const command = new GetObjectCommand({
            Bucket: 'publicdata',
            Key: fileId,
        });

        const s3Response = await s3Client.send(command);
        
        // Content-Typeをfile_formatから判定
        let contentType = 'application/octet-stream';
        if (file_format === 'webp') {
            contentType = 'image/webp';
        } else {
            contentType = mime.lookup(`.${file_format}`) || 'application/octet-stream';
        }
        res.setHeader('Cache-Control', 'public, max-age=31536000');
        res.setHeader('Content-Type', contentType);
        res.setHeader('X-File-Format', file_format || 'unknown');

        // ストリーミングでファイルを送信
        s3Response.Body.pipe(res);
        
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
        
        // MinIOからファイルを取得
        const command = new GetObjectCommand({
            Bucket: 'publicdata',
            Key: fileId,
        });

        const s3Response = await s3Client.send(command);
        
        // Content-Typeをfile_formatから判定
        let contentType = 'application/octet-stream';
        if (file_format === 'webp') {
            contentType = 'image/webp';
        } else {
            contentType = mime.lookup(`.${file_format}`) || 'application/octet-stream';
        }
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${fileId}.${file_format}"`);

        // ストリーミングでファイルを送信
        s3Response.Body.pipe(res);
        
    } catch (error) {
        console.error(error);
        res.status(404).send('File not found');
    } finally {
        await client.end();
    }
});

// MinIOからオブジェクトのメタデータを取得する関数
async function getObjectMetadata(bucket, key) {
    try {
        const command = new HeadObjectCommand({
            Bucket: bucket,
            Key: key
        });
        const response = await s3Client.send(command);
        return {
            contentType: response.ContentType,
            lastModified: response.LastModified,
            contentLength: response.ContentLength,
            metadata: response.Metadata
        };
    } catch (error) {
        console.error(`Error getting metadata for ${key}:`, error);
        return null;
    }
}

router.get('/file/:fileId/thumbnail', async (req, res) => {
    const fileId = req.params.fileId;

    try {
        // サイトカードのサムネイルの場合は直接返す（パターンマッチング）
        if (fileId.startsWith('thumbnail-card-') || fileId.startsWith('thumbnail-')) {
            // 拡張子からContent-Typeを推測
            let contentType;
            if (fileId.includes('.')) {
                const extension = fileId.substring(fileId.lastIndexOf('.') + 1).toLowerCase();
                contentType = mime.lookup(extension) || 'image/png';
            } else {
                // まずオブジェクトのメタデータを取得して、ContentTypeを確認
                const metadata = await getObjectMetadata('publicdata', fileId);
                contentType = metadata?.contentType || 'image/png'; // デフォルトはpng
            }

            const command = new GetObjectCommand({
                Bucket: 'publicdata',
                Key: fileId,
            });

            const s3Response = await s3Client.send(command);
            
            // ストリームを直接返す
            res.setHeader('Cache-Control', 'public, max-age=31536000');
            res.setHeader('Content-Type', contentType);
            s3Response.Body.pipe(res);
            return;
        }

        // 以下は通常のファイルの処理
        const command = new GetObjectCommand({
            Bucket: 'publicdata',
            Key: fileId,
        });

        const s3Response = await s3Client.send(command);
        
        // ストリームをバッファに変換
        const chunks = [];
        for await (const chunk of s3Response.Body) {
            chunks.push(chunk);
        }
        const fileBuffer = Buffer.concat(chunks);
        
        // 画像フォーマットを検出
        try {
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

                res.setHeader('Cache-Control', 'public, max-age=31536000');
                res.setHeader('Content-Type', 'image/jpeg');
                res.send(thumbnail);
            } else {
                // 画像以外はそのまま返す
                res.setHeader('Cache-Control', 'public, max-age=31536000');
                res.setHeader('Content-Type', mime.lookup(fileId) || 'application/octet-stream');
                res.send(fileBuffer);
            }
        } catch (imageError) {
            // sharp処理に失敗した場合はそのままファイルを返す
            console.error('Image processing error:', imageError);
            res.setHeader('Cache-Control', 'public, max-age=31536000');
            res.setHeader('Content-Type', mime.lookup(fileId) || 'application/octet-stream');
            res.send(fileBuffer);
        }
    } catch (error) {
        console.error('Error:', error);
        res.status(404).send('File not found');
    }
});

export default router;
