/**
 * ActivityPubのユーザープロファイル（Actor）エンドポイントを提供するルーター
 */

import express from 'express';
import { findActorByUsername } from '../models/actor.js';
import { getFollowers, getFollowing } from '../controllers/follow.js';

const router = express.Router();

/**
 * ユーザープロファイル（Actor）エンドポイント
 * GET /users/:username - ユーザーのActorオブジェクトを返す
 */
router.get('/:username', async (req, res) => {
  try {
    const { username } = req.params;
    console.log(`[ActivityPub] Actor request for username: ${username}`);

    // ユーザー名からアクター情報を取得
    const actor = await findActorByUsername(username);

    // アクターが見つからない場合は404を返す
    if (!actor) {
      console.log(`[ActivityPub] Actor not found for username: ${username}`);
      return res.status(404).json({ error: 'Actor not found' });
    }

    // application/activity+jsonのContent-Typeを設定
    res.setHeader('Content-Type', 'application/activity+json');
    return res.json(actor);
  } catch (error) {
    console.error(`[ActivityPub] Error getting actor: ${error.message}`);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * フォロワー一覧エンドポイント
 * GET /users/:username/followers - ユーザーのフォロワー一覧を返す
 */
router.get('/:username/followers', getFollowers);

/**
 * フォロー中一覧エンドポイント
 * GET /users/:username/following - ユーザーのフォロー中アカウント一覧を返す
 */
router.get('/:username/following', getFollowing);

export default router;