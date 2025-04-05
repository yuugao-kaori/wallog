/**
 * キー生成サービス
 * 
 * ActivityPubのHTTP署名に使用するキーペアを生成・管理するサービスです。
 */

import crypto from 'crypto';
import { query } from '../../db/db.js';

/**
 * RSA鍵ペアを生成します
 * @returns {Promise<object>} - 公開鍵と秘密鍵のペア
 */
export async function generateKeyPair() {
  return new Promise((resolve, reject) => {
    crypto.generateKeyPair('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    }, (err, publicKey, privateKey) => {
      if (err) {
        reject(err);
      } else {
        resolve({ publicKey, privateKey });
      }
    });
  });
}

/**
 * アクターIDから最新のアクティブな鍵を取得します
 * @param {number} actorId - アクターID
 * @returns {Promise<object|null>} - 鍵オブジェクト
 */
export async function getActiveKeyByActorId(actorId) {
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
    console.error('Error getting active key by actor ID:', error);
    return null;
  }
}

/**
 * キーIDから鍵を取得します
 * @param {string} keyId - 鍵ID
 * @returns {Promise<object|null>} - 鍵オブジェクト
 */
export async function getKeyByKeyId(keyId) {
  try {
    const result = await query(
      `SELECT * FROM ap_keys 
      WHERE key_id = $1 AND 
            (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP) AND 
            revoked = false 
      LIMIT 1`,
      [keyId]
    );
    
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting key by key ID:', error);
    return null;
  }
}

/**
 * 秘密鍵で署名を生成します
 * @param {string} data - 署名するデータ
 * @param {string} privateKey - 秘密鍵（PEM形式）
 * @returns {string} - Base64エンコードされた署名
 */
export function signData(data, privateKey) {
  try {
    // 秘密鍵のフォーマットを修正するためのオプションを追加
    const options = {
      key: privateKey,
      padding: crypto.constants.RSA_PKCS1_PADDING
    };

    const sign = crypto.createSign('sha256');
    sign.update(data);
    sign.end();
    return sign.sign(options, 'base64');
  } catch (error) {
    console.error('Error signing data:', error);
    throw error;
  }
}

/**
 * 公開鍵で署名を検証します
 * @param {string} data - 署名されたデータ
 * @param {string} signature - 検証する署名
 * @param {string} publicKey - 公開鍵（PEM形式）
 * @returns {boolean} - 署名が有効な場合はtrue
 */
export function verifySignature(data, signature, publicKey) {
  const verify = crypto.createVerify('sha256');
  verify.update(data);
  verify.end();
  return verify.verify(publicKey, signature, 'base64');
}