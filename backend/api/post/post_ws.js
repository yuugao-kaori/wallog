import express from 'express';
import WebSocket, { WebSocketServer } from 'ws';
import session from 'express-session';
import Redis from "ioredis";
import RedisStore from "connect-redis";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import pkg from 'pg';
const { Client } = pkg;
import cors from 'cors';
const router = express.Router();
const app = express();

dotenv.config();
console.log('.envファイルを認識しました。');
const { POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB, POSTGRES_NAME } = process.env;

const client = new Client({
    user: POSTGRES_USER,
    host: POSTGRES_NAME,
    database: POSTGRES_DB,
    password: POSTGRES_PASSWORD,
    port: 5432,
});

// 事前にデータベースに接続
client.connect().then(() => {
  console.log('PostgreSQLに接続しました');
}).catch(err => {
  console.error('データベース接続エラー:', err);
});

// WebSocketサーバーの設定
const wss = new WebSocketServer({ noServer: true });

// 投稿の取得用のヘルパー関数
const getPosts = async (offset = 0, limit = 10) => {
  const query = `
    SELECT * FROM post 
    ORDER BY created_at DESC 
    OFFSET $1 LIMIT $2
  `;
  const res = await client.query(query, [offset, limit]);
  return res.rows;
};

// クライアント接続時に最新10件の投稿を送信
wss.on('connection', async (ws) => {
  try {
    // 初回接続時に最新10件の投稿を取得
    const posts = await getPosts();
    ws.send(JSON.stringify(posts));

    // クライアントからメッセージを受け取ったとき（スクロール時に古い投稿を要求）
    ws.on('message', async (message) => {
      const data = JSON.parse(message);
      if (data.action === 'loadMore') {
        const offset = data.offset || 10; // オフセットを受け取り、デフォルトは10
        const morePosts = await getPosts(offset);
        ws.send(JSON.stringify(morePosts));
      }
    });

    // データベースのリスナーをセットアップして、テーブルに変更があった場合にクライアントに通知する
    client.on('notification', (msg) => {
      if (msg.channel === 'post_updates') {
        ws.send(JSON.stringify(msg.payload));
      }
    });

    // リアルタイムのリスニングを有効にするためのSQLコマンド
    await client.query('LISTEN post_updates');

    // 接続が切れたときの処理
    ws.on('close', () => {
      console.log('クライアントが切断されました');
    });
  } catch (err) {
    console.error('エラーが発生しました:', err);
  }
});

// WebSocketサーバーをExpressのサーバーに組み込む
app.post_sse = (server) => {
  server.on('upgrade', (request, socket, head) => {
    if (request.method === 'GET' && request.url === '/api/post/post_ws') {  // URLとGETリクエストのチェック
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });
};

export default app;