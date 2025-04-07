/**
 * ActivityPubのActorモデルを提供するモジュール
 * このモジュールはユーザーアカウントのActorオブジェクトを生成・管理します
 */

import dotenv from 'dotenv';
import axios from 'axios';
import { MIME_TYPES } from '../utils/constants.js';
import { getUserAgent } from '../utils/helpers.js';
import { query, beginTransaction, commitTransaction, rollbackTransaction } from '../../db/db.js';
import { generateKeyPair } from '../services/keys.js';

dotenv.config();

// 本番環境用のドメイン名を設定 (localhostを上書き)
const BASE_URL = 'https://wallog.seitendan.com';
const domain = BASE_URL.replace(/^https?:\/\//, '');

// リモートアクターキャッシュ (メモリキャッシュ)
const remoteActorCache = new Map();

/**
 * アクターをデータベースに作成または更新します
 * @param {string} username - ユーザー名
 * @param {string} domain - ドメイン名
 * @param {object} actorData - アクターデータ
 * @returns {Promise<object>} - 作成または更新されたアクター
 */
export async function createOrUpdateActor(username, domain, actorData = {}) {
  const client = await beginTransaction();
  
  try {
    // アクターが存在するか確認
    const actorResult = await client.query(
      'SELECT * FROM ap_actors WHERE username = $1 AND domain = $2',
      [username, domain]
    );
    
    let actor;
    let actorId;
    
    if (actorResult.rows.length === 0) {
      // 新規アクターの場合、鍵ペアを生成
      const { publicKey, privateKey } = await generateKeyPair();
      
      // アクターを作成
      const inboxUrl = actorData.inbox || `${BASE_URL}/users/${username}/inbox`;
      const outboxUrl = actorData.outbox || `${BASE_URL}/users/${username}/outbox`;
      const followingUrl = actorData.following || `${BASE_URL}/users/${username}/following`;
      const followersUrl = actorData.followers || `${BASE_URL}/users/${username}/followers`;
      
      const newActorResult = await client.query(
        `INSERT INTO ap_actors 
        (username, domain, inbox_url, outbox_url, following_url, followers_url, public_key, private_key) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
        RETURNING *`,
        [username, domain, inboxUrl, outboxUrl, followingUrl, followersUrl, publicKey, privateKey]
      );
      
      actor = newActorResult.rows[0];
      actorId = actor.id;
      
      // 鍵情報をap_keysテーブルに登録
      const keyId = `${BASE_URL}/users/${username}#main-key`;
      await client.query(
        `INSERT INTO ap_keys 
        (actor_id, key_id, public_key, private_key, key_format, algorithm, bits, is_active) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [actorId, keyId, publicKey, privateKey, 'pkcs8', 'rsa-sha256', 2048, true]
      );
    } else {
      // 既存のアクターを更新
      actor = actorResult.rows[0];
      actorId = actor.id;
      
      // アクター情報の更新が必要な場合のみ更新
      if (Object.keys(actorData).length > 0) {
        const inboxUrl = actorData.inbox || actor.inbox_url;
        const outboxUrl = actorData.outbox || actor.outbox_url;
        const followingUrl = actorData.following || actor.following_url;
        const followersUrl = actorData.followers || actor.followers_url;
        
        const updatedActorResult = await client.query(
          `UPDATE ap_actors 
          SET inbox_url = $1, outbox_url = $2, following_url = $3, followers_url = $4, updated_at = CURRENT_TIMESTAMP 
          WHERE id = $5 
          RETURNING *`,
          [inboxUrl, outboxUrl, followingUrl, followersUrl, actorId]
        );
        
        actor = updatedActorResult.rows[0];
      }
    }
    
    await commitTransaction(client);
    return convertDbActorToActivityPubActor(actor);
  } catch (error) {
    await rollbackTransaction(client);
    console.error('Error creating or updating actor:', error);
    throw error;
  }
}

/**
 * データベースのアクターオブジェクトをActivityPub形式に変換します
 * @param {object} dbActor - データベースから取得したアクター
 * @returns {object} - ActivityPub形式のアクター
 */
function convertDbActorToActivityPubActor(dbActor) {
  const actorUrl = `${BASE_URL}/users/${dbActor.username}`;
  
  return {
    '@context': [
      'https://www.w3.org/ns/activitystreams',
      'https://w3id.org/security/v1'
    ],
    id: actorUrl,
    type: 'Person',
    preferredUsername: dbActor.username,
    name: dbActor.username === 'admin' ? '星天想記' : '星天想記',
    summary: 'ブログ「星天想記」の更新情報をお届けします。',
    inbox: dbActor.inbox_url,
    outbox: dbActor.outbox_url,
    followers: dbActor.followers_url,
    following: dbActor.following_url,
    // アイコン画像の設定
    icon: {
      type: 'Image',
      mediaType: 'image/png',
      url: 'https://wallog.seitendan.com/api/drive/file/file-1743863049435-261408808.png.webp'
    },
    // アイコン画像の互換性確保
    avatarUrl: 'https://wallog.seitendan.com/api/drive/file/file-1743863049435-261408808.png.webp',
    // 署名検証用の公開鍵情報
    publicKey: {
      id: `${actorUrl}#main-key`,
      owner: actorUrl,
      publicKeyPem: dbActor.public_key
    },
    // 署名生成用の秘密鍵（内部利用のみ）
    private_key: dbActor.private_key
  };
}

/**
 * ユーザー名からActorオブジェクトを取得します
 * @param {string} username - ユーザー名
 * @returns {Promise<Object|null>} Actorオブジェクト、見つからない場合はnull
 */
export async function findActorByUsername(username) {
  try {
    // ローカルドメインからのユーザー検索
    const localDomain = BASE_URL.replace(/^https?:\/\//, '');
    
    // データベースからアクターを検索
    const result = await query(
      'SELECT * FROM ap_actors WHERE username = $1 AND domain = $2',
      [username, localDomain]
    );
    
    if (result.rows.length === 0) {
      // アクターが存在しない場合、新規作成
      return await createOrUpdateActor(username, localDomain);
    }
    
    // アクターが存在する場合、ActivityPub形式に変換して返す
    return convertDbActorToActivityPubActor(result.rows[0]);
  } catch (error) {
    console.error('Error finding actor by username:', error);
    return null;
  }
}

/**
 * IDからActorオブジェクトを検索します
 * @param {string} actorId - ActorのID（URL）
 * @returns {Promise<Object|null>} Actorオブジェクト、見つからない場合はnull
 */
export async function findActorById(actorId) {
  try {
    // IDからユーザー名を抽出する
    const urlPattern = new RegExp(`${BASE_URL}/users/([^/]+)$`);
    const match = actorId.match(urlPattern);
    
    if (!match) {
      return null;
    }
    
    const username = match[1];
    return findActorByUsername(username);
  } catch (error) {
    console.error('Error finding actor by ID:', error);
    return null;
  }
}

/**
 * リモートのActorをフェッチします
 * @param {string} actorUrl - アクターのURL
 * @param {boolean} forceUpdate - キャッシュを無視して強制的に更新するかどうか
 * @returns {Promise<object|null>} - アクターオブジェクト、見つからない場合はnull
 */
export async function findRemoteActor(actorUrl, forceUpdate = false) {
  try {
    // URLからドメインとユーザー名を抽出
    const urlObj = new URL(actorUrl);
    const domain = urlObj.hostname;
    const pathParts = urlObj.pathname.split('/');
    const username = pathParts[pathParts.length - 1];
    
    // キャッシュにあるか確認
    if (!forceUpdate && remoteActorCache.has(actorUrl)) {
      const cachedData = remoteActorCache.get(actorUrl);
      // キャッシュが1時間以内なら利用する
      if (Date.now() - cachedData.timestamp < 60 * 60 * 1000) {
        return cachedData.actor;
      }
    }
    
    // まずデータベースからチェック
    const actorResult = await query(
      'SELECT * FROM ap_actors WHERE username = $1 AND domain = $2',
      [username, domain]
    );
    
    let actor;
    
    if (actorResult.rows.length === 0 || forceUpdate) {
      // データベースにない場合またはforceUpdateがtrueの場合は、リモートからフェッチ
      const headers = {
        'Accept': `${MIME_TYPES.ACTIVITY_JSON}, ${MIME_TYPES.LD_JSON}`,
        'User-Agent': getUserAgent()
      };
      
      const response = await axios.get(actorUrl, { headers });
      const remoteActorData = response.data;
      
      // リモートアクターをデータベースに保存または更新
      const inboxUrl = remoteActorData.inbox || null;
      const outboxUrl = remoteActorData.outbox || null;
      const followingUrl = remoteActorData.following || null;
      const followersUrl = remoteActorData.followers || null;
      const publicKey = remoteActorData.publicKey?.publicKeyPem || null;
      
      if (actorResult.rows.length === 0) {
        // 新規作成
        await query(
          `INSERT INTO ap_actors 
          (username, domain, inbox_url, outbox_url, following_url, followers_url, public_key) 
          VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [username, domain, inboxUrl, outboxUrl, followingUrl, followersUrl, publicKey]
        );
      } else {
        // 更新
        await query(
          `UPDATE ap_actors 
          SET inbox_url = $1, outbox_url = $2, following_url = $3, followers_url = $4, 
              public_key = $5, updated_at = CURRENT_TIMESTAMP 
          WHERE username = $6 AND domain = $7`,
          [inboxUrl, outboxUrl, followingUrl, followersUrl, publicKey, username, domain]
        );
      }
      
      actor = remoteActorData;
      
      // キャッシュに保存
      remoteActorCache.set(actorUrl, {
        actor,
        timestamp: Date.now()
      });
    } else {
      // データベースにある場合は、ActivityPub形式に変換
      actor = convertDbActorToActivityPubActor(actorResult.rows[0]);
      
      // キャッシュに保存
      remoteActorCache.set(actorUrl, {
        actor,
        timestamp: Date.now()
      });
    }
    
    return actor;
  } catch (error) {
    console.error(`Error fetching remote actor from ${actorUrl}:`, error.message);
    return null;
  }
}

/**
 * アクターIDから最新のアクティブな鍵を取得します
 * @param {number} actorId - アクターID
 * @returns {Promise<object|null>} - 鍵オブジェクト、見つからない場合はnull
 */
export async function getActiveKeyForActor(actorId) {
  try {
    const result = await query(
      `SELECT * FROM ap_keys 
      WHERE actor_id = $1 AND is_active = true AND 
            (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP) AND 
            revoked = false 
      ORDER BY created_at DESC 
      LIMIT 1`,
      [actorId]
    );
    
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting active key for actor:', error);
    return null;
  }
}

/**
 * 新しい鍵ペアを生成し、古い鍵を非アクティブに設定します
 * @param {number} actorId - アクターID
 * @returns {Promise<object>} - 新しい鍵オブジェクト
 */
export async function rotateActorKeys(actorId) {
  const client = await beginTransaction();
  
  try {
    // 既存の鍵を非アクティブにする
    await client.query(
      'UPDATE ap_keys SET is_active = false WHERE actor_id = $1',
      [actorId]
    );
    
    // アクター情報を取得
    const actorResult = await client.query(
      'SELECT * FROM ap_actors WHERE id = $1',
      [actorId]
    );
    
    if (actorResult.rows.length === 0) {
      throw new Error('Actor not found');
    }
    
    const actor = actorResult.rows[0];
    const username = actor.username;
    
    // 新しい鍵ペアを生成
    const { publicKey, privateKey } = await generateKeyPair();
    
    // アクターの鍵を更新
    await client.query(
      'UPDATE ap_actors SET public_key = $1, private_key = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
      [publicKey, privateKey, actorId]
    );
    
    // 新しい鍵をap_keysテーブルに登録
    const keyId = `${BASE_URL}/users/${username}#main-key`;
    const newKeyResult = await client.query(
      `INSERT INTO ap_keys 
      (actor_id, key_id, public_key, private_key, key_format, algorithm, bits, is_active) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
      RETURNING *`,
      [actorId, keyId, publicKey, privateKey, 'pkcs8', 'rsa-sha256', 2048, true]
    );
    
    await commitTransaction(client);
    return newKeyResult.rows[0];
  } catch (error) {
    await rollbackTransaction(client);
    console.error('Error rotating actor keys:', error);
    throw error;
  }
}

/**
 * ユーザー名からWebFingerレスポンスを生成します
 * @param {string} username - ユーザー名
 * @returns {Promise<Object|null>} WebFingerレスポンスオブジェクト、見つからない場合はnull
 */
export async function generateWebFingerResponse(username) {
  try {
    // ユーザーがデータベースに存在するかを確認
    const actor = await findActorByUsername(username);
    
    if (!actor) {
      return null;
    }
    
    const domain = BASE_URL.replace(/^https?:\/\//, '');
    const resource = `acct:${username}@${domain}`;
    
    return {
      subject: resource,
      links: [
        {
          rel: 'self',
          type: 'application/activity+json',
          href: `${BASE_URL}/users/${username}`
        }
      ]
    };
  } catch (error) {
    console.error('Error generating WebFinger response:', error);
    return null;
  }
}