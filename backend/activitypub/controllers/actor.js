/**
 * Actorコントローラー
 * 
 * ActivityPubのActor情報（ユーザープロファイル）を提供するコントローラーです。
 * Fediverseでのユーザー表示や相互フォローに必要な情報を提供します。
 */

const { findActorByUsername, createDefaultActorIfNotExists } = require('../models/actor');
const { getEnvDomain } = require('../utils/helpers');

/**
 * Actor情報（ユーザープロファイル）を取得します
 * @param {object} req - Expressリクエストオブジェクト
 * @param {object} res - Expressレスポンスオブジェクト
 */
async function getActor(req, res) {
  try {
    const { username } = req.params;
    const domain = getEnvDomain();
    
    // Accept: application/activity+json ヘッダーをチェック
    const acceptHeader = req.get('Accept') || '';
    const wantsActivityJson = acceptHeader.includes('application/activity+json') || 
                             acceptHeader.includes('application/ld+json');
    
    // ActivityPubリクエストでない場合はウェブサイトにリダイレクト
    if (!wantsActivityJson) {
      return res.redirect(`https://${domain}/@${username}`);
    }
    
    // Actorが存在しなければデフォルトのActorを作成
    await createDefaultActorIfNotExists(username);
    
    // Actor情報を取得
    const actor = await findActorByUsername(username);
    
    if (!actor) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // ActivityPub Actor形式のレスポンスを構築
    const actorResponse = {
      '@context': [
        'https://www.w3.org/ns/activitystreams',
        'https://w3id.org/security/v1'
      ],
      id: `https://${domain}/users/${username}`,
      type: 'Person',
      preferredUsername: username,
      name: actor.display_name || username,
      summary: actor.summary || '',
      inbox: `https://${domain}/users/${username}/inbox`,
      outbox: `https://${domain}/users/${username}/outbox`,
      followers: `https://${domain}/users/${username}/followers`,
      following: `https://${domain}/users/${username}/following`,
      publicKey: {
        id: `https://${domain}/users/${username}#main-key`,
        owner: `https://${domain}/users/${username}`,
        publicKeyPem: actor.public_key
      },
      icon: actor.icon ? {
        type: 'Image',
        mediaType: 'image/png',
        url: actor.icon
      } : undefined
    };
    
    // Content-Type: application/activity+json を設定
    res.setHeader('Content-Type', 'application/activity+json');
    return res.json(actorResponse);
    
  } catch (error) {
    console.error('Actor controller error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { getActor };