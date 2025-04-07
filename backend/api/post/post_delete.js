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
// ActivityPubの機能をインポート
import { createAndDistributeDeleteActivity } from '../../activitypub/models/activity.js';
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
    const startTime = Date.now(); // 開始時間を記録
    const postId = req.body.post_id; // リクエストボディからpost_idを取得

    if (!postId) {
        const endTime = Date.now();
        console.log(`実行時間: ${endTime - startTime}ms - Invalid request (no post_id)`);
        return res.status(400).json({ error: 'post_id is required' });
    }

    // 削除クエリ
    const deletePostTagsQuery = 'DELETE FROM posts_post_tags WHERE post_id = $1;';
    // ap_outboxから関連レコードを削除するクエリを追加
    const deleteApOutboxQuery = 'DELETE FROM ap_outbox WHERE local_post_id = $1;';
    // 投稿の取得クエリ - local_post_idを正しいカラム名に修正または除外
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

            // ActivityPubでの削除処理 - エラーを捕捉して処理を続行
            try {
                // ActivityPub削除アクティビティを作成・配信
                // local_post_idが存在しない場合のエラーを避けるため、直接post_idを使用
                const deleteResult = await createAndDistributeDeleteActivity(postId);
                if (deleteResult) {
                    console.log(`ActivityPub delete activity created for post ${postId}`);
                } else {
                    console.log(`No ActivityPub delete activity needed for post ${postId}`);
                }
            } catch (apError) {
                console.error('ActivityPub delete error:', apError);
                // ActivityPubの処理に失敗しても削除処理は続行
            }

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

        // まず ap_outbox から関連レコードを削除
        await client.query(deleteApOutboxQuery, values);
        console.log(`ap_outbox から post_id ${postId} の関連レコードを削除しました。`);

        // 次に posts_post_tags から関連レコードを削除
        await client.query(deletePostTagsQuery, values);
        console.log(`posts_post_tags から post_id ${postId} の関連レコードを削除しました。`);

        // 最後に post テーブルからレコードを削除
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
            const endTime = Date.now();
            console.log(`実行時間: ${endTime - startTime}ms - Successfully deleted post ${postId}`);
            return res.status(200).json({ message: 'Post deleted successfully', deleted_post: result.rows[0] });
        } else {
            // トランザクションロールバック
            await client.query('ROLLBACK');
            const endTime = Date.now();
            console.log(`実行時間: ${endTime - startTime}ms - Post ${postId} not found`);
            return res.status(404).json({ error: 'Post not found' });
        }
    } catch (err) {
        // エラー発生時はトランザクションをロールバック
        await client.query('ROLLBACK');
        console.error('Error:', err);
        const endTime = Date.now();
        console.log(`実行時間: ${endTime - startTime}ms - Error deleting post ${postId}`);
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
