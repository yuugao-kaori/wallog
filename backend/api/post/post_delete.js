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

// post_idの削除API
app.delete('/post_delete', async (req, res) => {
    const postId = req.body.post_id; // リクエストボディからpost_idを取得

    if (!postId) {
        return res.status(400).json({ error: 'post_id is required' });
    }

    // 削除クエリ
    const deletePostTagsQuery = 'DELETE FROM posts_post_tags WHERE post_id = $1;';
    const deletePostQuery = 'DELETE FROM post WHERE post_id = $1 RETURNING *;';
    const values = [postId];

    // 新しいClientインスタンスを作成
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

        // トランザクション開始
        await client.query('BEGIN');

        // まず posts_post_tags から関連レコードを削除
        await client.query(deletePostTagsQuery, values);
        console.log(`posts_post_tags から post_id ${postId} の関連レコードを削除しました。`);

        // 次に post テーブルからレコードを削除
        const result = await client.query(deletePostQuery, values);
        if (result.rowCount > 0) {
            console.log(`Post with post_id ${postId} deleted.`);
            // トランザクションコミット
            await client.query('COMMIT');
            return res.status(200).json({ message: 'Post deleted successfully', deleted_post: result.rows[0] });
        } else {
            // トランザクションロールバック
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Post not found' });
        }
    } catch (err) {
        // エラー発生時はトランザクションをロールバック
        await client.query('ROLLBACK');
        console.error('Error:', err);
        return res.status(500).json({ error: 'Failed to delete post' });
    } finally {
        await client.end();
    }
});

export default app;
