import pkg from 'pg';
import { create } from 'xmlbuilder2';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';

const { Client } = pkg;
dotenv.config();

/**
 * データベースからブログ記事のリストを取得する
 * @returns {Promise<Array>} ブログ記事のリスト
 */
async function fetchBlogEntries() {
  const client = new Client({
    user: process.env.POSTGRES_USER,
    host: process.env.POSTGRES_NAME,
    database: process.env.POSTGRES_DB,
    password: process.env.POSTGRES_PASSWORD,
    port: 5432,
  });

  try {
    await client.connect();
    
    const query = `
      SELECT 
        blog_id, blog_title, blog_text, blog_createat, blog_updateat
      FROM blog
      ORDER BY blog_createat DESC
      LIMIT 30;
    `;
    
    const result = await client.query(query);
    return result.rows;
  } catch (err) {
    console.error('Error fetching blogs for RSS:', err);
    throw err;
  } finally {
    await client.end();
  }
}

/**
 * データベースからダイアリー(投稿)のリストを取得する
 * @returns {Promise<Array>} 投稿のリスト
 */
async function fetchDiaryEntries() {
  const client = new Client({
    user: process.env.POSTGRES_USER,
    host: process.env.POSTGRES_NAME,
    database: process.env.POSTGRES_DB,
    password: process.env.POSTGRES_PASSWORD,
    port: 5432,
  });

  try {
    await client.connect();
    
    const query = `
      SELECT 
        post_id, post_text, post_createat, post_updateat
      FROM post
      ORDER BY post_createat DESC
      LIMIT 30;
    `;
    
    const result = await client.query(query);
    return result.rows;
  } catch (err) {
    console.error('Error fetching posts for RSS:', err);
    throw err;
  } finally {
    await client.end();
  }
}

/**
 * HTML文字列からプレーンテキストを抽出する（簡易的な実装）
 * @param {string} html HTML文字列
 * @returns {string} プレーンテキスト
 */
function extractPlainText(html) {
  if (!html) return '';
  // HTMLタグを削除
  const textWithoutTags = html.replace(/<[^>]+>/g, ' ');
  // 連続する空白を1つにまとめる
  const plainText = textWithoutTags.replace(/\s+/g, ' ').trim();
  // 最初の200文字を返す（概要として）
  return plainText.substring(0, 200) + (plainText.length > 200 ? '...' : '');
}

/**
 * ブログ記事のRSSフィードを生成して保存する
 */
async function generateAndSaveBlogFeed() {
  try {
    console.log('Starting blog RSS generation...', new Date().toISOString());
    
    const baseUrl = 'https://wallog.seitendan.com';
    const currentDate = new Date().toISOString();
    
    // RSSフィードのルート要素を作成
    const feed = create({ version: '1.0', encoding: 'UTF-8' })
      .ele('rss', { version: '2.0' })
      .ele('channel');
    
    // フィードの基本情報を設定
    feed.ele('title').txt('Wallog Blog');
    feed.ele('link').txt(`${baseUrl}/blog`);
    feed.ele('description').txt('Wallog Blog Feed');
    feed.ele('language').txt('ja-jp');
    feed.ele('lastBuildDate').txt(currentDate);
    
    // ブログ記事を追加
    const blogs = await fetchBlogEntries();
    blogs.forEach(blog => {
      const item = feed.ele('item');
      item.ele('title').txt(blog.blog_title || 'No Title');
      item.ele('link').txt(`${baseUrl}/blog/bl_${blog.blog_id}`);
      item.ele('guid').txt(`${baseUrl}/blog/bl_${blog.blog_id}`);
      
      const pubDate = blog.blog_createat ? new Date(blog.blog_createat).toUTCString() : new Date().toUTCString();
      item.ele('pubDate').txt(pubDate);
      
      // コンテンツからプレーンテキストを抽出して概要として使用
      const description = extractPlainText(blog.blog_text);
      item.ele('description').txt(description);
    });
    
    // XMLを文字列に変換
    const feedXml = feed.end({ prettyPrint: true });
    
    // フィードファイルのディレクトリを確認して作成
    const feedDir = path.join(process.cwd(), 'public', 'rss', 'blog');
    await fs.mkdir(feedDir, { recursive: true });
    
    // フィードファイルのパスを設定
    const feedPath = path.join(feedDir, 'feed.xml');
    
    // XMLをファイルに保存
    await fs.writeFile(feedPath, feedXml);
    
    console.log('Blog RSS feed generated and saved successfully:', feedPath, new Date().toISOString());
    return feedXml;
  } catch (error) {
    console.error('Error generating blog RSS feed:', error);
    throw error;
  }
}

/**
 * ダイアリーのRSSフィードを生成して保存する
 */
async function generateAndSaveDiaryFeed() {
  try {
    console.log('Starting diary RSS generation...', new Date().toISOString());
    
    const baseUrl = 'https://wallog.seitendan.com';
    const currentDate = new Date().toISOString();
    
    // RSSフィードのルート要素を作成
    const feed = create({ version: '1.0', encoding: 'UTF-8' })
      .ele('rss', { version: '2.0' })
      .ele('channel');
    
    // フィードの基本情報を設定
    feed.ele('title').txt('Wallog Diary');
    feed.ele('link').txt(`${baseUrl}/diary`);
    feed.ele('description').txt('Wallog Diary Feed');
    feed.ele('language').txt('ja-jp');
    feed.ele('lastBuildDate').txt(currentDate);
    
    // ダイアリー記事を追加
    const diaries = await fetchDiaryEntries();
    diaries.forEach(diary => {
      const item = feed.ele('item');
      // post_titleがないので、post_textの最初の部分をタイトルとして使用
      const title = diary.post_text 
        ? (diary.post_text.split('\n')[0] || '').substring(0, 50) 
        : 'No Title';
      item.ele('title').txt(title);
      item.ele('link').txt(`${baseUrl}/diary/${diary.post_id}`);
      item.ele('guid').txt(`${baseUrl}/diary/${diary.post_id}`);
      
      const pubDate = diary.post_createat ? new Date(diary.post_createat).toUTCString() : new Date().toUTCString();
      item.ele('pubDate').txt(pubDate);
      
      // コンテンツからプレーンテキストを抽出して概要として使用
      const description = extractPlainText(diary.post_text);
      item.ele('description').txt(description);
    });
    
    // XMLを文字列に変換
    const feedXml = feed.end({ prettyPrint: true });
    
    // フィードファイルのディレクトリを確認して作成
    const feedDir = path.join(process.cwd(), 'public', 'rss', 'diary');
    await fs.mkdir(feedDir, { recursive: true });
    
    // フィードファイルのパスを設定
    const feedPath = path.join(feedDir, 'feed.xml');
    
    // XMLをファイルに保存
    await fs.writeFile(feedPath, feedXml);
    
    console.log('Diary RSS feed generated and saved successfully:', feedPath, new Date().toISOString());
    return feedXml;
  } catch (error) {
    console.error('Error generating diary RSS feed:', error);
    throw error;
  }
}

/**
 * 両方のRSSフィードを生成する
 */
export async function generateAndSaveRssFeeds() {
  try {
    console.log('Starting RSS generation for all feeds...', new Date().toISOString());
    
    // ブログとダイアリーの両方のフィードを並列で生成
    await Promise.all([
      generateAndSaveBlogFeed(),
      generateAndSaveDiaryFeed()
    ]);
    
    console.log('All RSS feeds generated successfully', new Date().toISOString());
  } catch (error) {
    console.error('Error generating RSS feeds:', error);
    throw error;
  }
}
