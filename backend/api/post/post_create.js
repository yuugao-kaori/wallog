import express from 'express';
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
import { Client as ESClient } from '@elastic/elasticsearch';
// ActivityPub関連のモジュールをインポート
import { findActorByUsername } from '../../activitypub/models/actor.js';
import { createNoteActivity, saveOutboxActivity } from '../../activitypub/models/activity.js';
import { announceNewPost, deliverToFollowers } from '../../activitypub/services/delivery.js';
// データベースクエリ関数をインポート
import { query } from '../../db/db.js';

// bodyParserが必要な場合
app.use(express.json());

// Redisクライアント作成
const redis = new Redis({
  port: 6379,
  host: "redis", // Redisコンテナの名前
});

// express-sessionの設定
router.use(
  session({
    store: new RedisStore({ client: redis }),
    secret: 'my_secret_key', // 任意のシークレットキー
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 1440 * 60 * 1000, // 1000日間セッションを保持
      httpOnly: true,
      secure: false, // テスト環境用にsecureはfalse
    },
    rolling: true, // セッションアクティビティでセッションを更新
  })
);

// タグを取得または作成してそのIDを返すヘルパー関数
async function getOrCreateTagId(client, tag) {
  const cleanedTag = tag.startsWith('#') ? tag.slice(1) : tag; // 先頭の'#'を削除
  // タグが既に存在するかチェック
  const selectQuery = 'SELECT post_tag_id FROM post_tag WHERE post_tag_id = $1';
  const selectResult = await client.query(selectQuery, [cleanedTag]);

  if (selectResult.rows.length > 0) {
    return selectResult.rows[0].post_tag_id;
  } else {
    // タグが存在しない場合、新しく挿入
    const insertQuery = 'INSERT INTO post_tag (post_tag_id, post_tag_text) VALUES ($1, $2) RETURNING post_tag_id';
    const insertResult = await client.query(insertQuery, [cleanedTag, tag]);
    return insertResult.rows[0].post_tag_id;
  }
}

// 日付フォーマット関数
function formattedDateTime(date) {
  const y = date.getFullYear();
  const m = ('0' + (date.getMonth() + 1)).slice(-2);
  const d = ('0' + date.getDate()).slice(-2);
  const h = ('0' + date.getHours()).slice(-2);
  const mi = ('0' + date.getMinutes()).slice(-2);
  const s = ('0' + date.getSeconds()).slice(-2);

  return `${y}${m}${d}${h}${mi}${s}`;
}



// Elasticsearchクライアントの初期化
const esClient = new ESClient({
  node: `http://${process.env.ELASTICSEARCH_HOST}:${process.env.ELASTICSEARCH_PORT}`,
  auth: {
    username: process.env.ELASTICSEARCH_USER,
    password: process.env.ELASTICSEARCH_PASSWORD,
  },
  maxRetries: 5,
  requestTimeout: 60000,
  sniffOnStart: true,
  ssl: {
    rejectUnauthorized: false,
  },
});

// 投稿をElasticsearchにインデックス登録する関数
async function indexPostToElasticsearch(post) {
  try {
    await esClient.index({
      index: 'post',
      id: post.post_id,
      body: {
        post_id: post.post_id,
        post_text: post.post_text,
        post_createat: post.post_createat || new Date().toISOString(),
        post_tag: post.post_tag,
      },
    });
    console.log(`Elasticsearchにインデックス登録された投稿ID: ${post.post_id}`);
  } catch (error) {
    console.error('Elasticsearchへのインデックス登録中にエラーが発生しました:', error);
    throw error;
  }
}


// 投稿とハッシュタグを挿入する関数
async function insertPostAndTags(postId, postText, fileId, tags, parsedSession, repostId, replyId) {
  const client = new Client({
    user: process.env.POSTGRES_USER,
    host: process.env.POSTGRES_NAME,
    database: process.env.POSTGRES_DB,
    password: process.env.POSTGRES_PASSWORD,
    port: 5432,
  });

  try {
    // PostgreSQLクライアントに接続
    await client.connect();
    console.log('PostgreSQLに接続しました。');

    // トランザクションを開始
    await client.query('BEGIN');

    // 元の投稿を更新（リポストまたはリプライの場合）
    if (repostId) {
      await client.query(
        'UPDATE post SET repost_receive_id = array_append(COALESCE(repost_receive_id, ARRAY[]::numeric[]), $1) WHERE post_id = $2',
        [postId, repostId]
      );
      console.log(`投稿 ${repostId} のrepost_receive_idを更新しました`);
    }

    if (replyId) {
      await client.query(
        'UPDATE post SET reply_receive_id = array_append(COALESCE(reply_receive_id, ARRAY[]::numeric[]), $1) WHERE post_id = $2',
        [postId, replyId]
      );
      console.log(`投稿 ${replyId} のreply_receive_idを更新しました`);
    }

    // postテーブルに挿入
    const insertPostQuery = `
      INSERT INTO post (post_id, user_id, post_text, post_tag, post_hashtag, post_file, post_attitude, repost_grant_id, reply_grant_id)
      VALUES ($1, $2, $3, $4, $5, $6, 1, $7, $8)
      RETURNING *;
    `;
    const postValues = [
      postId,
      parsedSession.username,
      postText,
      tags.length > 0 ? tags.join(' ') : 'none_data',
      tags.length > 0 ? tags : null,  // post_hashtagにタグ配列を設定
      fileId,
      repostId || null,  // repost_idが存在しない場合はnull
      replyId || null    // reply_idが存在しない場合はnull

    ];

    const postResult = await client.query(insertPostQuery, postValues);
    if (postResult.rows.length === 0) {
      throw new Error('投稿の挿入に失敗しました。');
    }
    const newPost = postResult.rows[0];
    console.log('投稿が挿入されました:', newPost);

    // タグが存在する場合は処理を行う
    if (tags.length > 0) {
      // タグIDを格納する配列
      const tagIds = [];

      // 各タグについてIDを取得または作成
      for (const tag of tags) {
        const tagId = await getOrCreateTagId(client, tag);
        tagIds.push(tagId);
      }

      // posts_post_tagsテーブルへの挿入ステートメントを準備
      const insertTagsQuery = `
        INSERT INTO posts_post_tags (post_id, post_tag_id)
        VALUES ${tagIds.map((_, idx) => `($1, $${idx + 2})`).join(', ')}
      `;
      const tagValues = [postId, ...tagIds];

      await client.query(insertTagsQuery, tagValues);
      console.log('タグがposts_post_tagsに挿入されました。');
    }

    // トランザクションをコミット
    await client.query('COMMIT');
    return newPost;
  } catch (err) {
    // エラー発生時はロールバック
    await client.query('ROLLBACK');
    throw err;
  } finally {
    // クライアントを切断
    await client.end();
    console.log('PostgreSQLから切断しました。');
  }
}

