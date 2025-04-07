/**
 * Outboxモデル
 * 
 * ActivityPubのOutbox（送信済みアクティビティ）を管理するモデルです。
 * Outboxのアクティビティの検索や取得機能を提供します。
 */

import pkg from 'pg';
const { Pool } = pkg;

// PostgreSQL接続プール
const pool = new Pool({
  user: process.env.POSTGRES_USER,
  host: process.env.POSTGRES_NAME,
  database: process.env.POSTGRES_DB,
  password: process.env.POSTGRES_PASSWORD,
  port: 5432,
});

/**
 * ローカル投稿IDに対応するアクティビティを検索します
 * @param {string|number} localPostId - ローカルの投稿ID
 * @returns {Promise<object|null>} - 見つかったアクティビティまたはnull
 */
export async function findActivityByLocalPostId(localPostId) {
  try {
    console.log(`Searching for ActivityPub activity with localPostId: ${localPostId}`);
    
    const query = `
      SELECT * FROM ap_outbox
      WHERE local_post_id = $1
      ORDER BY published_at DESC
      LIMIT 1
    `;
    
    const result = await pool.query(query, [localPostId]);
    
    if (result.rows.length === 0) {
      console.log(`No ActivityPub activity found for local post ID: ${localPostId}`);
      return null;
    }
    
    console.log(`Found ActivityPub activity for local post ID: ${localPostId}`);
    return result.rows[0];
    
  } catch (error) {
    console.error('Error finding activity by local post ID:', error);
    return null;
  }
}

/**
 * アクターIDに基づいてOutboxアクティビティのリストを取得します
 * @param {number} actorId - アクターID
 * @param {number} page - ページ番号
 * @param {number} limit - 1ページあたりの件数
 * @returns {Promise<Array>} - アクティビティの配列
 */
export async function getOutboxActivities(actorId, page = 0, limit = 20) {
  try {
    const query = `
      SELECT * FROM ap_outbox
      WHERE actor_id = $1
      ORDER BY published_at DESC
      LIMIT $2 OFFSET $3
    `;
    
    const offset = page * limit;
    const result = await pool.query(query, [actorId, limit, offset]);
    
    return result.rows;
    
  } catch (error) {
    console.error('Error getting outbox activities:', error);
    return [];
  }
}

/**
 * オブジェクトIDによるアクティビティの検索
 * @param {string} objectId - 検索対象のオブジェクトID
 * @returns {Promise<object|null>} - 見つかったアクティビティまたはnull
 */
export async function findActivityByObjectId(objectId) {
  try {
    const query = `
      SELECT * FROM ap_outbox
      WHERE object_id = $1
    `;
    
    const result = await pool.query(query, [objectId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return result.rows[0];
    
  } catch (error) {
    console.error('Error finding activity by object ID:', error);
    return null;
  }
}

/**
 * アクティビティIDによるアクティビティの検索
 * @param {string} activityId - 検索対象のアクティビティID
 * @returns {Promise<object|null>} - 見つかったアクティビティまたはnull
 */
export async function findActivityById(activityId) {
  try {
    const query = `
      SELECT * FROM ap_outbox
      WHERE activity_id = $1
    `;
    
    const result = await pool.query(query, [activityId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return result.rows[0];
    
  } catch (error) {
    console.error('Error finding activity by ID:', error);
    return null;
  }
}

export default {
  findActivityByLocalPostId,
  getOutboxActivities,
  findActivityByObjectId,
  findActivityById
};