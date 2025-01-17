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
    console.log('新しいポストを取得しています...');
    const query = `
        WITH base_posts AS (
            SELECT post_id, user_id, post_text, post_createat, post_updateat, 
                   post_tag, post_file, post_attitude, repost_grant_id,
                   reply_grant_id, repost_receive_id, reply_receive_id
            FROM post 
            ORDER BY post_createat DESC 
            LIMIT 1
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
        FROM base_posts bp
        LEFT JOIN post rp ON bp.repost_grant_id = rp.post_id
        LEFT JOIN post reply ON bp.reply_grant_id = reply.post_id;
    `;
    const res = await client.query(query);
    console.log(`${res.rows.length}件の新しいポストをDBから取得しました`);
    return res.rows.map(post => {
        if (post.post_file === '{""}') {
            delete post.post_file;
        }
        return post;
    });
};

router.get('/post_sse', async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    console.log('新しいSSE接続が確立されました');

    // キープアライブの間隔を設定（45秒）
    const keepAliveInterval = setInterval(() => {
        res.write(':keepalive\n\n');
    }, 45000);

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
        clearInterval(keepAliveInterval);
        client.removeListener('notification', listener);
        res.end();
    });
});

export default router;