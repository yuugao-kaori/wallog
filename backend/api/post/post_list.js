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

        if (start_id === undefined || start_id === '' || isNaN(start_id)) {
            // start_idが存在しない場合: テーブルの最上部からデータを取得
            query = `
                SELECT post_id, user_id, post_text, post_createat, post_updateat, 
                       post_tag, post_file, post_attitude, repost_grant_id,
                       reply_grant_id, repost_receive_id, reply_receive_id
                FROM post
                ORDER BY post_id DESC
                LIMIT $1;
            `;
            values = [numericLimit];
        } else {
            // start_idが存在する場合: start_idからデータを取得
            const numericStartId = BigInt(start_id); // 数値型の変換にBigIntを使用

            if (numericStartId < 0) {
                return res.status(400).json({ error: 'Invalid start_id' });
            }

            query = `
                SELECT post_id, user_id, post_text, post_createat, post_updateat, 
                       post_tag, post_file, post_attitude, repost_grant_id,
                       reply_grant_id, repost_receive_id, reply_receive_id
                FROM post
                WHERE post_id <= $1
                ORDER BY post_id DESC
                LIMIT $2;
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
