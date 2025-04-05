/**
 * ActivityPub機能のルーティング設定
 * 
 * このモジュールはActivityPubプロトコルに必要な各種エンドポイントを定義します。
 * WebFinger, Actor情報, Inbox, Outboxなどの基本的なエンドポイントを提供します。
 */

import bodyParser from 'body-parser';
import webfingerController from './controllers/webfinger.js';
import actorController from './controllers/actor.js';
import inboxController from './controllers/inbox.js';
import outboxController from './controllers/outbox.js';
import followController from './controllers/follow.js';
import nodeinfoController from './controllers/nodeinfo.js';

/**
 * ActivityPub関連のルートを登録します
 * @param {object} app - Expressアプリケーションインスタンス
 */
function setupRoutes(app) {
  // ActivityPub用のJSONミドルウェア（Content-Type: application/activity+json対応）
  const activityJsonParser = bodyParser.json({
    type: ['application/json', 'application/activity+json', 'application/ld+json']
  });

  // WebFinger
  app.get('/.well-known/webfinger', webfingerController.handleWebfinger);
  
  // NodeInfo
  app.get('/.well-known/nodeinfo', nodeinfoController.getNodeInfoLinks);
  app.get('/nodeinfo/:version', nodeinfoController.getNodeInfo);

  // Actor情報
  app.get('/users/:username', actorController.getActor);
  
  // 共有Inbox（サーバー全体のInbox）
  app.post('/inbox', activityJsonParser, inboxController.handleInbox);
  
  // ユーザー別Inbox
  app.post('/users/:username/inbox', activityJsonParser, inboxController.handleUserInbox);
  
  // Outbox（主に読み取り用、実際の配信は内部処理で行う）
  app.get('/users/:username/outbox', outboxController.getOutbox);
  
  // フォロワー一覧
  app.get('/users/:username/followers', followController.getFollowers);
  
  // フォロー中アカウント一覧
  app.get('/users/:username/following', followController.getFollowing);
}

export default setupRoutes;