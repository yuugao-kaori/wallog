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
import { findActivityByLocalPostId } from '../../activitypub/models/outbox.js'; // 新しく追加
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

// ファイルIDから添付ファイル情報を取得する関数
async function getFileAttachments(fileIds) {
  if (!fileIds) return [];
  
  // 様々な形式のファイルID処理に対応
  let fileIdArray = [];
  
  if (typeof fileIds === 'string') {
    // JSON文字列の可能性をチェック
    if (fileIds.startsWith('{') && fileIds.endsWith('}')) {
      // カッコを削除して中身を取得
      const content = fileIds.substring(1, fileIds.length - 1);
      // 引用符があれば削除して配列に
      fileIdArray = [content.replace(/^"|"$/g, '')];
      console.log(`JSONライクな形式のファイルIDを処理: ${fileIdArray}`);
    } else {
      // カンマ区切りの文字列形式の場合、配列に分割
      fileIdArray = fileIds.split(',').map(id => id.trim()).filter(Boolean);
      console.log(`カンマ区切りのファイルIDを処理: ${fileIdArray}`);
    }
  } else if (Array.isArray(fileIds)) {
    fileIdArray = fileIds;
    console.log(`配列形式のファイルIDを処理: ${fileIdArray}`);
  }
  
  if (fileIdArray.length === 0) return [];
  
  try {
    // driveテーブルからファイル情報を取得
    const fileQuery = `
      SELECT 
        file_id, 
        file_originalname, 
        file_format, 
        file_exif_title, 
        file_exif_description
      FROM drive 
      WHERE file_id = ANY($1)
    `;
    
    console.log(`ファイル情報を取得: ${fileIdArray.join(', ')}`);
    const result = await query(fileQuery, [fileIdArray]);
    console.log(`ファイル情報取得結果: ${result.rows.length}件`);
    
    // ファイル情報をActivityPub attachment形式に変換
    return result.rows.map(file => {
      // MIMEタイプの判定（formatからの推測）
      let mediaType = 'application/octet-stream'; // デフォルト
      
      // ファイルIDとoriginalname/formatが.webpで終わる場合の特別処理
      const fileIdStr = file.file_id ? file.file_id.toString() : '';
      const originalName = file.file_originalname ? file.file_originalname.toString() : '';
      const formatStr = file.file_format ? file.file_format.toString() : '';
      
      // ファイル名やファイルIDに拡張子情報が含まれている場合の処理
      if (fileIdStr.endsWith('.webp') || originalName.endsWith('.webp') || formatStr.toLowerCase() === 'webp') {
        mediaType = 'image/webp';
      } else if (fileIdStr.endsWith('.png.webp') || originalName.endsWith('.png.webp')) {
        // オリジナルがPNGでWebPに変換された場合でも、WebPとして送信
        mediaType = 'image/webp';
      } else if (file.file_format) {
        // 通常の拡張子からのMIMEタイプ判定
        const format = file.file_format.toLowerCase();
        if (['jpg', 'jpeg', 'jfif'].includes(format)) {
          mediaType = 'image/jpeg';
        } else if (format === 'png') {
          mediaType = 'image/png';
        } else if (format === 'gif') {
          mediaType = 'image/gif';
        } else if (format === 'webp') {
          mediaType = 'image/webp';
        } else if (format === 'mp4') {
          mediaType = 'video/mp4';
        } else if (format === 'mp3') {
          mediaType = 'audio/mpeg';
        } else if (format === 'svg') {
          mediaType = 'image/svg+xml';
        } else if (format === 'pdf') {
          mediaType = 'application/pdf';
        }
      }
      
      // ファイルIDから拡張子を取得する追加チェック
      if (mediaType === 'application/octet-stream' && fileIdStr) {
        if (fileIdStr.endsWith('.jpg') || fileIdStr.endsWith('.jpeg')) {
          mediaType = 'image/jpeg';
        } else if (fileIdStr.endsWith('.png')) {
          mediaType = 'image/png';
        } else if (fileIdStr.endsWith('.gif')) {
          mediaType = 'image/gif';
        } else if (fileIdStr.endsWith('.webp')) {
          mediaType = 'image/webp';
        } else if (fileIdStr.endsWith('.mp4')) {
          mediaType = 'video/mp4';
        } else if (fileIdStr.endsWith('.mp3')) {
          mediaType = 'audio/mpeg';
        }
      }
      
      console.log(`ファイル "${file.file_id}" のMIMEタイプを設定: ${mediaType}`);
      
      // 説明文の設定
      const name = file.file_exif_title || file.file_exif_description || file.file_originalname || '';
      
      // ファイルのURLを構築
      const url = `https://wallog.seitendan.com/api/drive/file/${file.file_id}`;
      
      return {
        type: 'Document',
        mediaType: mediaType,
        url: url,
        name: name
      };
    });
  } catch (error) {
    console.error('ファイル情報の取得中にエラーが発生しました:', error);
    return [];
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
              url: `https://wallog.seitendan.com/diary/${newPost.post_id}`
            };

            // 添付ファイル情報を取得してActivityPubのattachmentに追加
            const attachments = await getFileAttachments(newPost.post_file);
            if (attachments.length > 0) {
              postData.attachment = attachments;
              console.log('添付ファイル情報がActivityPubに追加されました:', attachments);
            }

            // もし引用（リポスト）IDがある場合、ActivityPubでの引用情報を追加
            if (req.body.repost_id) {
              // ap_outboxテーブルから引用元の投稿を検索
              const quotedActivity = await findActivityByLocalPostId(req.body.repost_id);
              
              if (quotedActivity) {
                console.log(`引用元の投稿が見つかりました: ${req.body.repost_id}`);
                
                // ActivityPubの引用元情報をセット
                const parsedData = typeof quotedActivity.data === 'string' ? 
                  JSON.parse(quotedActivity.data) : quotedActivity.data;
                
                // Note: quoteOf属性に引用元のオブジェクトIDを設定
                postData.quoteOf = parsedData.object.id;
                console.log(`ActivityPubの引用として設定: ${postData.quoteOf}`);
              } else {
                console.log(`引用元の投稿がActivityPubレコードに見つかりませんでした: ${req.body.repost_id}`);
                
                // 引用元が見つからない場合は、URLとして引用文字列を追加
                const quoteUrl = `https://wallog.seitendan.com/diary/${req.body.repost_id}`;
                postData.quoteUrl = quoteUrl;
                console.log(`引用URLとして追加: ${quoteUrl}`);
              }
            }
            
            // もし返信（リプライ）IDがある場合、ActivityPubでの返信情報を追加
            if (req.body.reply_id) {
              // ap_outboxテーブルから返信先の投稿を検索
              const replyToActivity = await findActivityByLocalPostId(req.body.reply_id);
              
              if (replyToActivity) {
                console.log(`返信先の投稿が見つかりました: ${req.body.reply_id}`);
                
                // ActivityPubの返信先情報をセット
                const parsedData = typeof replyToActivity.data === 'string' ? 
                  JSON.parse(replyToActivity.data) : replyToActivity.data;
                
                // inReplyTo属性に返信先のオブジェクトIDを設定
                postData.inReplyTo = parsedData.object.id;
                console.log(`返信先として設定: ${postData.inReplyTo}`);
              } else {
                console.log(`返信先の投稿がActivityPubレコードに見つかりませんでした: ${req.body.reply_id}`);
                
                // 返信先が見つからない場合は、返信テキストを内容に追加
                const replyUrl = `https://wallog.seitendan.com/diary/${req.body.reply_id}`;
                if (!postData.content.includes(replyUrl)) {
                  postData.content = `返信: ${replyUrl}\n\n${postData.content}`;
                }
                console.log(`返信URLとして本文に追加: ${replyUrl}`);
              }
            }
            
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
