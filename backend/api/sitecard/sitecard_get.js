import express from 'express';
import session from 'express-session';
import Redis from "ioredis";
import RedisStore from "connect-redis";
import dotenv from "dotenv";
import path from 'path';
import fs from 'fs';
import pkg from 'pg';
import { fileURLToPath } from 'url';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';
import canvas from 'canvas';
const { createCanvas, registerFont, loadImage } = canvas;

const { Client } = pkg;
const router = express.Router();

// ESM環境での__dirnameの代替
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Redisクライアント作成
const redis = new Redis({
  port: 6379,
  host: "redis", // Redisコンテナの名前
});

// express-sessionの設定
router.use(
  session({
    store: new RedisStore({ client: redis }),
    secret: 'my_secret_key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 30 * 60 * 1000,
      httpOnly: true,
      secure: false,
    },
    rolling: true,
  })
);

// 環境変数の読み取り
const envFilePath = './.env';
dotenv.config({ path: envFilePath });

// MinIOクライアントの初期化
const s3Client = new S3Client({
  endpoint: `http://${process.env.MINIO_NAME}:9000`,
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.MINIO_USER || 'myuser',
    secretAccessKey: process.env.MINIO_PASSWORD || 'mypassword',
  },
  forcePathStyle: true,
  signatureVersion: 'v4',
  tls: false,
  apiVersion: 'latest'
});

// IDの生成関数
function generateSiteCardId() {
  const date = new Date();
  const year = date.getFullYear().toString();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const hour = date.getHours().toString().padStart(2, '0');
  const minute = date.getMinutes().toString().padStart(2, '0');
  const second = date.getSeconds().toString().padStart(2, '0');
  const millisecond = date.getMilliseconds().toString().padStart(3, '0');
  const timestamp = `${year}${month}${day}${hour}${minute}${second}${millisecond}`;
  const randomDigits = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
  return `card-${timestamp}${randomDigits}`;
}

// OGタグをスクレイピングする関数
async function scrapeOgTags(url) {
  try {
    const response = await fetch(url);
    const html = await response.text();
    const dom = new JSDOM(html);
    const document = dom.window.document;
    
    let ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content');
    let ogDescription = document.querySelector('meta[property="og:description"]')?.getAttribute('content');
    let ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute('content');
    
    // OGタグがない場合のフォールバック
    if (!ogTitle) {
      ogTitle = document.querySelector('title')?.textContent || 
               document.querySelector('h1')?.textContent || 
               url;
    }
    
    if (!ogDescription) {
      // 本文のテキストを取得して140文字程度に制限
      const bodyText = document.body?.textContent?.trim().replace(/\\s+/g, ' ') || '';
      ogDescription = bodyText.substring(0, 140) + (bodyText.length > 140 ? '...' : '');
    }
    
    return {
      title: ogTitle || '',
      description: ogDescription || '',
      image: ogImage || null
    };
  } catch (error) {
    console.error(`Error scraping URL ${url}:`, error);
    return {
      title: url,
      description: '',
      image: null
    };
  }
}

