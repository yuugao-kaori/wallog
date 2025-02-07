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
router.get('/search/:search_text?', async (req, res) => { // search_textをオプショナルに変更
  console.log('Search API called with params:', {
    search_text: req.params.search_text,
    query: req.query
  });

  res.setHeader('Cache-Control', 'no-cache');
  const { search_text } = req.params;
  const { offset, limit = 10, since, until, searchType = 'full_text' } = req.query;

  try {
    if (search_text) {
      // 検索テキストの正規化（全角スペースを半角に統一）
      const normalizedSearchText = search_text.replace(/\u3000/g, ' ');
      const searchTerms = normalizedSearchText.split(' ').filter(term => term.length > 0);
      console.log('Normalized search terms:', searchTerms);

      // 検索タイプに応じてクエリを構築
      const searchField = searchType === 'hashtag' ? 'post_tag' : 'post_text';

      // ElasticSearchクエリを構築
      const esQuery = {
        index: ELASTICSEARCH_INDEX,
        size: limit,
        sort: [{ post_id: 'desc' }],
        query: {
          bool: {
            must: [
              {
                bool: {
                  should: searchTerms.map(term => ({
                    wildcard: {
                      [searchField]: {
                        value: `*${term}*`,
                        case_insensitive: true,
                      },
                    },
                  })),
                  minimum_should_match: 1,
                }
              },
              ...(since ? [{
                range: {
                  post_id: {
                    gte: since,
                  },
                },
              }] : []),
              ...(until ? [{
                range: {
                  post_id: {
                    lte: until,
                  },
                },
              }] : []),
            ],
          },
        },
      };
      console.log('Elasticsearch query:', JSON.stringify(esQuery, null, 2));
  
      // オフセット指定がある場合、そのpost_id以降を検索
      if (offset) {
        const parsedOffset = parseInt(offset, 10);
        if (!isNaN(parsedOffset)) {
          esQuery.search_after = [parsedOffset];
        }
      }
  
      const esResponse = await esClient.search(esQuery);
      console.log('Elasticsearch response hits:', esResponse.hits.total);
  
      // ElasticSearchの検索結果からpost_idを取得
      const postIds = esResponse.hits.hits.map((hit) => hit._source.post_id);
      console.log('Found post_ids:', postIds);
  
      if (postIds.length === 0) {
        console.log('No posts found in Elasticsearch');
        return res.json([]);
      }
  
      // PostgreSQLクエリに範囲フィルターを追加
      let pgQuery = `SELECT * FROM post WHERE post_id = ANY($1)`;
      const pgParams = [postIds];
      if (since) {
        pgQuery += ` AND post_id >= $${pgParams.length + 1}`;
        pgParams.push(since);
      }
      if (until) {
        pgQuery += ` AND post_id <= $${pgParams.length + 1}`;
        pgParams.push(until);
      }
      pgQuery += ` ORDER BY post_id DESC LIMIT $${pgParams.length + 1}`;
      pgParams.push(limit);
      console.log('PostgreSQL query:', pgQuery);
      console.log('PostgreSQL params:', pgParams);
  
      const pgResponse = await pgClient.query(pgQuery, pgParams);
      console.log('PostgreSQL response rows:', pgResponse.rows.length);
  
      // PostgreSQLから取得したデータを返却
      res.json(pgResponse.rows);
    } else if (since || until) {
      console.log('Direct PostgreSQL query with since/until:', { since, until, offset });
      
      // offsetを含むクエリ条件を構築
      const conditions = [];
      const pgParams = [];
      let paramIndex = 1;

      if (since) {
        conditions.push(`post_id >= $${paramIndex}`);
        pgParams.push(since);
        paramIndex++;
      }
      if (until) {
        conditions.push(`post_id <= $${paramIndex}`);
        pgParams.push(until);
        paramIndex++;
      }
      if (offset) {
        conditions.push(`post_id < $${paramIndex}`);
        pgParams.push(offset);
        paramIndex++;
      }

      // 最後にlimitパラメータを追加
      pgParams.push(parseInt(limit));

      const pgQuery = `
        SELECT * FROM post 
        WHERE ${conditions.length > 0 ? conditions.join(' AND ') : '1=1'}
        ORDER BY post_id DESC 
        LIMIT $${paramIndex}
      `;

      console.log('PostgreSQL query:', pgQuery);
      console.log('PostgreSQL params:', pgParams);

      const pgResponse = await pgClient.query(pgQuery, pgParams);
      console.log('PostgreSQL response rows:', pgResponse.rows.length);
      return res.json(pgResponse.rows);
    } else {
      console.log('No search criteria provided');
      return res.json([]); // 条件が不足している場合は空の配列を返す
    }
  } catch (error) {
    console.error('Detailed error:', {
      message: error.message,
      stack: error.stack,
      query: req.query,
      params: req.params
    });
    res.status(500).json({
      error: 'サーバーエラーが発生しました',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});


export default router;
