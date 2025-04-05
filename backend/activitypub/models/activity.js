/**
 * Activityモデル
 * 
 * ActivityPubのアクティビティ（投稿や操作）を管理するモデルです。
 * 送信したアクティビティの記録や取得機能を提供します。
 */


import pkg from 'pg';
const { Pool } = pkg;
import crypto from 'crypto';
import { getEnvDomain } from '../utils/helpers.js';

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
 * @param {string|number} localPostId - ローカルの投稿ID（日記や記事のID）
 * @returns {Promise<object>} - 保存されたアクティビティ
 */
export async function saveOutboxActivity(activity, actorId, localPostId = null) {
  try {
    console.log(`Saving outbox activity with localPostId: ${localPostId}`);
    
    if (localPostId) {
      // 投稿IDが実際にpostテーブルに存在するか確認
      const checkQuery = `
        SELECT post_id FROM post WHERE post_id = $1
      `;
      
      const checkResult = await pool.query(checkQuery, [localPostId]);
      
      if (checkResult.rows.length === 0) {
        console.warn(`Warning: Post ID ${localPostId} does not exist in the post table. Skipping local_post_id reference.`);
        localPostId = null; // 存在しない場合はnullを設定
      } else {
        console.log(`Post ID ${localPostId} exists in the database. Proceeding with save.`);
      }
    }
    
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
      localPostId // 文字列→数値変換を行わず、そのまま使用
    ];
    
    const result = await pool.query(query, values);
    return result.rows[0];
    
  } catch (error) {
    console.error('Error saving outbox activity:', error);
    throw error;
  }
}

/**
 * アクティビティをインボックスに保存します
 * @param {object} activityData - 保存するActivityPubアクティビティデータ
 * @returns {Promise<object>} - 保存されたアクティビティ
 */
