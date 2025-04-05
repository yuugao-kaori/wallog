/**
 * WebFingerコントローラー
 * 
 * WebFingerプロトコル（RFC7033）に対応し、Fediverseでのアカウント検索のためのエンドポイントを提供します。
 */

import { findActorByUsername } from '../models/actor.js';
import { getEnvDomain } from '../utils/helpers.js';
/**
 * WebFingerリクエストを処理します
 * @param {object} req - Expressリクエストオブジェクト
 * @param {object} res - Expressレスポンスオブジェクト
 */
async function handleWebfinger(req, res) {
  try {
    const resource = req.query.resource;
    
    // リソースパラメータがない場合はエラー
    if (!resource) {
      return res.status(400).json({ error: 'Resource parameter is required' });
    }
    
    // acct:username@domain 形式からユーザー名とドメインを抽出
    const match = resource.match(/^acct:([^@]+)@(.+)$/);
    if (!match) {
      return res.status(400).json({ error: 'Invalid resource format' });
    }
    
    const [, username, domain] = match;
    const localDomain = getEnvDomain();
    
    // ドメインが一致しない場合は404
    if (domain !== localDomain) {
      return res.status(404).json({ error: 'Resource not found' });
    }
    
    // ユーザーの存在確認
    const actor = await findActorByUsername(username);
    if (!actor) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // WebFingerレスポンスを構築
    const response = {
      subject: `acct:${username}@${domain}`,
      aliases: [
        `https://${domain}/users/${username}`,
        `https://${domain}/@${username}`
      ],
      links: [
        {
          rel: 'self',
          type: 'application/activity+json',
          href: `https://${domain}/users/${username}`
        },
        {
          rel: 'http://webfinger.net/rel/profile-page',
          type: 'text/html',
          href: `https://${domain}/@${username}`
        }
      ]
    };
    
    // JRDレスポンスを返す
    res.setHeader('Content-Type', 'application/jrd+json');
    return res.json(response);
    
  } catch (error) {
    console.error('WebFinger error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export {
  handleWebfinger
};