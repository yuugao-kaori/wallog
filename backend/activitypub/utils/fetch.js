/**
 * ActivityPub HTTP通信ユーティリティ
 * 
 * ActivityPubプロトコルのHTTP通信を処理するためのユーティリティ関数を提供します。
 * 適切なヘッダーを付与してFediverseサーバーとの通信を行います。
 */

import axios from 'axios';
import { MIME_TYPES } from './constants.js';
import { getUserAgent } from './helpers.js';
import { createSignedHeaders } from '../services/signature.js';
import { findActorById } from '../models/actor.js';

/**
 * JSONデータをfetchします（ActivityPub形式）
 * @param {string} url - 取得先URL
 * @param {object} options - 追加オプション
 * @returns {Promise<object|null>} - 取得したJSONデータまたはnull
 */
export async function fetchJson(url, options = {}) {
  try {
    const headers = {
      'Accept': `${MIME_TYPES.ACTIVITY_JSON}, ${MIME_TYPES.LD_JSON}`,
      'User-Agent': getUserAgent(),
      ...options.headers
    };
    
    const response = await axios.get(url, { headers });
    return response.data;
    
  } catch (error) {
    console.error(`Error fetching JSON from ${url}:`, error.message);
    return null;
  }
}

/**
 * 署名付きでJSONデータをfetchします
 * @param {string} url - 取得先URL
 * @param {number} actorId - 署名に使用するアクターID
 * @returns {Promise<object|null>} - 取得したJSONデータまたはnull
 */
export async function fetchJsonSigned(url, actorId) {
  try {
    const actor = await findActorById(actorId);
    if (!actor) {
      throw new Error(`Actor not found for ID: ${actorId}`);
    }
    
    const headers = await createSignedHeaders(url, 'GET', actor);
    
    const response = await axios.get(url, { headers });
    return response.data;
    
  } catch (error) {
    console.error(`Error fetching signed JSON from ${url}:`, error.message);
    return null;
  }
}

/**
 * ActivityPubアクターの情報を取得します
 * @param {string} actorUrl - アクターのURL
 * @returns {Promise<object|null>} - アクター情報またはnull
 */
export async function fetchActor(actorUrl) {
  return fetchJson(actorUrl);
}

/**
 * WebFingerでアカウント情報を検索します
 * @param {string} account - acct:username@domain形式のアカウント
 * @param {string} domain - 検索対象のドメイン
 * @returns {Promise<object|null>} - WebFingerレスポンスまたはnull
 */
export async function fetchWebfinger(account, domain) {
  try {
    const url = `https://${domain}/.well-known/webfinger?resource=${encodeURIComponent(account)}`;
    const response = await axios.get(url, {
      headers: {
        'Accept': 'application/jrd+json, application/json',
        'User-Agent': getUserAgent()
      }
    });
    
    return response.data;
    
  } catch (error) {
    console.error(`Error fetching Webfinger for ${account}:`, error.message);
    return null;
  }
}

/**
 * ユーザー名とドメインからアクターのURLを解決します
 * @param {string} username - ユーザー名
 * @param {string} domain - ドメイン
 * @returns {Promise<string|null>} - アクターのURLまたはnull
 */
export async function resolveActorUrl(username, domain) {
  try {
    // まずWebFingerを試す
    const webfingerResult = await fetchWebfinger(`acct:${username}@${domain}`, domain);
    
    if (webfingerResult && webfingerResult.links) {
      // self relのリンクを探す
      const selfLink = webfingerResult.links.find(link => 
        link.rel === 'self' && 
        (link.type === MIME_TYPES.ACTIVITY_JSON || link.type === MIME_TYPES.LD_JSON)
      );
      
      if (selfLink && selfLink.href) {
        return selfLink.href;
      }
    }
    
    // WebFingerが失敗した場合は一般的なURLパターンを試す
    const commonPatterns = [
      `https://${domain}/users/${username}`,
      `https://${domain}/@${username}`,
      `https://${domain}/actor/${username}`,
      `https://${domain}/accounts/${username}`
    ];
    
    for (const url of commonPatterns) {
      try {
        const actorData = await fetchJson(url);
        if (actorData && actorData.id) {
          return actorData.id;
        }
      } catch (e) {
        // 失敗したら次のパターンを試す
        continue;
      }
    }
    
    return null;
    
  } catch (error) {
    console.error(`Error resolving actor URL for ${username}@${domain}:`, error.message);
    return null;
  }
}