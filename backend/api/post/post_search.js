import express from 'express';
import { Client as ESClient } from '@elastic/elasticsearch';
import pkg from 'pg';
const { Client: PGClient } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const {
  POSTGRES_USER,
  POSTGRES_PASSWORD,
  POSTGRES_DB,
  POSTGRES_NAME,
  ELASTICSEARCH_HOST,
  ELASTICSEARCH_PORT,
  ELASTICSEARCH_USER,
  ELASTICSEARCH_PASSWORD,
} = process.env;

const router = express.Router();
const ELASTICSEARCH_INDEX = 'post';

// PostgreSQLクライアント設定
const pgClient = new PGClient({
  user: POSTGRES_USER,
  host: POSTGRES_NAME,
  database: POSTGRES_DB,
  password: POSTGRES_PASSWORD,
  port: 5432,
});
pgClient.connect();

// ElasticSearchクライアント設定
const esClient = new ESClient({
  node: `http://${ELASTICSEARCH_HOST}:${ELASTICSEARCH_PORT}`,
  auth: {
    username: ELASTICSEARCH_USER,
    password: ELASTICSEARCH_PASSWORD,
  },
});

// APIエンドポイントの実装
router.get('/saerch/:sarch_text', async (req, res) => {
  const { sarch_text } = req.params;
  const { offset, limit = 10 } = req.query;

  try {
    // ① ElasticSearchで検索
    const esQuery = {
      index: ELASTICSEARCH_INDEX,
      size: limit,
      sort: [{ post_id: 'desc' }],
      query: {
        match: { post_text: sarch_text },
      },
    };

    // ③ オフセット指定がある場合、そのpost_id以降を検索
    if (offset) {
      esQuery.search_after = [parseInt(offset, 10)];
    }

    const esResponse = await esClient.search(esQuery);

    // ④ ElasticSearchの検索結果からpost_idを取得
    const postIds = esResponse.hits.hits.map((hit) => hit._source.post_id);

    // ⑤ PostgreSQLからpost_idに対応するデータを取得
    const pgQuery = `SELECT * FROM post WHERE post_id = ANY($1) ORDER BY post_id DESC LIMIT $2`;
    const pgResponse = await pgClient.query(pgQuery, [postIds, limit]);

    // ⑥ PostgreSQLから取得したデータを返却
    res.json(pgResponse.rows);
  } catch (error) {
    console.error('エラーが発生しました:', error);
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
});

export default router;
