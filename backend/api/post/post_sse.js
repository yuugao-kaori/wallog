import express from 'express';
import dotenv from 'dotenv';
import pkg from 'pg';
const { Client } = pkg;

dotenv.config();

const { POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB, POSTGRES_NAME } = process.env;

const client = new Client({
    user: POSTGRES_USER,
    host: POSTGRES_NAME,
    database: POSTGRES_DB,
    password: POSTGRES_PASSWORD,
    port: 5432,
});

client.connect().then(() => {
    console.log('PostgreSQLに接続しました');
}).catch(err => {
    console.error('データベース接続エラー:', err);
});

const router = express.Router();

const getNewPosts = async () => {
    const query = `
      SELECT post_id, user_id, post_text, post_createat, post_updateat, post_tag, post_file, post_attitude
      FROM post 
      ORDER BY post_createat DESC 
      LIMIT 1
    `;
    const res = await client.query(query);
    return res.rows.map(post => {
        if (post.post_file === '{""}') {
            delete post.post_file;
        }
        return {
            ...post,
            created_at: post.post_createat,
            post_createat: undefined, // 不要なキーを削除
        };
    });
};

router.get('/post_sse', async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    console.log('新しいSSE接続が確立されました');

    const listener = async (notification) => {
        if (notification.channel === 'post_updates') {
            const newPosts = await getNewPosts();
            res.write(`data: ${JSON.stringify(newPosts)}\n\n`);
        }
    };

    client.on('notification', listener);
    await client.query('LISTEN post_updates');

    req.on('close', () => {
        console.log('SSE接続が閉じられました');
        client.removeListener('notification', listener);
        res.end();
    });
});

export default router;
