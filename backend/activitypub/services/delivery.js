/**
 * アクティビティ配信サービス
 * 
 * ActivityPubのアクティビティ配信を担当するサービスです。
 * フォロワーへのアクティビティ配信やAccept応答の送信などを行います。
 */

import axios from 'axios';
import crypto from 'crypto';
import { findActorById } from '../models/actor.js';
import { getAllFollowerInboxes } from '../models/follower.js';
import { createSignedHeaders } from './signature.js';
import { getEnvDomain } from '../utils/helpers.js';
import { query } from '../../db/db.js';

/**
 * フォロワー全員にアクティビティを配信します
 * @param {object} activity - 配信するアクティビティ
 * @param {object} actor - 送信元アクター
 * @returns {Promise<void>}
 */
export async function deliverToFollowers(activity, actor) {
  try {
    // actorオブジェクトからユーザー名とドメイン名を取得
    const username = actor.preferredUsername || actor.username || 'admin';
    const domain = 'wallog.seitendan.com'; // 固定値
    
    // データベースから数値のアクターIDを取得
    const actorResult = await query(
      'SELECT id FROM ap_actors WHERE username = $1 AND domain = $2',
      [username, domain]
    );
    
    if (actorResult.rows.length === 0) {
      console.error(`Actor not found in database: ${username}@${domain}`);
      return;
    }
    
    // データベース内の数値IDを使用
    const dbActorId = actorResult.rows[0].id;
    console.log(`配信する投稿のアクターIDを取得: ${dbActorId}`);
    
    // アクターIDからフォロワーのインボックスURLを取得
    const followerInboxes = await getAllFollowerInboxes(dbActorId);
    
    // フォロワーがいない場合は早期リターン
    if (!followerInboxes || followerInboxes.length === 0) {
      console.log('No followers to deliver to');
      return;
    }
    
    // 各フォロワーにアクティビティを送信
    const deliveryPromises = followerInboxes.map(inboxUrl => {
      return deliverToInbox(inboxUrl, activity, actor)
        .catch(error => {
          // 個々の配信失敗はログに記録するが、全体の処理は続行
          console.error(`Failed to deliver to ${inboxUrl}:`, error.message);
        });
    });
    
    await Promise.allSettled(deliveryPromises);
    console.log(`Activity delivered to ${followerInboxes.length} followers`);
    
  } catch (error) {
    console.error('Error in deliverToFollowers:', error);
    throw error;
  }
}

/**
 * 特定のインボックスにアクティビティを配信します
 * @param {string} inboxUrl - 配信先インボックスURL
 * @param {object} activity - 配信するアクティビティ
 * @param {object} actor - 送信元アクター
 * @returns {Promise<object>} - レスポンス
 */
export async function deliverToInbox(inboxUrl, activity, actor) {
  try {
    console.log(`[ActivityPub] インボックス ${inboxUrl} への配信を開始`);
    
    // 署名付きヘッダーを生成
    const headers = await createSignedHeaders(inboxUrl, 'POST', actor, activity);
    
    // ヘッダー情報をログに記録（機密情報は除く）
    const logSafeHeaders = { ...headers };
    if (logSafeHeaders.Signature) {
      logSafeHeaders.Signature = '[署名情報あり]';
    }
    console.log(`[ActivityPub] リクエストヘッダー:`, JSON.stringify(logSafeHeaders, null, 2));
    
    // POSTリクエストを送信
    console.log(`[ActivityPub] 送信データ:`, JSON.stringify(activity, null, 2));
    const response = await axios.post(inboxUrl, activity, { headers });
    
    // レスポンス情報をログに記録
    console.log(`[ActivityPub] 応答ステータス: ${response.status} ${response.statusText}`);
    console.log(`[ActivityPub] 応答ヘッダー:`, response.headers);
    
    return response.data;
    
  } catch (error) {
    console.error(`[ActivityPub] インボックス ${inboxUrl} への配信エラー:`, error.message);
    if (error.response) {
      // サーバーからのレスポンスエラーの場合
      console.error(`[ActivityPub] エラーステータス: ${error.response.status}`);
      console.error(`[ActivityPub] エラーヘッダー:`, error.response.headers);
      console.error(`[ActivityPub] エラーデータ:`, error.response.data);
    }
    throw error;
  }
}

