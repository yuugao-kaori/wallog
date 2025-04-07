/**
 * アクターサービス
 * 
 * ActivityPubのアクター情報を取得・管理するためのサービスです。
 * リモートアクターの情報取得やキャッシュを担当します。
 */

import { findRemoteActor, createActor } from '../models/actor.js';
import { fetchJson, resolveActorUrl } from '../utils/fetch.js';
import { extractHostFromUrl } from '../utils/helpers.js';

/**
 * アクティビティで参照されるアクターの情報を取得します
 * @param {string} actorUrl - アクターのURL
 * @returns {Promise<object|null>} - アクター情報またはnull
 */
export async function getActivityActor(actorUrl) {
  try {
    // 既存のリモートアクターをDBから検索
    let actorRecord = await findRemoteActor(actorUrl);
    
    // 存在すればそのまま返す
    if (actorRecord) {
      return actorRecord;
    }
    
    // 存在しなければ外部から取得して保存
    const actorData = await fetchJson(actorUrl);
    
    if (!actorData || !actorData.id) {
      throw new Error(`Invalid actor data from ${actorUrl}`);
    }
    
    // アクターデータからユーザー名とドメインを抽出
    const preferredUsername = actorData.preferredUsername || 
                            actorData.name || 
                            actorUrl.split('/').pop();
    
    const domain = extractHostFromUrl(actorUrl);
    
    if (!domain) {
      throw new Error(`Could not extract domain from ${actorUrl}`);
    }
    
    // アクターをDBに保存
    const newActor = await createActor({
      username: preferredUsername,
      domain: domain,
      display_name: actorData.name || preferredUsername,
      summary: actorData.summary || '',
      inbox_url: actorData.inbox || '',
      outbox_url: actorData.outbox || '',
      following_url: actorData.following || '',
      followers_url: actorData.followers || '',
      public_key: actorData.publicKey && actorData.publicKey.publicKeyPem ? 
                 actorData.publicKey.publicKeyPem : null,
      private_key: null, // リモートアクターの秘密鍵は保存しない
      icon: actorData.icon && actorData.icon.url ? actorData.icon.url : null,
      uri: actorUrl
    });
    
    return newActor;
    
  } catch (error) {
    console.error('Error getting activity actor:', error);
    return null;
  }
}

/**
 * ユーザー名とドメインからアクターを検索します
 * @param {string} username - ユーザー名
 * @param {string} domain - ドメイン
 * @returns {Promise<object|null>} - アクター情報またはnull
 */
export async function findActorByHandle(username, domain) {
  try {
    // アクターURLを解決
    const actorUrl = await resolveActorUrl(username, domain);
    
    if (!actorUrl) {
      return null;
    }
    
    // アクター情報を取得
    return await getActivityActor(actorUrl);
    
  } catch (error) {
    console.error(`Error finding actor for ${username}@${domain}:`, error);
    return null;
  }
}