import express from 'express';
import dotenv from "dotenv";
import pkg from 'pg';
const { Client } = pkg;
import cors from 'cors';
const router = express.Router();
const app = express();

// bodyParserが必要な場合
app.use(express.json());

// ToDoリスト取得API
router.get('/todo_list', async (req, res) => {
  try {
    // ユーザーのToDoリストを取得
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

      // クエリパラメータからフィルタリング条件を取得
      const category = req.query.category;
      const priority = req.query.priority;
      const completed = req.query.completed;
      const isPublic = req.query.public;
      const limit = parseInt(req.query.limit) || 100; // デフォルトは100件
      const offset = parseInt(req.query.offset) || 0;
      
      // ベースクエリ
      let query = 'SELECT * FROM todo';
      let params = [];
      let paramCount = 1;
      
      // WHERE句の開始
      let whereConditions = [];
      
      // カテゴリでフィルタリング
      if (category) {
        whereConditions.push(`todo_category = $${paramCount}`);
        params.push(category);
        paramCount++;
      }
      
      // 優先度でフィルタリング
      if (priority) {
        whereConditions.push(`todo_priority = $${paramCount}`);
        params.push(parseInt(priority));
        paramCount++;
      }

      // 完了状態でフィルタリング
      if (completed !== undefined) {
        whereConditions.push(`todo_complete = $${paramCount}`);
        params.push(completed === 'true');
        paramCount++;
      }

      // 公開状態でフィルタリング
      if (isPublic !== undefined) {
        whereConditions.push(`todo_public = $${paramCount}`);
        params.push(isPublic === 'true');
        paramCount++;
      }

      // WHERE句の追加
      if (whereConditions.length > 0) {
        query += ' WHERE ' + whereConditions.join(' AND ');
      }
      
      // ソート順と制限を追加
      query += ' ORDER BY todo_priority DESC, todo_limitat ASC LIMIT $' + paramCount + ' OFFSET $' + (paramCount + 1);
      params.push(limit, offset);
      
      const result = await client.query(query, params);

      // 総件数を取得
      let countQuery = 'SELECT COUNT(*) FROM todo';
      let countParams = [];
      
      if (whereConditions.length > 0) {
        countQuery += ' WHERE ' + whereConditions.join(' AND ');
        countParams = params.slice(0, -2); // limit と offset を除外
      }
      
      const countResult = await client.query(countQuery, countParams);
      const totalCount = parseInt(countResult.rows[0].count);

      return res.status(200).json({
        todos: result.rows,
        total: totalCount,
        limit: limit,
        offset: offset
      });

    } catch (err) {
      console.error('データベースエラー:', err);
      return res.status(500).json({ error: 'データベース操作中にエラーが発生しました' });
    } finally {
      // クライアントを切断
      await client.end();
      console.log('PostgreSQLから切断しました。');
    }
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