// セッション確認APIの実装
router.post('/post_create', async (req, res) => {
  // セッションが存在しない場合
  if (!req.session) {
    console.error('Session object is not found.');
    return res.status(401).json({ error: 'Session object not found' });
  }

  // セッションIDを取得
  const sessionId = req.sessionID;
  console.log(`Session ID: ${sessionId}`);

  try {
    // Redisからセッション情報を取得
    const sessionData = await redis.get(`sess:${sessionId}`);

    if (!sessionData) {
      console.warn('No session data found in Redis for this session ID.');
      return res.status(401).json({ error: 'No session data found' });
    }

    // セッションデータをパースして username を確認
    const parsedSession = JSON.parse(sessionData);

    if (!parsedSession.username) {
      console.warn('Session exists, but username is not set.');
      return res.status(401).json({ error: 'User not logged in' });
    }

    // 成功レスポンス
    console.log(`Session check successful: username = ${parsedSession.username}`);

    // 環境変数の読み取り実装
    const envFilePath = './.env';

    if (fs.existsSync(envFilePath)) {
      dotenv.config();
      console.log('.envファイルを認識しました。');

      // 日付と投稿IDの生成
      const date = new Date();
      const now = formattedDateTime(date);
      const randomDigits = Math.floor(Math.random() * 1000000).toString().padStart(6, '0'); // 6桁の乱数
      const post_id = now + randomDigits;
      console.log(`Generated Post ID: ${post_id}`);
      console.log(`Post Text: ${req.body.post_text}`);

      // 投稿テキストからハッシュタグを抽出
      const post_text_mid = req.body.post_text;
      let post_tags = post_text_mid.match(/(?<=\s|^)#\S+(?=\s|$)/g);
      if (post_tags) {
        console.log("抽出されたハッシュタグ:", post_tags);
      } else {
        console.log("ハッシュタグは抽出されませんでした。");
        post_tags = []; // ハッシュタグがない場合は空配列に設定
      }

      // 投稿とタグを挿入
      try {
        console.log('処理開始');
        const newPost = await insertPostAndTags(
          post_id, 
          req.body.post_text, 
          req.body.post_file, 
          post_tags, 
          parsedSession,
          req.body.repost_id,  // 新しく追加
          req.body.reply_id    // 新しく追加
        );
        console.log('New post:', newPost);
        // 新しい投稿をElasticsearchにインデックス登録
        await indexPostToElasticsearch(newPost);

        // ActivityPub連携処理
        try {
          // 常にadminユーザーからの投稿として処理
          const actor = await findActorByUsername('admin');
          if (actor) {
            console.log('アクター情報:', JSON.stringify(actor));
            
            // 投稿データをActivityPub形式に合わせる
            const postData = {
              content: newPost.post_text,
              tags: newPost.post_hashtag || [],
              url: `https://wallog.seitendan.com/posts/${newPost.post_id}`
            };
            
            // ap_actorsテーブルからデータベースのactor IDを取得
            const actorResult = await query(
              'SELECT id FROM ap_actors WHERE username = $1 AND domain = $2',
              ['admin', 'wallog.seitendan.com']
            );
            
            if (actorResult.rows.length === 0) {
              throw new Error('Actor ID not found in database');
            }
            
            const actorId = actorResult.rows[0].id;
            console.log('データベースのactor ID:', actorId);
            
            // ActivityPubアクティビティの作成と配信
            const noteActivity = createNoteActivity(actor, postData);
            await saveOutboxActivity(noteActivity, actorId, newPost.post_id);
            await deliverToFollowers(noteActivity, actor);
            console.log('ActivityPub連携が成功しました。');
          } else {
            console.warn('ActivityPub actorが見つかりませんでした。');
          }
        } catch (apError) {
          // ActivityPub連携のエラーは記録するだけで、投稿自体は成功とする
          console.error('ActivityPub連携中にエラーが発生しました:', apError);
        }

        return res.status(200).json({ created_note: newPost });
      } catch (err) {
        console.error('Error:', err);
        return res.status(500).json({ error: err.message || 'Internal server error' });
      }

    } else {
      console.error('.envファイルが存在しません。');
      return res.status(500).json({ error: '.envファイルが存在しません。' });
    }

  } catch (error) {
    console.error('Error while retrieving session from Redis:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// アプリ終了時にElasticsearchクライアントを閉じる
process.on('exit', async () => {
  await esClient.close();
  console.log('Elasticsearchクライアントが正常に終了しました。');
});

app.use('', router);

export default app;