// サムネイル画像を生成する関数
async function generateThumbnail(title, url = '') {
  const canvas = createCanvas(1200, 630);
  const ctx = canvas.getContext('2d');
  
  // ブラウザウィンドウの背景（ライトグレー）
  ctx.fillStyle = '#f0f0f0';
  ctx.fillRect(0, 0, 1200, 630);
  
  // ブラウザのヘッダー部分（ダークグレー）
  ctx.fillStyle = '#303030';
  ctx.fillRect(0, 0, 1200, 60);
  
  // URL表示バー
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(70, 15, 900, 30);
  
  // URLを表示（省略あり）
  ctx.fillStyle = '#303030';
  ctx.font = '16px Arial';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const displayUrl = url.length > 60 ? url.substring(0, 57) + '...' : url;
  ctx.fillText(displayUrl, 80, 30);
  
  // ブラウザボタン（赤、黄、緑）
  ctx.fillStyle = '#ff5f57'; // 赤
  ctx.beginPath();
  ctx.arc(20, 30, 7, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = '#febc2e'; // 黄
  ctx.beginPath();
  ctx.arc(40, 30, 7, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = '#28c840'; // 緑
  ctx.beginPath();
  ctx.arc(60, 30, 7, 0, Math.PI * 2);
  ctx.fill();
  
  // コンテンツ背景（白）
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(30, 80, 1140, 520);
  
  // サイト名/ヘッダー（青っぽい色）
  ctx.fillStyle = '#4a7dbe';
  ctx.fillRect(30, 80, 1140, 50);
  
  // サイト名
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px Arial';
  ctx.textAlign = 'left';
  ctx.fillText(shortenText(title, 50), 50, 105);
  
  // コンテンツのモックアップを追加
  const contentStartY = 150;
  
  // ヘッダー
  ctx.fillStyle = '#333333';
  ctx.font = 'bold 32px Arial';
  ctx.fillText(shortenText(title, 40), 50, contentStartY);
  
  // 下線
  ctx.strokeStyle = '#e0e0e0';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(50, contentStartY + 30);
  ctx.lineTo(1120, contentStartY + 30);
  ctx.stroke();
  
  // コンテンツ行（モック）
  ctx.fillStyle = '#666666';
  for (let i = 0; i < 8; i++) {
    const lineWidth = 200 + Math.random() * 800;
    ctx.fillRect(50, contentStartY + 60 + (i * 40), lineWidth, 15);
  }
  
  // 右サイドバー
  ctx.fillStyle = '#f5f5f5';
  ctx.fillRect(900, 150, 270, 450);
  
  // サイドバーコンテンツ
  ctx.fillStyle = '#999999';
  for (let i = 0; i < 8; i++) {
    ctx.fillRect(920, 170 + (i * 50), 230, 30);
  }
  
  return canvas.toBuffer('image/png');
}

// テキストが長すぎる場合に省略する補助関数
function shortenText(text, maxLength) {
  if (!text) return '';
  return text.length > maxLength ? text.substring(0, maxLength - 3) + '...' : text;
}

// URLをチェックして既存のサイトカードを取得または作成する関数
async function getSiteCardByUrl(url) {
  const client = new Client({
    user: process.env.POSTGRES_USER,
    host: process.env.POSTGRES_NAME,
    database: process.env.POSTGRES_DB,
    password: process.env.POSTGRES_PASSWORD,
    port: 5432,
  });
  
  try {
    await client.connect();
    
    // 既存のサイトカードを検索
    const searchQuery = `
      SELECT * FROM "site-card"
      WHERE url_text = $1;
    `;
    const searchResult = await client.query(searchQuery, [url]);
    
    if (searchResult.rows.length > 0) {
      return searchResult.rows[0];
    }
    
    // 存在しない場合は新しいサイトカードを作成
    const ogTags = await scrapeOgTags(url);
    const siteCardId = generateSiteCardId();
    let thumbnailId = null;
    
    if (ogTags.image) {
      try {
        // OG画像を取得
        const imageResponse = await fetch(ogTags.image);
        const imageBuffer = await imageResponse.buffer();
        
        thumbnailId = `thumbnail-${siteCardId}`;
        
        // MinIOに画像を保存
        await s3Client.send(new PutObjectCommand({
          Bucket: 'publicdata',
          Key: thumbnailId,
          Body: imageBuffer,
          ContentType: 'image/jpeg'
        }));
        
        console.log(`サムネイル画像をMinIOにアップロードしました: ${thumbnailId}`);
      } catch (imageError) {
        console.error('OG画像の取得に失敗:', imageError);
        // デフォルトのサムネイルを作成
        const thumbnailBuffer = await generateThumbnail(ogTags.title, url);
        thumbnailId = `thumbnail-${siteCardId}`;
        
        await s3Client.send(new PutObjectCommand({
          Bucket: 'publicdata',
          Key: thumbnailId,
          Body: thumbnailBuffer,
          ContentType: 'image/png'
        }));
        
        console.log(`生成したサムネイル画像をMinIOにアップロードしました: ${thumbnailId}`);
      }
    } else {
      // OG画像がない場合はタイトルを使ってサムネイルを生成
      const thumbnailBuffer = await generateThumbnail(ogTags.title, url);
      thumbnailId = `thumbnail-${siteCardId}`;
      
      await s3Client.send(new PutObjectCommand({
        Bucket: 'publicdata',
        Key: thumbnailId,
        Body: thumbnailBuffer,
        ContentType: 'image/png'
      }));
      
      console.log(`生成したサムネイル画像をMinIOにアップロードしました: ${thumbnailId}`);
    }
    
    // サイトカード情報をデータベースに保存
    const insertQuery = `
      INSERT INTO "site-card" (
        site_card_id, 
        url_text, 
        site_card_title, 
        site_card_text, 
        site_card_thumbnail
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;
    
    const values = [
      siteCardId,
      url,
      ogTags.title,
      ogTags.description,
      thumbnailId
    ];
    
    const result = await client.query(insertQuery, values);
    return result.rows[0];
  } catch (error) {
    console.error('サイトカード処理エラー:', error);
    throw error;
  } finally {
    await client.end();
  }
}

// サイトカード取得エンドポイント
router.post('/sitecard_get', async (req, res) => {
  if (!req.session) {
    console.error('Session object is not found.');
    return res.status(401).json({ error: 'Session object not found' });
  }

  const sessionId = req.sessionID;
  console.log(`Session ID: ${sessionId}`);

  try {
    const sessionData = await redis.get(`sess:${sessionId}`);
    
    if (!sessionData) {
      console.warn('No session data found in Redis for this session ID.');
      return res.status(401).json({ error: 'No session data found' });
    }

    const parsedSession = JSON.parse(sessionData);
    
    if (!parsedSession.username) {
      console.warn('Session exists, but username is not set.');
      return res.status(401).json({ error: 'User not logged in' });
    }

    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    // URLの形式チェック
    try {
      new URL(url);
    } catch (error) {
      return res.status(400).json({ error: 'Invalid URL format' });
    }
    
    const siteCard = await getSiteCardByUrl(url);
    
    return res.status(200).json({
      message: 'Site card retrieved successfully',
      site_card: siteCard
    });
  } catch (error) {
    console.error('Error processing site card:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;