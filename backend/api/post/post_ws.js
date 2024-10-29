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
  
  // post_fileが"{""}"の場合に削除または置き換える
  const filteredPosts = res.rows.map(post => {
    if (post.post_file === '{""}') {
      delete post.post_file;
      // または
      // post.post_file = null;
    }
    return post;
  });

  return filteredPosts;
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
          let posts = await getPosts(offset);
          console.log('クライアントに配送する投稿データ:', posts); // 配送するデータをコンソールに出力

          // 追加のフィルタリング（必要に応じて）
          posts = posts.map(post => {
            if (post.post_file === '{""}') {
              delete post.post_file;
              // または
              // post.post_file = null;
            }
            return post;
          });

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
        console.log('新しい投稿を取得しました:', newPosts); // 新しい投稿をコンソールに出力

        // 新しい投稿のフィルタリング
        const filteredNewPosts = newPosts.map(post => {
          if (post.post_file === '{""}') {
            delete post.post_file;
            // または
            // post.post_file = null;
          }
          return post;
        });

        ws.send(JSON.stringify(filteredNewPosts));
        console.log('新しい投稿を配信しました:', filteredNewPosts); // 配信したデータをコンソールに出力
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
