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
        blog_id, blog_updateat
      FROM blog
      ORDER BY blog_createat DESC;
    `;
    
    const result = await client.query(query);
    return result.rows;
  } catch (err) {
    console.error('Error fetching blogs for sitemap:', err);
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
        post_id, post_updateat
      FROM post
      ORDER BY post_id DESC
      LIMIT 1000; -- サイトマップのエントリ数を制限
    `;
    
    const result = await client.query(query);
    return result.rows;
  } catch (err) {
    console.error('Error fetching posts for sitemap:', err);
    throw err;
  } finally {
    await client.end();
  }
}

/**
 * サイトマップXMLを生成して指定されたパスに保存する
 */
export async function generateAndSaveSitemap() {
  try {
    console.log('Starting sitemap generation...', new Date().toISOString());
    
    const baseUrl = 'https://wallog.seitendan.com';
    const currentDate = new Date().toISOString();
    
    // サイトマップのルート要素を作成
    const sitemap = create({ version: '1.0', encoding: 'UTF-8' })
      .ele('urlset', {
        xmlns: 'http://www.sitemaps.org/schemas/sitemap/0.9'
      });
    
    // 固定ページを追加
    const staticPages = ['/', '/blog', '/diary', '/search'];
    staticPages.forEach(page => {
      sitemap.ele('url')
        .ele('loc').txt(`${baseUrl}${page}`).up()
        .ele('lastmod').txt(currentDate).up()
        .ele('changefreq').txt(page === '/' ? 'daily' : 'weekly').up()
        .ele('priority').txt(page === '/' ? '1.0' : '0.8').up();
    });
    
    // ブログ記事を追加
    try {
      const blogs = await fetchBlogEntries();
      blogs.forEach(blog => {
        const lastMod = blog.blog_updateat ? new Date(blog.blog_updateat).toISOString() : currentDate;
        sitemap.ele('url')
          .ele('loc').txt(`${baseUrl}/blog/bl_${blog.blog_id}`).up()
          .ele('lastmod').txt(lastMod).up()
          .ele('changefreq').txt('monthly').up()
          .ele('priority').txt('0.6').up();
      });
    } catch (error) {
      console.error('Error adding blog entries to sitemap:', error);
      // エラーがあっても処理を続行
    }
    
    // ダイアリー(投稿)を追加
    try {
      const diaries = await fetchDiaryEntries();
      diaries.forEach(diary => {
        const lastMod = diary.post_updateat ? new Date(diary.post_updateat).toISOString() : currentDate;
        sitemap.ele('url')
          .ele('loc').txt(`${baseUrl}/diary/${diary.post_id}`).up()
          .ele('lastmod').txt(lastMod).up()
          .ele('changefreq').txt('monthly').up()
          .ele('priority').txt('0.5').up();
      });
    } catch (error) {
      console.error('Error adding diary entries to sitemap:', error);
      // エラーがあっても処理を続行
    }
    
    // XMLを文字列に変換
    const sitemapXml = sitemap.end({ prettyPrint: true });
    
    // サイトマップファイルのパスを設定
    const sitemapPath = path.join(process.cwd(), 'public', 'sitemap', 'sitemap.xml');
    
    // XMLをファイルに保存
    await fs.writeFile(sitemapPath, sitemapXml);
    
    console.log('Sitemap generated and saved successfully:', sitemapPath, new Date().toISOString());
    return sitemapXml;
  } catch (error) {
    console.error('Error generating sitemap:', error);
    throw error;
  }
}
