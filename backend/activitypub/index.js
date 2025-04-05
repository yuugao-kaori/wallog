/**
 * ActivityPubモジュールのエントリーポイント
 *
 * ActivityPubプロトコルに関連する全てのルートとミドルウェアを設定します。
 */

import express from 'express';
import webfingerRoutes from './routes/webfinger.js';
import nodeinfoRoutes from './routes/nodeinfo.js';  // NodeInfoルートをインポート
import usersRoutes from './routes/users.js';  // ユーザールートをインポート
import inboxRoutes from './routes/inbox.js';  // インボックスルートをインポート
import objectRoutes from './routes/object.js';  // オブジェクトルートをインポート
// 他のルーティングもインポート

const router = express.Router();
const usersRouter = express.Router();  // ユーザー用の別ルーター
const inboxRouter = express.Router();  // インボックス用の別ルーター
const objectRouter = express.Router();  // オブジェクト用の別ルーター

// ActivityPubリクエスト用に専用のJSONパーサーを設定
// bodyParserの制限を増やし、大きなActivityPubペイロードも処理できるようにする
const jsonParser = express.json({
  type: ['application/json', 'application/activity+json', 'application/ld+json'],
  limit: '1mb'
});

// WebFingerルーティングを適用
router.use('/', webfingerRoutes);
// NodeInfoルーティングを適用
router.use('/', nodeinfoRoutes);

// ユーザールーターにJSONパーサーを適用
usersRouter.use(jsonParser);
// インボックスルーターにJSONパーサーを適用
inboxRouter.use(jsonParser);
// オブジェクトルーターにJSONパーサーを適用
objectRouter.use(jsonParser);

// ユーザールーティングを適用
usersRouter.use('/', usersRoutes);
// インボックスルーティングを適用
usersRouter.use('/', inboxRoutes);
// 共有インボックスルーティングを適用
inboxRouter.use('/', inboxRoutes);
// オブジェクトルーティングを適用
objectRouter.use('/', objectRoutes);

/**
 * Express アプリケーションにActivityPubルートを設定する
 * @param {Express} app - Express アプリケーションインスタンス
 */
export function setup(app) {
  console.log('ActivityPubルートを設定しています...');
  app.use('/.well-known', router);
  app.use('/users', usersRouter);  // /users パス用のルーターを追加
  app.use('/inbox', inboxRouter);  // 共有インボックス用のルーターを追加
  app.use('/objects', objectRouter);  // オブジェクト用のルーターを追加
}

export default router;