export async function saveInboxActivity(activityData) {
  try {
    // ap_inboxテーブルが存在しない場合は作成
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS ap_inbox (
        id SERIAL PRIMARY KEY,
        activity_id TEXT NOT NULL,
        actor_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        object_id TEXT,
        data JSONB NOT NULL,
        actor_data JSONB,
        received_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    await pool.query(createTableQuery);
    
    // アクティビティを保存
    const query = `
      INSERT INTO ap_inbox (
        activity_id, actor_id, type, object_id, data, actor_data
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const values = [
      activityData.activity_id,
      activityData.actor_id,
      activityData.type,
      activityData.object_id,
      activityData.data,
      activityData.actor_data
    ];
    
    const result = await pool.query(query, values);
    return result.rows[0];
    
  } catch (error) {
    console.error('Error saving inbox activity:', error);
    throw error;
  }
}

/**
 * オブジェクトIDによってアクティビティを検索します
 * @param {string} objectId - 検索するオブジェクトID
 * @returns {Promise<object|null>} - 見つかったアクティビティまたはnull
 */
export async function findObjectById(objectId) {
  try {
    // まずOutboxで検索
    const outboxQuery = `
      SELECT * FROM ap_outbox 
      WHERE object_id = $1
      LIMIT 1
    `;
    
    const outboxResult = await pool.query(outboxQuery, [objectId]);
    
    if (outboxResult.rows.length > 0) {
      return {
        ...outboxResult.rows[0],
        source: 'outbox'
      };
    }
    
    // Outboxで見つからない場合はInboxで検索
    try {
      const inboxQuery = `
        SELECT * FROM ap_inbox
        WHERE object_id = $1
        LIMIT 1
      `;
      
      const inboxResult = await pool.query(inboxQuery, [objectId]);
      
      if (inboxResult.rows.length > 0) {
        return {
          ...inboxResult.rows[0],
          source: 'inbox'
        };
      }
    } catch (err) {
      // ap_inboxテーブルがまだ存在しない可能性があるので、エラーを無視
      console.log('Note: ap_inbox table might not exist yet');
    }
    
    return null;
    
  } catch (error) {
    console.error('Error finding object by ID:', error);
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
export async function getOutboxActivities(actorId, page, limit, countOnly = false) {
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
export function createNoteActivity(actorData, postData) {
  // 固定ドメインを使用する（getEnvDomainを呼び出すのではなく）
  const domain = 'wallog.seitendan.com';
  
  // actorDataからusernameを取得（undefinedの場合はデフォルト値を使用）
  const username = actorData.preferredUsername || actorData.username || 'admin';
  
  // URLを構築
  const actorUrl = `https://${domain}/users/${username}`;
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

  // 引用情報の処理
  let content = postData.content;
  
  // 引用情報がある場合は追加
  if (postData.quoteUrl) {
    // コンテンツに引用URLを追加（すでに引用情報が含まれている場合は追加しない）
    if (!content.includes(postData.quoteUrl)) {
      content = `${content}\n\n${postData.quoteUrl}`;
    }
  }
  
  // Noteオブジェクトの作成
  const noteObject = {
    id: objectId,
    type: 'Note',
    published: now,
    attributedTo: actorUrl,
    content: content,
    to: ['https://www.w3.org/ns/activitystreams#Public'],
    cc: [`${actorUrl}/followers`],
    attachment,
    tag: [...tags, ...mentions]
  };
  
  // 引用元の情報があれば追加
  if (postData.quoteOf) {
    noteObject.quoteOf = postData.quoteOf;
  }
  
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
export async function findActivityByLocalPostId(localPostId) {
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

/**
 * DeleteアクティビティをOutboxに保存し、フェデレーションネットワークに配信します
 * @param {number} localPostId - 削除する投稿のローカルID
 * @param {object} actorData - アクターデータ
 * @returns {Promise<boolean>} - 処理成功したかどうか
 */
export async function createAndDistributeDeleteActivity(localPostId) {
  try {
    // ローカル投稿IDに紐づくアクティビティを検索
    const activityRow = await findActivityByLocalPostId(localPostId);
    
    if (!activityRow) {
      console.log(`No ActivityPub activity found for local post ID: ${localPostId}`);
      return false;
    }
    
    // 元のActivityPubアクティビティを取得
    // データが文字列ならJSONパース、オブジェクトならそのまま使用
    const originalActivity = typeof activityRow.data === 'string' 
      ? JSON.parse(activityRow.data) 
      : activityRow.data;
    
    const originalObject = originalActivity.object;
    const actorId = activityRow.actor_id;
    
    // ap_actorsテーブルからactor情報を取得
    const actorQuery = `SELECT * FROM ap_actors WHERE id = $1`;
    const actorResult = await pool.query(actorQuery, [actorId]);
    
    if (actorResult.rows.length === 0) {
      console.error(`Actor not found for ID: ${actorId}`);
      return false;
    }
    
    const actorData = actorResult.rows[0];
    const domain = 'wallog.seitendan.com';
    const username = actorData.username;
    const actorUrl = `https://${domain}/users/${username}`;
    
    // Deleteアクティビティを作成
    const deleteActivity = {
      '@context': 'https://www.w3.org/ns/activitystreams',
      id: `https://${domain}/activities/${crypto.randomUUID()}`,
      type: 'Delete',
      actor: actorUrl,
      to: ['https://www.w3.org/ns/activitystreams#Public'],
      cc: [`${actorUrl}/followers`],
      object: typeof originalObject === 'string' ? originalObject : originalObject.id,
      published: new Date().toISOString()
    };
    
    // フォロワーにDeleteアクティビティを送信するための処理
    // フォロワー一覧を取得
    const followersQuery = `
      SELECT a.* 
      FROM ap_followers f
      JOIN ap_actors a ON f.follower_actor_id = a.id
      WHERE f.actor_id = $1
    `;
    const followersResult = await pool.query(followersQuery, [actorId]);
    const followers = followersResult.rows;
    
    // DeleteアクティビティをOutboxに保存
    await saveOutboxActivity(deleteActivity, actorId, localPostId);
    
    console.log(`Created Delete activity for post ID ${localPostId}`);
    console.log(`Found ${followers.length} followers to notify about deletion`);
    
    // 実際のフェデレーション処理を行う
    if (followers.length > 0) {
      // deliverToFollowers関数をインポート
      const { deliverToFollowers } = await import('../services/delivery.js');
      
      // ActivityPub形式のアクターオブジェクトを作成
      const formattedActor = {
        id: actorUrl,
        type: 'Person',
        preferredUsername: username,
        inbox: actorData.inbox_url,
        outbox: actorData.outbox_url,
        followers: actorData.followers_url,
        following: actorData.following_url,
        publicKey: {
          id: `${actorUrl}#main-key`,
          owner: actorUrl,
          publicKeyPem: actorData.public_key
        },
        private_key: actorData.private_key
      };
      
      // フォロワーにDeleteアクティビティを配信
      try {
        await deliverToFollowers(deleteActivity, formattedActor);
        console.log(`Delete activity for post ID ${localPostId} successfully distributed to followers`);
      } catch (deliveryError) {
        console.error(`Error distributing Delete activity to followers:`, deliveryError);
        // 配信エラーがあっても処理自体は成功とする
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error creating and distributing Delete activity:', error);
    return false;
  }
}

// 互換性のためにCommonJSスタイルのエクスポートも提供
export default {
  saveOutboxActivity,
  saveInboxActivity,
  getOutboxActivities,
  createNoteActivity,
  findActivityByLocalPostId,
  findObjectById,
  createAndDistributeDeleteActivity
};