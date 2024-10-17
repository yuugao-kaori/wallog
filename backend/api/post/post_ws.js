import WebSocket, { WebSocketServer } from 'ws';
import dotenv from "dotenv";
import pkg from 'pg';
const { Client } = pkg;

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

// 投稿の取得用のヘルパー関数
const getPosts = async (offset = 0, limit = 10) => {
  const query = `
    SELECT post_id, user_id, post_text, post_createat, post_updateat, post_tag, post_file, post_attitude
    FROM post 
    ORDER BY post_createat DESC 
    OFFSET $1 LIMIT $2
  `;
  const res = await client.query(query, [offset, limit]);
  return res.rows;
};

const setupWebSocket = (server) => {
  const wss = new WebSocketServer({ server, path: '/api/post/post_ws' });

  wss.on('connection', async (ws) => {
    console.log('新しいWebSocket接続が確立されました');

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message);
        if (data.action === 'loadMore') {
          const offset = data.offset || 0;
          const posts = await getPosts(offset);
          ws.send(JSON.stringify(posts));
        }
      } catch (error) {
        console.error('メッセージの処理中にエラーが発生しました:', error);
      }
    });

    // データベースのリスナーをセットアップ
    const listener = async (notification) => {
      console.log('通知を受信しました:', notification);
      if (notification.channel === 'post_updates') {
        const newPosts = await getPosts(0, 1);
        console.log('新しい投稿を取得しました:', newPosts);
        ws.send(JSON.stringify(newPosts));
        console.log('新しい投稿を配信しました:', newPosts);
      }
    };
    client.on('notification', listener);

    // リアルタイムのリスニングを有効にする
    await client.query('LISTEN post_updates');

    ws.on('close', () => {
      console.log('WebSocket接続が閉じられました');
      client.removeListener('notification', listener);
    });
  });
};

export default setupWebSocket;