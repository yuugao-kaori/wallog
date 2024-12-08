import express from 'express';
import pkg from 'pg';
const { Client } = pkg;

const router = express.Router();

// 特定のブログ記事を取得する関数
async function getBlogById(blog_id) {
  const client = new Client({
    user: process.env.POSTGRES_USER,
    host: process.env.POSTGRES_NAME,
    database: process.env.POSTGRES_DB,
    password: process.env.POSTGRES_PASSWORD,
    port: 5432,
  });

  try {
    await client.connect();
    console.log('Connected to database');
    
    console.log('Processing blog_id:', blog_id);

    const query = `
      SELECT *
      FROM blog
      WHERE blog_id = $1;
    `;
    
    console.log('Executing query with blog_id:', blog_id);
    const result = await client.query(query, [blog_id]);
    console.log('Query result rows:', result.rows.length);

    if (result.rows.length === 0) {
      return null;
    }

    // カウントのインクリメントを try-catch で囲む
    try {
      await client.query(`
        UPDATE blog 
        SET blog_count = blog_count + 1 
        WHERE blog_id = $1
      `, [blog_id]);
    } catch (updateErr) {
      console.error('Error updating view count:', updateErr);
      // カウントの更新に失敗しても、記事データは返す
    }

    return result.rows[0];
  } catch (err) {
    console.error('Detailed database error:', err);
    throw err;
  } finally {
    await client.end();
  }
}

// ブログ記事取得APIエンドポイント
router.get('/blog_read/:blog_id', async (req, res) => {
  try {
    const blog_id = req.params.blog_id;
    console.log('Received request for blog_id:', blog_id);
    
    // blog_idのバリデーションを緩和
    if (!blog_id) {
      return res.status(400).json({ 
        error: 'Blog ID is required',
        message: 'ブログIDが必要です',
        status: 400 
      });
    }

    const blog = await getBlogById(blog_id);
    console.log('Retrieved blog:', blog);
    
    if (!blog) {
      return res.status(404).json({ 
        error: 'Blog not found',
        message: 'ブログが見つかりません',
        status: 404
      });
    }

    return res.status(200).json(blog);
  } catch (err) {
    console.error('Error:', err);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: 'サーバーエラーが発生しました',
      status: 500
    });
  }
});

export default router;
