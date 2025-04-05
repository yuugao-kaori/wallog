/**
 * ActivityPubのオブジェクトエンドポイント
 * 
 * 投稿（Note）などのオブジェクトにアクセスするためのエンドポイント
 * 他のサーバーからのGETリクエストに応答する
 */

import express from 'express';
import { findObjectById } from '../models/activity.js';
import { query } from '../../db/db.js';
import pkg from 'pg';
const { Client } = pkg;

const router = express.Router();

/**
 * Fediverse互換性のためのコンテキスト
 * 標準のActivityStreamsに加えてfedibird.comのコンテキストも追加
 */
const EXTENDED_CONTEXT = [
  'https://www.w3.org/ns/activitystreams',
  'https://w3id.org/security/v1',
  'https://fedibird.com'
];

/**
 * GET /objects/:objectId - オブジェクトの取得
 */
router.get('/:objectId', async (req, res) => {
  // アクセプトヘッダーを設定
  res.setHeader('Content-Type', 'application/activity+json; charset=utf-8');
  
  try {
    const { objectId } = req.params;
    // console.log(`[ActivityPub] Received request for object: ${objectId}`);
    
    // オブジェクトIDからActivityPubオブジェクトを検索
    const fullObjectId = `https://wallog.seitendan.com/objects/${objectId}`;
    let objectData = await findObjectById(fullObjectId);
    
    // オブジェクトが見つからない場合
    if (!objectData) {
      console.log(`[ActivityPub] Object not found: ${objectId}`);
      
      // 短いIDの場合、データベースから投稿を直接検索
      const client = new Client({
        user: process.env.POSTGRES_USER,
        host: process.env.POSTGRES_NAME,
        database: process.env.POSTGRES_DB,
        password: process.env.POSTGRES_PASSWORD,
        port: 5432,
      });
      
      try {
        await client.connect();
        const postQuery = 'SELECT * FROM post WHERE post_id = $1';
        const postResult = await client.query(postQuery, [objectId]);
        
        if (postResult.rows.length > 0) {
          const post = postResult.rows[0];
          
          // 投稿からActivityPubオブジェクトを構築
          const domain = 'wallog.seitendan.com';
          const actorUrl = `https://${domain}/users/admin`; // 適切なユーザー名に置き換える
          
          const noteObject = {
            '@context': EXTENDED_CONTEXT,
            id: `https://${domain}/objects/${objectId}`,
            type: 'Note',
            published: new Date(post.post_createat).toISOString(),
            attributedTo: actorUrl,
            content: post.post_text,
            to: ['https://www.w3.org/ns/activitystreams#Public'],
            cc: [`${actorUrl}/followers`]
          };
          
          // ファイル（メディア）がある場合
          if (post.post_file) {
            try {
              const fileIds = JSON.parse(post.post_file);
              if (Array.isArray(fileIds) && fileIds.length > 0) {
                noteObject.attachment = fileIds.map(fileId => {
                  return {
                    type: 'Document',
                    url: `https://${domain}/api/drive/file/${fileId}`,
                    mediaType: 'image/jpeg' // 適切なメディアタイプを特定するロジックが必要
                  };
                });
              }
            } catch (err) {
              console.error('Error parsing post_file:', err);
            }
          }
          
          // タグがある場合
          if (post.post_tag) {
            try {
              const tags = JSON.parse(post.post_tag);
              if (Array.isArray(tags) && tags.length > 0) {
                noteObject.tag = tags.map(tag => {
                  return {
                    type: 'Hashtag',
                    name: `#${tag}`,
                    href: `https://${domain}/tags/${tag}`
                  };
                });
              }
            } catch (err) {
              console.error('Error parsing post_tag:', err);
            }
          }
          
          console.log(`[ActivityPub] Constructed Note object for post: ${objectId}`);
          return res.status(200).json(noteObject);
        }
      } catch (err) {
        console.error(`[ActivityPub] Error fetching post from database: ${err.message}`);
      } finally {
        await client.end();
      }
      
      return res.status(404).json({
        error: 'Object not found'
      });
    }
    
    // dataフィールドからオブジェクトを解析
    let returnObject;
    
    if (objectData.source === 'outbox') {
      // outboxの場合はdataフィールドを解析してobjectを取得
      const activityData = typeof objectData.data === 'string' ? JSON.parse(objectData.data) : objectData.data;
      
      if (activityData.type === 'Create') {
        returnObject = activityData.object;
      } else {
        returnObject = activityData;
      }
    } else {
      // inboxの場合は直接オブジェクトを返す
      returnObject = typeof objectData.data === 'string' ? JSON.parse(objectData.data) : objectData.data;
    }
    
    if (!returnObject) {
      console.log(`[ActivityPub] Could not extract object data: ${objectId}`);
      return res.status(404).json({
        error: 'Object data extraction failed'
      });
    }
    
    // @contextを拡張して確実にfedibird.comの互換性を持たせる
    if (returnObject['@context']) {
      // 既存の@contextが配列でない場合は配列に変換
      if (!Array.isArray(returnObject['@context'])) {
        returnObject['@context'] = [returnObject['@context']];
      }
      
      // fedibird.comのコンテキストがまだ含まれていない場合は追加
      if (!returnObject['@context'].includes('https://fedibird.com')) {
        returnObject['@context'].push('https://fedibird.com');
      }
    } else {
      // @contextが存在しない場合は拡張コンテキストを設定
      returnObject['@context'] = EXTENDED_CONTEXT;
    }
    
    // console.log(`[ActivityPub] Successfully returned object: ${objectId}`);
    return res.status(200).json(returnObject);
    
  } catch (error) {
    console.error(`[ActivityPub] Error handling object request: ${error.message}`);
    console.error(error.stack);
    return res.status(500).json({
      error: 'Internal server error'
    });
  }
});

export default router;