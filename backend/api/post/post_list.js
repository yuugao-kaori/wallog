// post_list.js

import express from 'express';
import dotenv from 'dotenv';
import pkg from 'pg';
const { Client } = pkg;
import { fileURLToPath } from 'url';
import path from 'path';

// Initialize environment variables
dotenv.config();

const envFilePath = './.env';
dotenv.config({ path: envFilePath });

// ESM環境での__dirnameの代替
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create Express router
const router = express.Router();

/**
 * GET /post_list
 * 特定の post_id から始めて指定件数の投稿を返却する
 * クエリパラメータ:
 * - start_id: 開始するpost_id (任意)
 * - limit: 取得する行数（デフォルト: 10）
 */
router.get('/post_list', async (req, res) => {
    try {
        // クエリパラメータを取得
        const { start_id, limit } = req.query;
        const numericLimit = isNaN(parseInt(limit, 10)) ? 10 : parseInt(limit, 10);

        // 入力値のチェック
        if (numericLimit <= 0 || numericLimit > 100) {
            return res.status(400).json({ error: 'Limit must be between 1 and 100' });
        }

        const { POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB, POSTGRES_NAME } = process.env;

        const client = new Client({
            user: POSTGRES_USER,
            host: POSTGRES_NAME,
            database: POSTGRES_DB,
            password: POSTGRES_PASSWORD,
            port: 5432,
        });

        // クライアントを接続
        await client.connect();
        console.log('PostgreSQLに接続しました。');

        // SQLクエリの準備
        let query, values;

        // start_idが明示的にnullまたは未定義の場合のみ、最新の投稿から取得
        if (start_id === undefined || start_id === null || start_id === '') {
            query = `
                SELECT 
                    bp.*,
                    json_build_object(
                        'post_id', rp.post_id,
                        'user_id', rp.user_id,
                        'post_text', rp.post_text,
                        'post_createat', rp.post_createat,
                        'post_updateat', rp.post_updateat,
                        'post_tag', rp.post_tag,
                        'post_file', rp.post_file,
                        'post_attitude', rp.post_attitude
                    ) as repost_body,
                    json_build_object(
                        'post_id', reply.post_id,
                        'user_id', reply.user_id,
                        'post_text', reply.post_text,
                        'post_createat', reply.post_createat,
                        'post_updateat', reply.post_updateat,
                        'post_tag', reply.post_tag,
                        'post_file', reply.post_file,
                        'post_attitude', reply.post_attitude
                    ) as reply_body
                FROM (
                    SELECT *
                    FROM post
                    ORDER BY post_id DESC
                    LIMIT $1
                ) bp
                LEFT JOIN post rp ON bp.repost_grant_id = rp.post_id
                LEFT JOIN post reply ON bp.reply_grant_id = reply.post_id
                ORDER BY bp.post_id DESC;
            `;
            values = [numericLimit];
        } else {
            // start_idが指定されている場合
            const numericStartId = BigInt(start_id);

            if (numericStartId < 0) {
                return res.status(400).json({ error: 'Invalid start_id' });
            }

            query = `
                WITH base_posts AS (
                    SELECT post_id, user_id, post_text, post_createat, post_updateat, 
                           post_tag, post_file, post_attitude, repost_grant_id,
                           reply_grant_id, repost_receive_id, reply_receive_id
                    FROM post
                    WHERE post_id < $1  -- <= を < に変更
                    ORDER BY post_id DESC
                    LIMIT $2
                )
                SELECT 
                    bp.*,
                    json_build_object(
                        'post_id', rp.post_id,
                        'user_id', rp.user_id,
                        'post_text', rp.post_text,
                        'post_createat', rp.post_createat,
                        'post_updateat', rp.post_updateat,
                        'post_tag', rp.post_tag,
                        'post_file', rp.post_file,
                        'post_attitude', rp.post_attitude
                    ) as repost_body,
                    json_build_object(
                        'post_id', reply.post_id,
                        'user_id', reply.user_id,
                        'post_text', reply.post_text,
                        'post_createat', reply.post_createat,
                        'post_updateat', reply.post_updateat,
                        'post_tag', reply.post_tag,
                        'post_file', reply.post_file,
                        'post_attitude', reply.post_attitude
                    ) as reply_body
                FROM base_posts bp
                LEFT JOIN post rp ON bp.repost_grant_id = rp.post_id
                LEFT JOIN post reply ON bp.reply_grant_id = reply.post_id;
            `;
            values = [numericStartId, numericLimit];
        }

        try {
            const result = await client.query(query, values);
            console.log(`Retrieved ${result.rows.length} posts`);

            // 配列形式で直接データを返却
            return res.status(200).json(result.rows);
        } catch (dbError) {
            console.error('Database query error:', dbError);
            return res.status(500).json({ error: 'Database query failed' });
        } finally {
            await client.end();
            console.log('PostgreSQL connection closed');
        }
    } catch (error) {
        console.error('Internal server error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
