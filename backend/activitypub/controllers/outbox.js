/**
 * Outboxコントローラー
 * 
 * ActivityPubのOutbox処理を担当するコントローラーです。
 * ローカルユーザーの投稿情報を外部に提供します。
 */

const { findActorByUsername } = require('../models/actor');
const { getOutboxActivities } = require('../models/activity');
const { getEnvDomain } = require('../utils/helpers');

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
    
    // クエリパラメータからページネーション情報を取得
    const page = parseInt(req.query.page) || 0;
    const limit = parseInt(req.query.limit) || 20;
    
    // page=trueの場合は特定のページを返す、それ以外はコレクション情報を返す
    if (req.query.page === 'true') {
      const { items, totalItems } = await getOutboxActivities(actor.id, page, limit);
      
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
      const { totalItems } = await getOutboxActivities(actor.id, 0, 0, true);
      
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
    console.error('Outbox retrieval error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { getOutbox };