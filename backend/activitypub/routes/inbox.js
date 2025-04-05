/**
 * ActivityPubのインボックスエンドポイントを提供するルーター
 * 他のFediverseサーバーからのアクティビティを受信します
 */

import express from 'express';
import { findActorByUsername } from '../models/actor.js';
import { addFollower } from '../models/follower.js';
import { sendAcceptFollow } from '../services/delivery.js';
import { extractHostFromUrl } from '../utils/helpers.js';
import { query } from '../../db/db.js';

const router = express.Router();

/**
 * リクエストの詳細情報をデバッグログに出力する
 * @param {object} req - Expressリクエストオブジェクト
 */
function logRequestDetails(req) {
  console.log('[ActivityPub] Incoming request details:');
  console.log(`  - Method: ${req.method}`);
  console.log(`  - URL: ${req.originalUrl}`);
  console.log('  - Headers:');
  Object.entries(req.headers).forEach(([key, value]) => {
    console.log(`    - ${key}: ${value}`);
  });
  console.log('  - Body:');
  console.log(JSON.stringify(req.body, null, 2));
}

/**
 * フォローアクティビティを処理する
 * @param {Object} activity - 受信したフォローアクティビティ
 * @param {Object} targetActor - フォローされたアクター
 * @returns {Promise<boolean>} - 処理成功したかどうか 
 */
async function handleFollowActivity(activity, targetActor) {
  try {
    // フォローリクエスト元のアクターURLとIDを取得
    const followerActorUrl = activity.actor;
    if (!followerActorUrl) {
      console.error('[ActivityPub] Follow activity missing actor URL');
      return false;
    }
    
    console.log(`[ActivityPub] Processing follow request from ${followerActorUrl} to ${targetActor.preferredUsername}`);
    
    // フォロワーアクター情報を取得
    let followerActor;
    try {
      const response = await fetch(followerActorUrl, {
        headers: { 
          'Accept': 'application/activity+json, application/ld+json',
          'User-Agent': 'wallog/1.0'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch follower actor: ${response.status}`);
      }
      
      followerActor = await response.json();
      console.log('[ActivityPub] Fetched follower actor information:', JSON.stringify(followerActor, null, 2));
    } catch (error) {
      console.error(`[ActivityPub] Error fetching follower actor: ${error.message}`);
      return false;
    }
    
    if (!followerActor || !followerActor.id) {
      console.error('[ActivityPub] Invalid follower actor information');
      return false;
    }
    
    // フォロワー情報を抽出
    const followerDomain = extractHostFromUrl(followerActorUrl);
    const followerUsername = followerActorUrl.split('/').pop();
    const followerInbox = followerActor.inbox;
    
    if (!followerDomain || !followerUsername || !followerInbox) {
      console.error(`[ActivityPub] Missing follower information: domain=${followerDomain}, username=${followerUsername}, inbox=${followerInbox}`);
      return false;
    }
    
    // ap_actorsテーブルからターゲットアクターのデータベースIDを取得
    const actorResult = await query(
      'SELECT id FROM ap_actors WHERE username = $1 AND domain = $2',
      [targetActor.preferredUsername, 'wallog.seitendan.com']
    );
    
    if (actorResult.rows.length === 0) {
      console.error(`[ActivityPub] Target actor not found in database: ${targetActor.preferredUsername}`);
      return false;
    }
    
    const targetActorDbId = actorResult.rows[0].id;
    console.log(`[ActivityPub] Found database actor ID: ${targetActorDbId}`);
    
    // フォロワーリストに追加
    await addFollower(
      targetActorDbId,
      followerActorUrl,
      followerUsername,
      followerDomain,
      followerInbox
    );
    
    console.log(`[ActivityPub] Added follower ${followerUsername}@${followerDomain}`);
    
    // フォローリクエストにAcceptで応答
    await sendAcceptFollow(activity, targetActor);
    console.log(`[ActivityPub] Sent Accept response to follow request`);
    
    return true;
  } catch (error) {
    console.error(`[ActivityPub] Error handling follow activity: ${error.message}`);
    return false;
  }
}

/**
 * ユーザー個別のインボックスエンドポイント
 * POST /users/:username/inbox - ユーザー宛のアクティビティを受信
 */
router.post('/:username/inbox', async (req, res) => {
  try {
    const { username } = req.params;
    
    // リクエストの詳細情報をログ出力
    console.log(`[ActivityPub] Received activity for ${username}`);
    logRequestDetails(req);
    
    const activity = req.body;
    
    // アクティビティが空の場合
    if (!activity || Object.keys(activity).length === 0) {
      console.error('[ActivityPub] Empty activity object received');
      return res.status(400).json({ error: 'Invalid activity: Empty object' });
    }
    
    // アクターが存在するか確認
    const actor = await findActorByUsername(username);
    if (!actor) {
      console.log(`[ActivityPub] Actor not found for username: ${username}`);
      return res.status(404).json({ error: 'Actor not found' });
    }
    
    // アクティビティのタイプに応じて処理
    if (!activity.type) {
      console.error('[ActivityPub] Activity missing type property');
      return res.status(400).json({ error: 'Invalid activity: Missing type' });
    }
    
    if (activity.type === 'Follow') {
      const success = await handleFollowActivity(activity, actor);
      if (success) {
        return res.status(202).json({ status: 'Follow request accepted' });
      } else {
        return res.status(400).json({ error: 'Failed to process follow request' });
      }
    } 
    // 他のアクティビティタイプの処理を追加...
    else {
      console.log(`[ActivityPub] Received unsupported activity type: ${activity.type}`);
      // 未対応のアクティビティタイプも一応受け付ける
      return res.status(202).json({ status: 'Accepted, but not processed' });
    }
  } catch (error) {
    console.error(`[ActivityPub] Error processing inbox activity: ${error.message}`);
    console.error(error.stack);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * 共有インボックスエンドポイント
 * POST /inbox - サーバー全体宛のアクティビティを受信
 */
router.post('/', async (req, res) => {
  try {
    // リクエストの詳細情報をログ出力
    console.log('[ActivityPub] Received activity to shared inbox');
    logRequestDetails(req);
    
    const activity = req.body;
    
    // アクティビティが空の場合
    if (!activity || Object.keys(activity).length === 0) {
      console.error('[ActivityPub] Empty activity object received at shared inbox');
      return res.status(400).json({ error: 'Invalid activity: Empty object' });
    }
    
    // 共有インボックスの実装
    // 通常は各ユーザー宛にアクティビティをルーティング
    
    return res.status(202).json({ status: 'Accepted' });
  } catch (error) {
    console.error(`[ActivityPub] Error processing shared inbox activity: ${error.message}`);
    console.error(error.stack);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;