import express from 'express';
import session from 'express-session';
import Redis from "ioredis";
import RedisStore from "connect-redis";
import dotenv from "dotenv";
import fs from "fs";
import pkg from 'pg';
const { Client } = pkg;
import { Client as ESClient } from '@elastic/elasticsearch';
import { markdownToHtml } from './blog_purse.js';
import { extractDescriptionFromHtml } from './blog_helper.js';

const router = express.Router();
const app = express();

// Redisクライアント作成
const redis = new Redis({
  port: 6379,
  host: "redis",
});

// Elasticsearchクライアント作成
const esClient = new ESClient({
  node: `http://${process.env.ELASTICSEARCH_HOST}:${process.env.ELASTICSEARCH_PORT}`,
  auth: {
    username: process.env.ELASTICSEARCH_USER,
    password: process.env.ELASTICSEARCH_PASSWORD
  }
});

// express-sessionの設定
router.use(
  session({
    store: new RedisStore({ client: redis }),
    secret: 'my_secret_key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 1440 * 60 * 1000,
      httpOnly: true,
      secure: false,
    },
    rolling: true,
  })
);

// タグを取得または作成するヘルパー関数
async function getOrCreateTagId(client, tag) {
  const cleanedTag = tag.startsWith('#') ? tag.slice(1) : tag;
  const selectQuery = 'SELECT blog_tag_id FROM blog_tag WHERE blog_tag_id = $1';
  const selectResult = await client.query(selectQuery, [cleanedTag]);

  if (selectResult.rows.length > 0) {
    return selectResult.rows[0].blog_tag_id;
  } else {
    const insertQuery = 'INSERT INTO blog_tag (blog_tag_id, blog_tag_text) VALUES ($1, $2) RETURNING blog_tag_id';
    const insertResult = await client.query(insertQuery, [cleanedTag, cleanedTag]);
    return insertResult.rows[0].blog_tag_id;
  }
}

// ブログをElasticsearchにインデックス登録する関数
async function indexBlogToElasticsearch(blog) {
  try {
    await esClient.index({
      index: process.env.ELASTICSEARCH_INDEX2,
      id: blog.blog_id,
      body: {
        blog_id: blog.blog_id,
        blog_title: blog.blog_title,
        blog_text: blog.blog_text,
        blog_createat: blog.blog_createat || new Date().toISOString(),
        blog_tag: blog.blog_tag,
      },
    });
    console.log(`Elasticsearchにインデックス登録されたブログID: ${blog.blog_id}`);
  } catch (error) {
    console.error('Elasticsearchへのインデックス登録中にエラーが発生しました:', error);
    throw error;
  }
}

// ブログとタグを挿入する関数
async function insertBlogAndTags(blogId, blogTitle, blogText, fileId, tags, parsedSession, thumbnail, fixedUrl) {
  const client = new Client({
    user: process.env.POSTGRES_USER,
    host: process.env.POSTGRES_NAME,
    database: process.env.POSTGRES_DB,
    password: process.env.POSTGRES_PASSWORD,
    port: 5432,
  });

  try {
    await client.connect();
    await client.query('BEGIN');

    // ブログテキストをパース
    const parsedText = markdownToHtml(blogText);
    const description = extractDescriptionFromHtml(parsedText);

    const insertBlogQuery = `
      INSERT INTO blog (
        blog_id, user_id, blog_title, blog_text, blog_pursed_text, blog_tag, 
        blog_file, blog_thumbnail, blog_attitude, blog_fixedurl, blog_description
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 1, $9, $10)
      RETURNING *;
    `;
    
    const blogValues = [
      blogId,
      parsedSession.username,
      blogTitle,
      blogText,
      parsedText,
      tags.length > 0 ? tags.join(' ') : 'none_data',
      fileId,
      thumbnail,
      fixedUrl,
      description
    ];

    const blogResult = await client.query(insertBlogQuery, blogValues);
    const newBlog = blogResult.rows[0];

    if (tags.length > 0) {
      const tagIds = [];
      for (const tag of tags) {
        const tagId = await getOrCreateTagId(client, tag);
        tagIds.push(tagId);
      }

      const insertTagsQuery = `
        INSERT INTO blogs_blog_tags (blog_id, blog_tag_id)
        VALUES ${tagIds.map((_, idx) => `($1, $${idx + 2})`).join(', ')}
      `;
      await client.query(insertTagsQuery, [blogId, ...tagIds]);
    }

    await client.query('COMMIT');
    return newBlog;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    await client.end();
  }
}

// ブログ作成APIエンドポイント
router.post('/blog_create', async (req, res) => {
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

    // セッションデータをパースしてusernameを確認
    const parsedSession = JSON.parse(sessionData);

    if (!parsedSession.username) {
      console.warn('Session exists, but username is not set.');
      return res.status(401).json({ error: 'User not logged in' });
    }

    console.log(`Session check successful: username = ${parsedSession.username}`);

    // 環境変数の読み取り
    const envFilePath = './.env';
    if (!fs.existsSync(envFilePath)) {
      console.error('.envファイルが存在しません。');
      return res.status(500).json({ error: '.envファイルが存在しません。' });
    }

    dotenv.config();
    console.log('.envファイルを認識しました。');

    // blog_id生成部分
    const date = new Date();
    const now = date.getTime().toString();
    const randomDigits = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    const blog_id = 'bl_' + now + randomDigits;
    
    // フロントエンドから送られてきたタグを優先的に使う
    // blog_tagsがある場合はそれを使い、なければテキストから抽出
    const tags = req.body.blog_tags || (req.body.blog_text.match(/(?<=\s|^)#\S+(?=\s|$)/g) || []);
    
    console.log('タグ処理:', tags);

    const newBlog = await insertBlogAndTags(
      blog_id,
      req.body.blog_title,
      req.body.blog_text,
      req.body.blog_file,
      tags,
      parsedSession,
      req.body.blog_thumbnail,
      req.body.blog_fixedurl
    );

    // ElasticSearchに登録
    await indexBlogToElasticsearch(newBlog);
    return res.status(200).json({ 
      message: 'ブログが正常に作成されました',
      blog_id: blog_id, 
      created_blog: newBlog 
    });

  } catch (error) {
    console.error('Error while creating blog:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// アプリ終了時にElasticsearchクライアントを閉じる
process.on('exit', async () => {
  await esClient.close();
  console.log('Elasticsearchクライアントが正常に終了しました。');
});

export default router;