/**
 * Follow要求に対するAcceptアクティビティを送信します
 * @param {object} followActivity - 受け取ったFollowアクティビティ
 * @param {object} targetActor - フォローされたアクター
 * @returns {Promise<void>}
 */
export async function sendAcceptFollow(followActivity, targetActor) {
  try {
    // 固定ドメイン名を使用（環境変数から取得するのではなく）
    const domain = "wallog.seitendan.com";
    
    // フォロー先のusernameを確保（undefindedのケースを回避）
    const username = targetActor.preferredUsername || targetActor.username || "admin";
    
    // Acceptアクティビティを構築
    const acceptActivity = {
      '@context': 'https://www.w3.org/ns/activitystreams',
      id: `https://${domain}/activities/${crypto.randomUUID()}`,
      type: 'Accept',
      actor: `https://${domain}/users/${username}`,
      object: followActivity,
      to: [followActivity.actor]
    };
    
    // 詳細なログ出力（Accept内容をログに記録）
    console.log('[ActivityPub] 送信するAcceptアクティビティ:', JSON.stringify(acceptActivity, null, 2));
    
    // フォローしてきたアクターのインボックスを取得
    let followerInbox = null;
    
    if (followActivity.actor) {
      // アクター情報を取得
      const followerActorResponse = await axios.get(followActivity.actor, {
        headers: {
          'Accept': 'application/activity+json'
        }
      });
      
      if (followerActorResponse.data && followerActorResponse.data.inbox) {
        followerInbox = followerActorResponse.data.inbox;
        // フォロワーのインボックス情報をログに記録
        console.log(`[ActivityPub] フォロワーのインボックス: ${followerInbox}`);
      }
    }
    
    if (!followerInbox) {
      throw new Error('Could not determine follower inbox URL');
    }
    
    // Acceptをフォロワーのインボックスに送信
    const response = await deliverToInbox(followerInbox, acceptActivity, targetActor);
    console.log(`[ActivityPub] Accept sent for follow from ${followActivity.actor} to ${followerInbox}`);
    console.log(`[ActivityPub] 応答レスポンス:`, response || 'レスポンスなし');
    
  } catch (error) {
    console.error('[ActivityPub] Error sending Accept for follow:', error);
    throw error;
  }
}

/**
 * 新しいブログ投稿が作成されたときに、フォロワーに通知します
 * @param {object} post - 作成された投稿
 * @param {string} actorUsername - 投稿者のユーザー名
 * @returns {Promise<void>}
 */
export async function announceNewPost(post, actorUsername) {
  try {
    // アクター情報を取得
    const domain = getEnvDomain();
    const actorUrl = `https://${domain}/users/${actorUsername}`;
    
    const actorResult = await findActorById(post.user_id);
    if (!actorResult) {
      throw new Error(`Actor not found for username ${actorUsername}`);
    }
    
    // Create + Noteアクティビティを構築
    const postData = {
      title: post.title,
      content: post.content,
      url: `https://${domain}/posts/${post.id}`,
      tags: post.tags ? JSON.parse(post.tags) : []
    };
    
    // アクティビティを作成して保存
    const { createNoteActivity } = await import('../models/activity.js');
    const activity = createNoteActivity(actorResult, postData);
    
    const { saveOutboxActivity } = await import('../models/activity.js');
    await saveOutboxActivity(activity, actorResult.id, post.id);
    
    // フォロワーに配信
    await deliverToFollowers(activity, actorResult);
    console.log(`New post ${post.id} announced to followers`);
    
  } catch (error) {
    console.error('Error announcing new post:', error);
    throw error;
  }
}