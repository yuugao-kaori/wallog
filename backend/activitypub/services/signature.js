/**
 * HTTP署名サービス
 * 
 * ActivityPubのHTTP署名（HTTP Signatures）を処理するサービスです。
 * リクエストの署名検証および署名付きリクエストの生成を担当します。
 */

import crypto from 'crypto';
import { findRemoteActor } from '../models/actor.js';
import { signData, getKeyByKeyId } from './keys.js';
import { fetchJson } from '../utils/fetch.js';
import { getEnvDomain } from '../utils/helpers.js';
import { query } from '../../db/db.js';

/**
 * リクエストのHTTP署名を検証します
 * @param {object} req - Expressリクエストオブジェクト
 * @returns {Promise<boolean>} - 署名が有効な場合はtrue
 */
async function verifySignature(req) {
  try {
    // 署名ヘッダーが存在しない場合は検証失敗
    const signature = req.get('signature');
    if (!signature) {
      return false;
    }
    
    // 署名ヘッダーをパース
    const signatureParams = parseSignatureHeader(signature);
    
    // 必須パラメータが存在しない場合は検証失敗
    if (!signatureParams.keyId || !signatureParams.signature || !signatureParams.headers) {
      return false;
    }
    
    // キーIDからアクターを取得
    const keyId = signatureParams.keyId;
    const actorUri = keyId.split('#')[0];
    
    // まず、ローカルDBに登録されているキーを検索
    const keyFromDb = await getKeyByKeyId(keyId);
    
    let publicKey;
    
    if (keyFromDb) {
      // データベースに保存されている公開鍵を使用
      publicKey = keyFromDb.public_key;
    } else {
      // データベースにない場合は、リモートから取得
      const actorInfo = await fetchJson(actorUri);
      
      if (!actorInfo || !actorInfo.publicKey || !actorInfo.publicKey.publicKeyPem) {
        return false;
      }
      
      publicKey = actorInfo.publicKey.publicKeyPem;
      
      // 取得したキー情報を保存（将来の検証のため）
      const urlObj = new URL(actorUri);
      const domain = urlObj.hostname;
      const pathParts = urlObj.pathname.split('/');
      const username = pathParts[pathParts.length - 1];
      
      // アクターが存在するか確認
      const actorResult = await query(
        'SELECT id FROM ap_actors WHERE username = $1 AND domain = $2',
        [username, domain]
      );
      
      if (actorResult.rows.length > 0) {
        const actorId = actorResult.rows[0].id;
        
        // キー情報を保存
        await query(
          `INSERT INTO ap_keys (actor_id, key_id, public_key, private_key, key_format, algorithm, bits, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (actor_id, key_id) DO UPDATE
           SET public_key = EXCLUDED.public_key`,
          [actorId, keyId, publicKey, null, 'pkcs8', 'rsa-sha256', 2048, true]
        );
      }
    }
    
    // 署名文字列を作成
    const signatureString = createSignatureString(req, signatureParams.headers);
    
    // 署名を検証
    const verifier = crypto.createVerify('sha256');
    verifier.update(signatureString);
    
    return verifier.verify(
      publicKey,
      Buffer.from(signatureParams.signature, 'base64')
    );
    
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

/**
 * 署名ヘッダーをパースします
 * @param {string} signatureHeader - Signatureヘッダー
 * @returns {object} - パースされたパラメータ
 */
function parseSignatureHeader(signatureHeader) {
  const result = {};
  const parts = signatureHeader.split(',');
  
  for (const part of parts) {
    const [key, value] = part.split('=');
    if (key && value) {
      // クオーテーションを削除
      const cleanValue = value.replace(/^"/, '').replace(/"$/, '');
      result[key.trim()] = cleanValue;
    }
  }
  
  // headersは空白区切りの文字列なのでリストに変換
  if (result.headers) {
    result.headers = result.headers.split(' ');
  } else {
    result.headers = ['date'];  // デフォルトはdateヘッダーのみ
  }
  
  return result;
}

/**
 * 署名文字列を作成します
 * @param {object} req - Expressリクエストオブジェクト
 * @param {Array<string>} headers - 署名に含まれるヘッダー名のリスト
 * @returns {string} - 署名文字列
 */
function createSignatureString(req, headers) {
  return headers.map(header => {
    if (header === '(request-target)') {
      return `(request-target): ${req.method.toLowerCase()} ${req.path}`;
    } else if (header === 'host') {
      return `host: ${req.get('host')}`;
    } else if (header === 'digest') {
      return `digest: ${req.get('digest')}`;
    } else {
      return `${header.toLowerCase()}: ${req.get(header)}`;
    }
  }).join('\n');
}

/**
 * HTTP署名を付与したヘッダーを生成します
 * @param {string} url - リクエスト先URL
 * @param {string} method - HTTPメソッド
 * @param {object} actorData - 送信元アクターデータ
 * @param {string|object} body - リクエストボディ
 * @returns {Promise<object>} - 署名付きヘッダーオブジェクト
 */
async function createSignedHeaders(url, method, actorData, body = null) {
  try {
    // URLからターゲットホストとパスを取得
    const urlObj = new URL(url);
    const host = urlObj.host;
    const path = urlObj.pathname;
    
    // dateヘッダーの生成
    const date = new Date().toUTCString();
    
    // ヘッダー初期化
    const headers = {
      Host: host,
      Date: date
    };
    
    // Digestヘッダーの追加（bodyがある場合）
    if (body) {
      const bodyString = typeof body === 'string' ? body : JSON.stringify(body);
      const digest = crypto.createHash('sha256').update(bodyString).digest('base64');
      headers['Digest'] = `SHA-256=${digest}`;
    }
    
    // 署名に含めるヘッダー
    const headersToSign = body 
      ? ['(request-target)', 'host', 'date', 'digest'] 
      : ['(request-target)', 'host', 'date'];
    
    // 署名文字列の作成
    const signatureString = headersToSign.map(header => {
      if (header === '(request-target)') {
        return `(request-target): ${method.toLowerCase()} ${path}`;
      } else {
        return `${header.toLowerCase()}: ${headers[header.charAt(0).toUpperCase() + header.slice(1)]}`;
      }
    }).join('\n');
    
    // アクターIDからデータベース内のアクターIDを取得
    const domainName = getEnvDomain();
    let privateKey;
    let keyId;
    
    // データベースからアクターを検索
    const actorResult = await query(
      'SELECT id FROM ap_actors WHERE username = $1 AND domain = $2',
      [actorData.preferredUsername || actorData.username, domainName]
    );
    
    if (actorResult.rows.length > 0) {
      const actorId = actorResult.rows[0].id;
      
      // アクティブな鍵を検索
      const keyResult = await query(
        `SELECT * FROM ap_keys 
         WHERE actor_id = $1 AND is_active = true AND 
               (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP) AND 
               revoked = false 
         ORDER BY created_at DESC 
         LIMIT 1`,
        [actorId]
      );
      
      if (keyResult.rows.length > 0) {
        const keyData = keyResult.rows[0];
        privateKey = keyData.private_key;
        keyId = keyData.key_id;
      } else {
        // データベースに鍵がない場合は、アクターオブジェクトの鍵を使用
        privateKey = actorData.private_key;
        keyId = `https://${domainName}/users/${actorData.preferredUsername || actorData.username}#main-key`;
      }
    } else {
      // アクターがデータベースに存在しない場合（通常は発生しないはず）
      privateKey = actorData.private_key;
      keyId = `https://${domainName}/users/${actorData.preferredUsername || actorData.username}#main-key`;
    }
    
    if (!privateKey) {
      throw new Error('No private key found for actor');
    }
    
    // 署名の生成
    const signature = signData(signatureString, privateKey);
    
    // Signatureヘッダーの作成
    headers['Signature'] = `keyId="${keyId}",algorithm="rsa-sha256",headers="${headersToSign.join(' ')}",signature="${signature}"`;
    
    // Acceptヘッダーの追加
    headers['Accept'] = 'application/activity+json';
    
    if (body) {
      headers['Content-Type'] = 'application/activity+json';
    }
    
    return headers;
    
  } catch (error) {
    console.error('Error creating signed headers:', error);
    throw error;
  }
}

export {
  verifySignature,
  createSignedHeaders
};