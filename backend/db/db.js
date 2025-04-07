/**
 * データベース接続モジュール
 * 
 * PostgreSQLデータベースへの接続と操作を提供します
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// 環境変数からデータベース接続情報を取得
const { Pool } = pg;

// データベース接続プール
const pool = new Pool({
  user: process.env.POSTGRES_USER || 'myuser',
  host: process.env.POSTGRES_NAME || 'db-wallog',
  database: process.env.POSTGRES_DB || 'wallog',
  password: process.env.POSTGRES_PASSWORD || 'mypassword',
  port: 5432,
});

/**
 * SQLクエリを実行します
 * @param {string} text - SQLクエリ文
 * @param {Array} params - クエリパラメータ
 * @returns {Promise<pg.QueryResult>} クエリ結果
 */
export async function query(text, params) {
  const start = Date.now();
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    const duration = Date.now() - start;
    console.log('executed query', { text, duration, rows: result.rowCount });
    return result;
  } catch (error) {
    console.error('Query error:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * トランザクションを開始します
 * @returns {Promise<pg.PoolClient>} データベースクライアント
 */
export async function beginTransaction() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    return client;
  } catch (error) {
    client.release();
    throw error;
  }
}

/**
 * トランザクションをコミットします
 * @param {pg.PoolClient} client - データベースクライアント
 */
export async function commitTransaction(client) {
  try {
    await client.query('COMMIT');
  } catch (error) {
    throw error;
  } finally {
    client.release();
  }
}

/**
 * トランザクションをロールバックします
 * @param {pg.PoolClient} client - データベースクライアント
 */
export async function rollbackTransaction(client) {
  try {
    await client.query('ROLLBACK');
  } catch (error) {
    console.error('Rollback error:', error);
  } finally {
    client.release();
  }
}

/**
 * プールの終了処理を行います
 * プログラム終了時に呼び出す必要があります
 */
export async function closePool() {
  await pool.end();
}

export default {
  query,
  beginTransaction,
  commitTransaction,
  rollbackTransaction,
  closePool,
};