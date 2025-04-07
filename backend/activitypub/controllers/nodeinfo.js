/**
 * NodeInfoコントローラー
 *
 * NodeInfo 2.0/2.1 プロトコル対応のためのコントローラー
 * https://nodeinfo.diaspora.software/
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ESモジュールで__dirnameを取得するための設定
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * NodeInfo ディスカバリースキーマを返す
 * @param {Object} req - リクエストオブジェクト
 * @param {Object} res - レスポンスオブジェクト
 */
export const getNodeInfoSchema = (req, res) => {
  const schema = {
    links: [
      {
        rel: "http://nodeinfo.diaspora.software/ns/schema/2.0",
        href: `${req.protocol}://${req.get('host')}/.well-known/nodeinfo/2.0`
      },
      {
        rel: "http://nodeinfo.diaspora.software/ns/schema/2.1",
        href: `${req.protocol}://${req.get('host')}/.well-known/nodeinfo/2.1`
      }
    ]
  };
  
  res.json(schema);
};

/**
 * NodeInfo データを返す
 * @param {Object} req - リクエストオブジェクト
 * @param {Object} res - レスポンスオブジェクト
 */
export const getNodeInfo = (req, res) => {
  // NodeInfo バージョンを決定（URLパスから）
  const version = req.path.includes('2.0') ? '2.0' : '2.1';
  
  // 基本的なNodeInfoレスポンス
  const nodeInfo = {
    version: version,
    software: {
      name: "wallog",
      version: packageData.version || "1.0.0"
    },
    protocols: ["activitypub"],
    services: {
      inbound: [],
      outbound: []
    },
    openRegistrations: false,
    usage: {
      users: {
        total: 1,  // 管理者のみ
        activeMonth: 1,
        activeHalfyear: 1
      },
      localPosts: 0, // TODO: 実際の投稿数を集計する機能を追加する
      localComments: 0
    },
    metadata: {
      nodeName: "Wallog",
      nodeDescription: "A personal blogging and note-taking platform"
    }
  };
  
  res.json(nodeInfo);
};