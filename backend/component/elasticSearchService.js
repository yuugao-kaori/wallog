/**
 * ElasticSearch操作モジュール
 * 
 * 投稿データの検索、接続確認などElasticsearchとのインタラクションを
 * 管理するサービス。環境設定から接続情報を取得し、検索クエリを実行する。
 * 
 * @module ElasticSearchService
 */
import { Client } from '@elastic/elasticsearch';
import logger from '../logging/logger.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * ElasticSearch接続情報
 * .envファイルから設定を読み込む
 */
const {
  ELASTICSEARCH_HOST,
  ELASTICSEARCH_PORT,
  ELASTICSEARCH_USER,
  ELASTICSEARCH_PASSWORD,
} = process.env;

/**
 * ElasticSearchクライアントのインスタンス
 * 設定された接続情報を使用して接続を確立する
 * @type {Client}
 */
const esClient = new Client({
  node: `http://${ELASTICSEARCH_HOST}:${ELASTICSEARCH_PORT}`,
  auth: {
    username: ELASTICSEARCH_USER,
    password: ELASTICSEARCH_PASSWORD,
  },
});

/**
 * コンテンツを検索する
 * 
 * テキスト検索、タイトル検索、タグ検索など様々な検索タイプに対応し、
 * ページネーション機能をサポートする。検索結果はソート順に取得される。
 * 
 * @param {string} searchText - 検索するテキスト
 * @param {string} searchType - 検索タイプ (title, full_text, tag)
 * @param {number} limit - 返す結果の最大数
 * @param {Array} searchAfter - search_afterのための値（ページネーション用）
 * @param {string} indexName - 検索対象のインデックス名 ('post' または 'blog')
 * @returns {Object} 検索結果の投稿リスト、次ページ用のsearch_after値、総件数を含むオブジェクト
 * @throws {Error} Elasticsearch検索中にエラーが発生した場合
 */
export async function searchContent(searchText, searchType, limit = 10, searchAfter = null, indexName = 'post') {
  try {
    logger.info(`Searching for content in ${indexName} with text: ${searchText}, type: ${searchType}`);

    let query;
    
    switch (searchType) {
      case 'title':
        query = {
          match: {
            title: {
              query: searchText,
              fuzziness: 'AUTO'
            }
          }
        };
        break;
      case 'tag':
        query = {
          bool: {
            should: [
              {
                term: {
                  "tags.keyword": searchText  // 完全一致
                }
              },
              {
                match: {
                  tags: {
                    query: searchText,
                    operator: "and"
                  }
                }
              }
            ],
            minimum_should_match: 1
          }
        };
        break;
      case 'full_text':
      default:
        // インデックスによって検索フィールドを調整
        const contentField = indexName === 'blog' ? 'blog_text' : 'post_text';
        query = {
          bool: {
            should: [
              {
                match: {
                  [contentField]: {
                    query: searchText,
                    operator: "and"
                  }
                }
              },
              {
                match: {
                  [`${contentField}.ngram`]: {
                    query: searchText,
                    operator: "and"
                  }
                }
              },
              {
                match_phrase: {
                  [contentField]: {
                    query: searchText,
                    boost: 2.0
                  }
                }
              }
            ],
            minimum_should_match: 1
          }
        };
        break;
    }
    
    // クエリをログに出力
    logger.debug(`Elasticsearch query: ${JSON.stringify(query, null, 2)}`);
    
    // インデックスによってソートフィールドを調整
    const sortField = indexName === 'blog' ? 'blog_createat' : 'post_createat';
    const idField = indexName === 'blog' ? 'blog_id' : 'post_id';
    
    const searchParams = {
      index: indexName,
      size: limit,
      query: query,
      sort: [
        { [sortField]: { order: 'desc' } },
        { [idField]: { order: 'desc' } } // 完全なユニーク性を保証するために追加
      ]
    };
    
    // search_afterパラメータが存在する場合、追加
    if (searchAfter && Array.isArray(searchAfter) && searchAfter.length > 0) {
      searchParams.search_after = searchAfter;
    }
    
    // 完全なリクエストパラメータをログに出力
    logger.debug(`Elasticsearch search parameters: ${JSON.stringify(searchParams, null, 2)}`);

    const response = await esClient.search(searchParams);

    logger.debug(`Elasticsearch found ${response.hits.total.value} results`);
    
    // 次のページのためのsearch_after値を取得
    const lastHit = response.hits.hits[response.hits.hits.length - 1];
    const nextSearchAfter = lastHit ? lastHit.sort : null;
    
    // 検索結果を返す（_sourceフィールドをそのまま使用）
    const items = response.hits.hits.map(hit => hit._source);
    
    return {
      items,
      next_search_after: nextSearchAfter,
      total: response.hits.total.value
    };
  } catch (error) {
    logger.error(`Error searching in Elasticsearch: ${error.message}`);
    throw error;
  }
}

/**
 * 投稿を検索する（後方互換性のため）
 * 
 * @param {string} searchText - 検索するテキスト
 * @param {string} searchType - 検索タイプ (title, full_text, tag)
 * @param {number} limit - 返す結果の最大数
 * @param {Array} searchAfter - search_afterのための値（ページネーション用）
 * @returns {Object} 検索結果の投稿リスト、次ページ用のsearch_after値、総件数を含むオブジェクト
 */
export async function searchPosts(searchText, searchType, limit = 10, searchAfter = null) {
  const results = await searchContent(searchText, searchType, limit, searchAfter, 'post');
  
  // 後方互換性のために古い形式にマッピング
  return {
    posts: results.items.map(item => ({
      post_id: item.post_id,
      post_createat: item.post_createat,
      post_text: item.post_text,
      post_tag: item.tags,
      created_at: item.created_at,
      user_id: item.user_id
    })),
    next_search_after: results.next_search_after,
    total: results.total
  };
}

/**
 * ブログを検索する
 * 
 * @param {string} searchText - 検索するテキスト
 * @param {string} searchType - 検索タイプ (title, full_text, tag)
 * @param {number} limit - 返す結果の最大数
 * @param {Array} searchAfter - search_afterのための値（ページネーション用）
 * @returns {Object} 検索結果のブログリスト、次ページ用のsearch_after値、総件数を含むオブジェクト
 */
export async function searchBlogs(searchText, searchType, limit = 10, searchAfter = null) {
  return await searchContent(searchText, searchType, limit, searchAfter, 'blog');
}

/**
 * Elasticsearchの接続を確認する
 * 
 * サービスの稼働状態を確認するために、Elasticsearchクラスターへの
 * ping操作を実行する。接続が正常に確立できているかを検証する。
 * 
 * @returns {boolean} 接続が成功した場合はtrue、失敗した場合はfalse
 * @throws {Error} 接続試行中に予期しないエラーが発生した場合
 */
export async function checkConnection() {
  try {
    const pingResult = await esClient.ping();
    logger.info('Elasticsearch cluster is running');
    return pingResult.statusCode === 200;
  } catch (error) {
    logger.error('Elasticsearch cluster is not available');
    return false;
  }
}
