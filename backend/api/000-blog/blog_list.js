import express from 'express';
import pkg from 'pg';
const { Client } = pkg;

const router = express.Router();

// ブログ一覧を取得する関数
async function getBlogList(offset = 0, limit = 20) {
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
        blog_id, user_id, blog_title, blog_text, blog_tag,
        blog_createat, blog_updateat, blog_file, blog_thumbnail,
        blog_attitude, blog_fixedurl, blog_count
      FROM blog
      ORDER BY blog_createat DESC
      LIMIT $1 OFFSET $2;
    `;
    
    const result = await client.query(query, [limit, offset]);
    return result.rows;
  } catch (err) {
    console.error('Error fetching blogs:', err);
    throw err;
  } finally {
    await client.end();
  }
}

// ブログの総数を取得する関数を追加
async function getTotalBlogCount() {
  const client = new Client({
    user: process.env.POSTGRES_USER,
    host: process.env.POSTGRES_NAME,
    database: process.env.POSTGRES_DB,
    password: process.env.POSTGRES_PASSWORD,
    port: 5432,
  });

  try {
    await client.connect();
    const result = await client.query('SELECT COUNT(*) FROM blog');
    return parseInt(result.rows[0].count);
  } catch (err) {
    console.error('Error counting blogs:', err);
    throw err;
  } finally {
    await client.end();
  }
}

// ブログ一覧取得APIエンドポイント
router.get('/blog_list', async (req, res) => {
  try {
    const offset = parseInt(req.query.offset) || 0;
    const limit = parseInt(req.query.limit) || 12;
    const blogs = await getBlogList(offset, limit);
    const total = await getTotalBlogCount();
    return res.status(200).json({ blogs, total });
  } catch (err) {
    console.error('Error:', err);
    return res.status(500).json({ error: 'Failed to fetch blogs' });
  }
});

export default router;
