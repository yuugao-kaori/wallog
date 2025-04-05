/**
 * Activityモデル
 * 
 * ActivityPubのアクティビティ（投稿や操作）を管理するモデルです。
 * 送信したアクティビティの記録や取得機能を提供します。
 */

const { Pool } = require('pg');
const crypto = require('crypto');
const { getEnvDomain } = require('../utils/helpers');

// PostgreSQL接続プール
const pool = new Pool({
  user: process.env.POSTGRES_USER,
  host: process.env.POSTGRES_NAME,
  database: process.env.POSTGRES_DB,
  password: process.env.POSTGRES_PASSWORD,
  port: 5432,
});

/**
 * アクティビティをOutboxに保存します
 * @param {object} activity - 保存するActivityPubアクティビティ
 * @param {number} actorId - 投稿者のアクターID
 * @param {string} localPostId - ローカルの投稿ID（日記や記事のID）
 * @returns {Promise<object>} - 保存されたアクティビティ
 */
async function saveOutboxActivity(activity, actorId, localPostId = null) {
  try {
    const query = `
      INSERT INTO ap_outbox (
        activity_id, actor_id, object_id, object_type,
        object_content, data, local_post_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    // オブジェクト情報を取得
    const object = activity.object || {};
    const objectId = object.id || null;
    const objectType = object.type || activity.type;
    const objectContent = object.content || null;
    
    const values = [
      activity.id,
      actorId,
      objectId,
      objectType,
      objectContent,
      JSON.stringify(activity),
      localPostId
    ];
    
    const result = await pool.query(query, values);
    return result.rows[0];
    
  } catch (error) {
    console.error('Error saving outbox activity:', error);
    throw error;
  }
}

/**
 * アクターのOutboxアクティビティを取得します
 * @param {number} actorId - アクターID
 * @param {number} page - ページ番号（0ベース）
 * @param {number} limit - 1ページあたりの件数
 * @param {boolean} countOnly - trueの場合、件数のみを返す
 * @returns {Promise<object>} - アクティビティ一覧とトータル件数
 */
async function getOutboxActivities(actorId, page, limit, countOnly = false) {
  try {
    if (countOnly) {
      const countQuery = `
        SELECT COUNT(*) as total
        FROM ap_outbox
        WHERE actor_id = $1
      `;
      
      const countResult = await pool.query(countQuery, [actorId]);
      return { totalItems: parseInt(countResult.rows[0].total) };
    }
    
    const query = `
      SELECT *
      FROM ap_outbox
      WHERE actor_id = $1
      ORDER BY published_at DESC
      LIMIT $2 OFFSET $3
    `;
    
    const offset = page * limit;
    const result = await pool.query(query, [actorId, limit, offset]);
    
    const countQuery = `
      SELECT COUNT(*) as total
      FROM ap_outbox
      WHERE actor_id = $1
    `;
    
    const countResult = await pool.query(countQuery, [actorId]);
    const totalItems = parseInt(countResult.rows[0].total);
    
    // データをActivityPub形式に変換して返す
    const items = result.rows.map(row => JSON.parse(row.data));
    
    return {
      items,
      totalItems
    };
    
  } catch (error) {
    console.error('Error getting outbox activities:', error);
    throw error;
  }
}

/**
 * Createアクティビティを作成します（投稿用）
 * @param {object} actorData - 投稿者のアクターデータ
 * @param {object} postData - 投稿データ
 * @returns {object} - 作成されたCreateアクティビティ
 */
function createNoteActivity(actorData, postData) {
  const domain = getEnvDomain();
  const actorUrl = `https://${domain}/users/${actorData.username}`;
  const now = new Date().toISOString();
  
  // オブジェクトIDの生成
  const objectUuid = crypto.randomUUID();
  const objectId = `https://${domain}/objects/${objectUuid}`;
  
  // タグの処理
  const tags = [];
  const mentions = [];
  
  if (postData.tags && Array.isArray(postData.tags)) {
    postData.tags.forEach(tag => {
      tags.push({
        type: 'Hashtag',
        href: `https://${domain}/tags/${tag}`,
        name: `#${tag}`
      });
    });
  }
  
  // 添付メディアの処理
  const attachment = [];
  if (postData.media && Array.isArray(postData.media)) {
    postData.media.forEach(media => {
      attachment.push({
        type: 'Document',
        mediaType: media.mime_type,
        url: media.url,
        name: media.description || ''
      });
    });
  }
  
  // Noteオブジェクトの作成
  const noteObject = {
    id: objectId,
    type: 'Note',
    published: now,
    attributedTo: actorUrl,
    content: postData.content,
    to: ['https://www.w3.org/ns/activitystreams#Public'],
    cc: [`${actorUrl}/followers`],
    attachment,
    tag: [...tags, ...mentions]
  };
  
  // タイトルがある場合は追加（ブログ記事など）
  if (postData.title) {
    noteObject.name = postData.title;
  }
  
  // URLがある場合は追加
  if (postData.url) {
    noteObject.url = postData.url;
  }
  
  // Createアクティビティの作成
  const createActivity = {
    '@context': 'https://www.w3.org/ns/activitystreams',
    id: `https://${domain}/activities/${crypto.randomUUID()}`,
    type: 'Create',
    actor: actorUrl,
    published: now,
    to: ['https://www.w3.org/ns/activitystreams#Public'],
    cc: [`${actorUrl}/followers`],
    object: noteObject
  };
  
  return createActivity;
}

/**
 * ローカル投稿に対応するアクティビティを探します
 * @param {string} localPostId - ローカルの投稿ID
 * @returns {Promise<object|null>} - 見つかったアクティビティまたはnull
 */
async function findActivityByLocalPostId(localPostId) {
  try {
    const query = `
      SELECT * FROM ap_outbox
      WHERE local_post_id = $1
    `;
    
    const result = await pool.query(query, [localPostId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return result.rows[0];
    
  } catch (error) {
    console.error('Error finding activity by local post ID:', error);
    throw error;
  }
}

module.exports = {
  saveOutboxActivity,
  getOutboxActivities,
  createNoteActivity,
  findActivityByLocalPostId
};