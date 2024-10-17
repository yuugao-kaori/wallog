import express from 'express';
import session from 'express-session';
import Redis from "ioredis";
import RedisStore from "connect-redis";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import pkg from 'pg';
const { Client } = pkg;
import cors  from 'cors';
const router = express.Router();
const app = express();

app.use(express.json()); // JSONリクエストボディを解析するミドルウェア

// 環境変数の読み取り
const envFilePath = './.env';
if (fs.existsSync(envFilePath)) {
    dotenv.config();
    console.log('.envファイルを認識しました。');
}

const { POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB, POSTGRES_NAME } = process.env;

// PostgreSQLクライアント設定
const client = new Client({
    user: POSTGRES_USER,
    host: POSTGRES_NAME,
    database: POSTGRES_DB,
    password: POSTGRES_PASSWORD,
    port: 5432,
});
// post_idの読み込みAPI
app.post('/post_read', async (req, res) => {
    const postId = req.body.post_id;

    if (!postId) {
        return res.status(400).json({ error: 'post_id is required' });
    }

    const query = 'SELECT * FROM post WHERE post_id = $1;';
    const values = [postId];

    // 新しいクライアントインスタンスを作成
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

        const result = await client.query(query, values);
        if (result.rowCount > 0) {
            console.log(`Post with post_id ${postId} read successfully.`);
            return res.status(200).json({ message: 'Post read successfully', readed_post: result.rows[0] });
        } else {
            return res.status(404).json({ error: 'Post not found' });
        }
    } catch (err) {
        console.error('Error:', err);
        return res.status(500).json({ error: 'Failed to read post' });
    } finally {
        await client.end(); // クライアントを閉じる
    }
});

export default app;
