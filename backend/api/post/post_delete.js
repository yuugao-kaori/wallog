import express from 'express';
import session from 'express-session';
import Redis from "ioredis";
import RedisStore from "connect-redis";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import pkg from 'pg';
import { Client as ESClient } from '@elastic/elasticsearch';
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

// ElasticSearchクライアントの初期化
const esClient = new ESClient({
    node: `http://${process.env.ELASTICSEARCH_HOST}:${process.env.ELASTICSEARCH_PORT}`,
    auth: {
        username: process.env.ELASTICSEARCH_USER,
        password: process.env.ELASTICSEARCH_PASSWORD,
    },
    maxRetries: 5,
    requestTimeout: 60000,
    sniffOnStart: true,
    ssl: {
        rejectUnauthorized: false,
    },
});

// post_idの削除API
app.delete('/post_delete', async (req, res) => {
    const postId = req.body.post_id; // リクエストボディからpost_idを取得

    if (!postId) {
        return res.status(400).json({ error: 'post_id is required' });
    }

    // 削除クエリ
    const deletePostTagsQuery = 'DELETE FROM posts_post_tags WHERE post_id = $1;';
    // 投稿の取得クエリ
    const getPostQuery = 'SELECT repost_grant_id, reply_grant_id FROM post WHERE post_id = $1;';
    // repost_receive_idの更新クエリ
    const updateRepostReceiveQuery = `
        UPDATE post 
        SET repost_receive_id = array_remove(repost_receive_id, $1) 
        WHERE post_id = $2;
    `;
    // reply_receive_idの更新クエリ
    const updateReplyReceiveQuery = `
        UPDATE post 
        SET reply_receive_id = array_remove(reply_receive_id, $1) 
        WHERE post_id = $2;
    `;
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

        // 削除対象の投稿情報を取得
        const postResult = await client.query(getPostQuery, values);
        if (postResult.rowCount > 0) {
            const { repost_grant_id, reply_grant_id } = postResult.rows[0];

            // repost_receive_idの更新
            if (repost_grant_id) {
                await client.query(updateRepostReceiveQuery, [postId, repost_grant_id]);
                console.log(`Updated repost_receive_id for post ${repost_grant_id}`);
            }

            // reply_receive_idの更新
            if (reply_grant_id) {
                await client.query(updateReplyReceiveQuery, [postId, reply_grant_id]);
                console.log(`Updated reply_receive_id for post ${reply_grant_id}`);
            }
        }

        // まず posts_post_tags から関連レコードを削除
        await client.query(deletePostTagsQuery, values);
        console.log(`posts_post_tags から post_id ${postId} の関連レコードを削除しました。`);

        // 次に post テーブルからレコードを削除
        const result = await client.query(deletePostQuery, values);
        if (result.rowCount > 0) {
            console.log(`Post with post_id ${postId} deleted from PostgreSQL.`);
            
            // ElasticSearchからも削除
            try {
                await esClient.delete({
                    index: 'post',
                    id: postId
                });
                console.log(`Post with post_id ${postId} deleted from Elasticsearch.`);
            } catch (esError) {
                console.error('Elasticsearch deletion error:', esError);
                // ElasticSearchの削除に失敗してもトランザクションは続行
            }

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

// アプリ終了時にElasticSearchクライアントを閉じる
process.on('exit', async () => {
    await esClient.close();
    console.log('Elasticsearchクライアントが正常に終了しました。');
});

export default app;
