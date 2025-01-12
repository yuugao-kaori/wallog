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

    const query = `
        WITH base_post AS (
            SELECT post_id, user_id, post_text, post_createat, post_updateat, 
                   post_tag, post_file, post_attitude, repost_grant_id,
                   reply_grant_id, repost_receive_id, reply_receive_id
            FROM post 
            WHERE post_id = $1
        )
        SELECT 
            bp.*,
            json_build_object(
                'post_id', rp.post_id,
                'user_id', rp.user_id,
                'post_text', rp.post_text,
                'post_createat', rp.post_createat AT TIME ZONE 'UTC',
                'post_updateat', rp.post_updateat AT TIME ZONE 'UTC',
                'post_tag', rp.post_tag,
                'post_file', rp.post_file,
                'post_attitude', rp.post_attitude
            ) as repost_body,
            json_build_object(
                'post_id', reply.post_id,
                'user_id', reply.user_id,
                'post_text', reply.post_text,
                'post_createat', reply.post_createat AT TIME ZONE 'UTC',
                'post_updateat', reply.post_updateat AT TIME ZONE 'UTC',
                'post_tag', reply.post_tag,
                'post_file', reply.post_file,
                'post_attitude', reply.post_attitude
            ) as reply_body
        FROM base_post bp
        LEFT JOIN post rp ON bp.repost_grant_id = rp.post_id
        LEFT JOIN post reply ON bp.reply_grant_id = reply.post_id;
    `;
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
            const post = result.rows[0];
            // post_fileが{""}の場合は削除
            if (post.post_file === '{""}') {
                delete post.post_file;
            }
            
            console.log(`Post with post_id ${postId} read successfully.`);
            return res.status(200).json({ message: 'Post read successfully', readed_post: post });
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
