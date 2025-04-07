/**
 * ActivityPubのWebFingerエンドポイントを提供するルーター
 * 他のFediverseサーバーからのアカウント発見リクエストを処理します
 */

import express from 'express';
import { generateWebFingerResponse } from '../models/actor.js';

const router = express.Router();

/**
 * WebFingerエンドポイント
 * GET /webfinger - リソースに関連するユーザー情報を返す
 */
router.get('/webfinger', async (req, res) => {
  try {
    // resource=acct:username@domain 形式のクエリパラメータを取得
    const resource = req.query.resource;
    
    if (!resource) {
      return res.status(400).json({ error: 'Resource query parameter is required' });
    }
    
    console.log(`[ActivityPub] WebFinger request for resource: ${resource}`);

    // acct:username@domain からusernameとdomainを抽出
    const match = resource.match(/^acct:([^@]+)@(.+)$/);
    
    if (!match) {
      return res.status(400).json({ error: 'Invalid resource format' });
    }
    
    const [, username, requestDomain] = match;
    
    // ドメインを確認
    const domain = process.env.NEXT_PUBLIC_SITE_DOMAIN.replace(/^https?:\/\//, '');
    
    if (requestDomain !== domain) {
      return res.status(404).json({ error: 'Domain not found' });
    }
    
    // WebFingerレスポンスを生成
    const response = await generateWebFingerResponse(username);
    
    if (!response) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // レスポンスをJSONで返す
    res.setHeader('Content-Type', 'application/jrd+json');
    return res.json(response);
  } catch (error) {
    console.error(`[ActivityPub] WebFinger error: ${error.message}`);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
