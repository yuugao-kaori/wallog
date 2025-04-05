/**
 * Outboxコントローラー
 * 
 * ActivityPubのOutbox処理を担当するコントローラーです。
 * ローカルユーザーの投稿情報を外部に提供します。
 */

import { findActorByUsername } from '../models/actor.js';
import { getOutboxActivities } from '../models/activity.js';
import { getEnvDomain } from '../utils/helpers.js';
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
 * アクターのデータベースIDを取得
 * @param {string} username - ユーザー名
 * @param {string} domain - ドメイン名
 * @returns {Promise<number|null>} - アクターのデータベースID
 */
async function getActorDatabaseId(username, domain = null) {
  try {
    const domainToUse = domain || getEnvDomain();
    const query = `
      SELECT id FROM ap_actors WHERE username = $1 AND domain = $2
    `;
    const result = await pool.query(query, [username, domainToUse]);
    
    if (result.rows.length > 0) {
      return parseInt(result.rows[0].id);
    }
    return null;
  } catch (error) {
    console.error('Error getting actor database ID:', error);
    return null;
  }
}

/**
 * ユーザーのOutboxを取得します
 * @param {object} req - Expressリクエストオブジェクト
 * @param {object} res - Expressレスポンスオブジェクト
 */
async function getOutbox(req, res) {
  try {
    const { username } = req.params;
    const domain = getEnvDomain();
    
    // ユーザーの存在確認
    const actor = await findActorByUsername(username);
    if (!actor) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // アクターのデータベースIDを取得
    const actorDbId = await getActorDatabaseId(username);
    if (!actorDbId) {
      console.error(`[ActivityPub] Failed to get database ID for actor: ${username}`);
      return res.status(500).json({ error: 'Internal server error' });
    }
    
    // クエリパラメータからページネーション情報を取得
    const page = parseInt(req.query.page) || 0;
    const limit = parseInt(req.query.limit) || 20;
    
    // page=trueの場合は特定のページを返す、それ以外はコレクション情報を返す
    if (req.query.page === 'true') {
      const { items, totalItems } = await getOutboxActivities(actorDbId, page, limit);
      
      // ActivityPub OrderedCollectionPage形式のレスポンスを構築
      const outboxPage = {
        '@context': 'https://www.w3.org/ns/activitystreams',
        id: `https://${domain}/users/${username}/outbox?page=${page}`,
        type: 'OrderedCollectionPage',
        partOf: `https://${domain}/users/${username}/outbox`,
        orderedItems: items,
        totalItems: totalItems
      };
      
      // 前後のページへのリンクを追加
      if (page > 0) {
        outboxPage.prev = `https://${domain}/users/${username}/outbox?page=${page-1}`;
      }
      
      if ((page + 1) * limit < totalItems) {
        outboxPage.next = `https://${domain}/users/${username}/outbox?page=${page+1}`;
      }
      
      res.setHeader('Content-Type', 'application/activity+json');
      return res.json(outboxPage);
      
    } else {
      // 総アイテム数を取得
      const { totalItems } = await getOutboxActivities(actorDbId, 0, 0, true);
      
      // ActivityPub OrderedCollection形式のレスポンスを構築
      const outboxCollection = {
        '@context': 'https://www.w3.org/ns/activitystreams',
        id: `https://${domain}/users/${username}/outbox`,
        type: 'OrderedCollection',
        totalItems: totalItems,
        first: `https://${domain}/users/${username}/outbox?page=0`,
        last: `https://${domain}/users/${username}/outbox?page=${Math.ceil(totalItems / limit) - 1}`
      };
      
      res.setHeader('Content-Type', 'application/activity+json');
      return res.json(outboxCollection);
    }
    
  } catch (error) {
    console.error('Error getting outbox activities:', error);
    console.error('Outbox retrieval error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export { getOutbox };