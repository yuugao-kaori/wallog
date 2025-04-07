/**
 * ActivityPubのNodeInfoエンドポイントを提供するルーター
 * サーバー情報を他のFediverseサーバーに開示します
 */

import express from 'express';

const router = express.Router();

/**
 * NodeInfo情報発見エンドポイント
 * GET /.well-known/nodeinfo - NodeInfoリソースの場所を示す
 */
router.get('/nodeinfo', async (req, res) => {
  try {
    const domain = process.env.NEXT_PUBLIC_SITE_DOMAIN;
    
    // NodeInfo発見サービスのレスポンス
    const response = {
      links: [
        {
          rel: 'http://nodeinfo.diaspora.software/ns/schema/2.1',
          href: `${domain}/.well-known/nodeinfo/2.1`
        },
        {
          rel: 'http://nodeinfo.diaspora.software/ns/schema/2.0',
          href: `${domain}/.well-known/nodeinfo/2.0`
        }
      ]
    };
    
    // レスポンスをJSONで返す
    res.setHeader('Content-Type', 'application/json');
    return res.json(response);
  } catch (error) {
    console.error(`[ActivityPub] NodeInfo discovery error: ${error.message}`);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * NodeInfo 2.0 エンドポイント
 * GET /.well-known/nodeinfo/2.0 - サーバー情報を返す
 */
router.get('/nodeinfo/2.0', async (req, res) => {
  try {
    const domain = process.env.NEXT_PUBLIC_SITE_DOMAIN.replace(/^https?:\/\//, '');
    
    // NodeInfo 2.0のレスポンス
    const response = {
      version: '2.0',
      software: {
        name: 'wallog',
        version: '0.1.0'
      },
      protocols: ['activitypub'],
      services: {
        inbound: [],
        outbound: []
      },
      openRegistrations: false,
      usage: {
        users: {
          total: 1,
          activeMonth: 1,
          activeHalfyear: 1
        },
        localPosts: 0
      },
      metadata: {
        nodeName: '星天想記',
        nodeDescription: 'ブログ「星天想記」の更新情報をお届けします'
      }
    };
    
    // レスポンスをJSONで返す
    res.setHeader('Content-Type', 'application/json; profile="http://nodeinfo.diaspora.software/ns/schema/2.0#"');
    return res.json(response);
  } catch (error) {
    console.error(`[ActivityPub] NodeInfo 2.0 error: ${error.message}`);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * NodeInfo 2.1 エンドポイント
 * GET /.well-known/nodeinfo/2.1 - サーバー情報を返す
 */
router.get('/nodeinfo/2.1', async (req, res) => {
  try {
    const domain = process.env.NEXT_PUBLIC_SITE_DOMAIN.replace(/^https?:\/\//, '');
    
    // NodeInfo 2.1のレスポンス
    const response = {
      version: '2.1',
      software: {
        name: 'wallog',
        version: '0.1.0',
        repository: 'https://github.com/username/wallog'
      },
      protocols: ['activitypub'],
      services: {
        inbound: [],
        outbound: []
      },
      openRegistrations: false,
      usage: {
        users: {
          total: 1,
          activeMonth: 1,
          activeHalfyear: 1
        },
        localPosts: 0
      },
      metadata: {
        nodeName: '星天想記',
        nodeDescription: 'ブログ「星天想記」の更新情報をお届けします'
      }
    };
    
    // レスポンスをJSONで返す
    res.setHeader('Content-Type', 'application/json; profile="http://nodeinfo.diaspora.software/ns/schema/2.1#"');
    return res.json(response);
  } catch (error) {
    console.error(`[ActivityPub] NodeInfo 2.1 error: ${error.message}`);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;