/**
 * Follow関連のコントローラー
 * 
 * フォロー・フォロワー情報に関するエンドポイントを提供します。
 * フォロワー一覧やフォロー中のアカウント一覧を提供します。
 */

import { findActorByUsername } from '../models/actor.js';
import { getFollowers as fetchFollowers, getFollowing as fetchFollowing } from '../models/follower.js';
import { getEnvDomain } from '../utils/helpers.js';

/**
 * ユーザーのフォロワー一覧を取得します
 * @param {object} req - Expressリクエストオブジェクト
 * @param {object} res - Expressレスポンスオブジェクト
 */
async function getFollowers(req, res) {
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
    const limit = parseInt(req.query.limit) || 50;
    
    // page=trueの場合は特定のページを返す、それ以外はコレクション情報を返す
    if (req.query.page === 'true') {
      const { items, totalItems } = await fetchFollowers(actor.id, page, limit);
      
      // ActivityPub CollectionPage形式のレスポンスを構築
      const followersPage = {
        '@context': 'https://www.w3.org/ns/activitystreams',
        id: `https://${domain}/users/${username}/followers?page=${page}`,
        type: 'CollectionPage',
        partOf: `https://${domain}/users/${username}/followers`,
        items: items.map(follower => `https://${follower.domain}/users/${follower.username}`),
        totalItems: totalItems
      };
      
      // 前後のページへのリンクを追加
      if (page > 0) {
        followersPage.prev = `https://${domain}/users/${username}/followers?page=${page-1}`;
      }
      
      if ((page + 1) * limit < totalItems) {
        followersPage.next = `https://${domain}/users/${username}/followers?page=${page+1}`;
      }
      
      res.setHeader('Content-Type', 'application/activity+json');
      return res.json(followersPage);
      
    } else {
      // 総フォロワー数を取得
      const { totalItems } = await fetchFollowers(actor.id, 0, 0, true);
      
      // ActivityPub Collection形式のレスポンスを構築
      const followersCollection = {
        '@context': 'https://www.w3.org/ns/activitystreams',
        id: `https://${domain}/users/${username}/followers`,
        type: 'Collection',
        totalItems: totalItems,
        first: `https://${domain}/users/${username}/followers?page=0`
      };
      
      if (totalItems > 0) {
        followersCollection.last = `https://${domain}/users/${username}/followers?page=${Math.ceil(totalItems / limit) - 1}`;
      }
      
      res.setHeader('Content-Type', 'application/activity+json');
      return res.json(followersCollection);
    }
    
  } catch (error) {
    console.error('Followers retrieval error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * ユーザーのフォロー中一覧を取得します
 * @param {object} req - Expressリクエストオブジェクト
 * @param {object} res - Expressレスポンスオブジェクト
 */
async function getFollowing(req, res) {
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
    const limit = parseInt(req.query.limit) || 50;
    
    // page=trueの場合は特定のページを返す、それ以外はコレクション情報を返す
    if (req.query.page === 'true') {
      // 現在の実装ではフォロー中アカウントはないため、空のリストを返す
      const followingPage = {
        '@context': 'https://www.w3.org/ns/activitystreams',
        id: `https://${domain}/users/${username}/following?page=${page}`,
        type: 'CollectionPage',
        partOf: `https://${domain}/users/${username}/following`,
        items: [],
        totalItems: 0
      };
      
      res.setHeader('Content-Type', 'application/activity+json');
      return res.json(followingPage);
      
    } else {
      // 現在の実装ではフォロー中アカウントはないため、空のコレクション情報を返す
      const followingCollection = {
        '@context': 'https://www.w3.org/ns/activitystreams',
        id: `https://${domain}/users/${username}/following`,
        type: 'Collection',
        totalItems: 0,
        first: `https://${domain}/users/${username}/following?page=0`
      };
      
      res.setHeader('Content-Type', 'application/activity+json');
      return res.json(followingCollection);
    }
    
  } catch (error) {
    console.error('Following retrieval error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export {
  getFollowers,
  getFollowing
};