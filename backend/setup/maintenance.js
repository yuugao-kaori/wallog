// maintenance.js

import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';
import { Client as ESClient } from '@elastic/elasticsearch';
import pkg from 'pg';
const { Client } = pkg;

import { fileURLToPath } from 'url';

console.log('\n############################\nメンテナンススクリプトを開始します\n############################\n');

const envFilePath = './.env';
if (!fs.existsSync(envFilePath)) {
  console.error('.envファイルが見つかりませんでした。');
  process.exit(1);
}

dotenv.config();
console.log('.envファイルを読み込みました。\n');

// 環境変数の読み込み
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
const ELASTICSEARCH_INDEX = 'post'
const ELASTICSEARCH_INDEX2 = 'blog'  // blogインデックスを追加

// PostgreSQLクライアントの設定
const pgClient = new Client({
  user: POSTGRES_USER,
  host: POSTGRES_NAME,
  database: POSTGRES_DB,
  password: POSTGRES_PASSWORD,
  port: 5432,
});

// ElasticSearchクライアントの設定
const esClient = new ESClient({
  node: `http://${ELASTICSEARCH_HOST}:${ELASTICSEARCH_PORT}`,
  auth: {
    username: ELASTICSEARCH_USER,
    password: ELASTICSEARCH_PASSWORD
  },
  maxRetries: 5,
  requestTimeout: 60000,
  sniffOnStart: true,
  ssl: {
    rejectUnauthorized: false
  }
});
async function rerouteElasticSearchShards() {
  try {
    await esClient.cluster.reroute();
    console.log('ElasticSearchクラスタの再ルーティングを実行しました。');
  } catch (error) {
    console.error('ElasticSearchクラスタの再ルーティング中にエラーが発生���ました:', error);
    throw error;
  }
}
async function recreateIndex() {
  try {
    await esClient.indices.delete({ index: ELASTICSEARCH_INDEX });
    console.log(`ElasticSearchインデックス '${ELASTICSEARCH_INDEX}' を削除しました。`);
    await setupElasticSearchWithRetry(5);
  } catch (error) {
    console.error(`インデックス '${ELASTICSEARCH_INDEX}' の再作成中にエラーが発生しました:`, error);
    throw error;
  }
}
/**
 * 一定時間待機する関数（ミリ秒単位）
 * @param {number} ms - 待機時間（ミリ秒）
 * @returns {Promise}
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * ElasticSearchの接続を確認する関数
 * @returns {Promise<boolean>}
 */
async function checkElasticsearchConnection() {
  try {
    const health = await esClient.cluster.health();
    console.log('ElasticSearch接続状態:', health.status);
    return true;
  } catch (error) {
    console.error('ElasticSearch接続確認中のエラー:', error);
    return false;
  }
}
/**
 * ElasticSearchのセットアップを再試行付きで実行する関数
 * @param {number} retries - 残りの再試行回数
 */
async function setupElasticSearchWithRetry(retries) {
  try {
    const isConnected = await checkElasticsearchConnection();
    if (!isConnected) {
      throw new Error('ElasticSearchに接続できません');
    }

    // インデ��クスが存在するか確認
    const indexExists = await esClient.indices.exists({ index: ELASTICSEARCH_INDEX });

    if (!indexExists) {
      console.log(`ElasticSearchインデックス '${ELASTICSEARCH_INDEX}' が存在しません。作成します。`);
      const indexSettings = {
        settings: {
          number_of_replicas: 0,
          routing: {
            allocation: {
              include: {
                _tier_preference: "data_hot,data_content"
              }
            }
          }
        },
        mappings: {
          properties: {
            post_id: { type: 'keyword'},
            post_text: { type: 'text', analyzer: 'kuromoji' }, // Apply the analyzer here instead
            post_createat: { type: 'date' },
            post_tag: { type: 'keyword' }
          }
        }
      };
      await esClient.indices.create({
        index: ELASTICSEARCH_INDEX,
        body: indexSettings
      });
      console.log(`ElasticSearchインデックス '${ELASTICSEARCH_INDEX}' が作成されました。`);
    } else {
      console.log(`ElasticSearchインデックス '${ELASTICSEARCH_INDEX}' は既に存在します。設定を更新します。`);
      await esClient.indices.putSettings({
        index: ELASTICSEARCH_INDEX,
        body: {
          index: {
            number_of_replicas: 0,
            routing: {
              allocation: {
                include: {
                  _tier_preference: "data_hot,data_content"
                }
              }
            }
          }
        }
      });
      console.log(`ElasticSearchインデックス '${ELASTICSEARCH_INDEX}' のレプリカ数とティア設定を更新しました。`);
    }
  } catch (error) {
    console.error('ElasticSearchのセットアップ中にエラーが発生しました:', error);
    if (retries > 0) {
      console.log(`レプリカ数を0に設定して30秒後に再試行します。残り試行回数: ${retries}`);
      await setReplicaCountToZero(ELASTICSEARCH_INDEX);
      await delay(30000); // 30秒待機
      await setupElasticSearchWithRetry(retries - 1);
    } else {
      console.error('ElasticSearchのセットアップに失敗しました。プロセスを終了します。');
      process.exit(1);
    }
  }
}

/**
 * ElasticSearchの未割り当てシャードを解消するためにレプリカ数を0に設定する関数
 */
async function setReplicaCountToZero(index) {
  try {
    await esClient.indices.putSettings({
      index,
      body: {
        index: {
          number_of_replicas: 0
        }
      }
    });
    console.log(`ElasticSearchインデッ���ス '${index}' のレプリカ数を0に設定しました。`);
  } catch (error) {
    console.error(`ElasticSearchインデックス '${index}' のレプリカ数設定中にエラーが発生しました:`, error);
  }
}

/**
 * ElasticSearchのPostインデックスのデータを削除する関数
 */
async function deleteElasticSearchData() {
  try {

    const deleteResponse = await esClient.deleteByQuery({
      index: ELASTICSEARCH_INDEX,
      body: {
        query: {
          match_all: {}
        }
      },
      allow_partial_search_results: true // 部分的な検索結果を許可
    });

    console.log(`ElasticSearchインデックス '${ELASTICSEARCH_INDEX}' のデータを削除しました。`);
    console.log(`削除結果: ${JSON.stringify(deleteResponse.body)}`);
  } catch (error) {
    if (error.name === 'ResponseError') {
      console.error('ElasticSearchのデータ削除中にエラーが発生しました。レプリカ数を0に設定して再試行します:', error);

      // レプリカ数を0に設定
      try {
        await esClient.indices.putSettings({
          index: ELASTICSEARCH_INDEX,
          body: {
            index: {
              number_of_replicas: 0
            }
          }
        });
        console.log(`ElasticSearchインデックス '${ELASTICSEARCH_INDEX}' のレプリカ数を0に設定しました。`);

        // 再試行
        const deleteResponseRetry = await esClient.deleteByQuery({
          index: ELASTICSEARCH_INDEX,
          body: {
            query: {
              match_all: {}
            }
          },
          allow_partial_search_results: true
        });

        console.log(`再試行: ElasticSearchインデックス '${ELASTICSEARCH_INDEX}' のデータを削除しました。`);
        console.log(`削除結果: ${JSON.stringify(deleteResponseRetry.body)}`);
      } catch (replicaError) {
        console.error('レプリカ数を0に設定中または再試行中にエラーが発生しました:', replicaError);
        throw replicaError;
      }
    } else {
      throw error;
    }
  }
}
/**
 * PostgreSQLのPostテーブルからデータを取得する関数
 * @returns {Promise<Array>}
 */
async function fetchPostgresData() {
  try {
    const res = await pgClient.query('SELECT * FROM post;');
    console.log(`PostgreSQLから取得したデータの件数: ${res.rows.length}`);
    return res.rows;
  } catch (error) {
    console.error('PostgreSQLからのデータ取得中にエラーが発生しました:', error);
    throw error;
  }
}

// blogテーブルからデータを取得する関数を追加
async function fetchBlogPostgresData() {
  try {
    const res = await pgClient.query('SELECT * FROM blog;');
    console.log(`PostgreSQLのblogテーブルから取得したデータの件数: ${res.rows.length}`);
    return res.rows;
  } catch (error) {
    console.error('PostgreSQLのblogテーブルからのデータ取得中にエラーが発生しました:', error);
    throw error;
  }
}

// blogインデックスのデータを削除する関数
async function deleteBlogElasticSearchData() {
  try {
    const deleteResponse = await esClient.deleteByQuery({
      index: ELASTICSEARCH_INDEX2,
      body: {
        query: {
          match_all: {}
        }
      },
      allow_partial_search_results: true
    });

    console.log(`ElasticSearchインデックス '${ELASTICSEARCH_INDEX2}' のデータを削除しました。`);
  } catch (error) {
    console.error('ElasticSearchのblogデータ削除中にエラーが発生しました:', error);
    throw error;
  }
}

// blogデータをElasticSearchに書き込む関数
async function bulkInsertBlogToElasticSearch(data) {
  if (!Array.isArray(data) || data.length === 0) {
    console.log('書き込むblogデータがあり��せん。');
    return;
  }

  const body = [];
  data.forEach(doc => {
    body.push({
      index: { _index: ELASTICSEARCH_INDEX2, _id: doc.id }
    });
    body.push({
      blog_id: doc.blog_id,
      blog_title: doc.blog_title,
      blog_text: doc.blog_text,
      blog_createat: doc.blog_createat,
      blog_tag: doc.blog_tag
    });
  });

  try {
    const bulkResponse = await esClient.bulk({ refresh: true, body });
    console.log(`ElasticSearchインデックス '${ELASTICSEARCH_INDEX2}' にデータをバルク書き込みしました。`);
  } catch (error) {
    console.error('ElasticSearchへのblogデータのバルク書き込み中にエラーが発生しました:', error);
    throw error;
  }
}

/**
 * データをElasticSearchにバルク書き込みする関数
 * @param {Array} data - 書き込むデータの配列
 */
async function bulkInsertToElasticSearch(data) {
  if (!Array.isArray(data) || data.length === 0) {
    console.log('書き込むデータがありません。');
    return;
  }

  const body = [];

  data.forEach(doc => {
    body.push({
      index: { _index: ELASTICSEARCH_INDEX, _id: doc.id } // assuming 'id' is the unique identifier
    });
    body.push({
      post_id: doc.post_id,
      post_text: doc.post_text,
      post_createat: doc.post_createat,
      post_tag: doc.post_tag
      // 必要に応じて他のフィールドも追加
    });
  });

  try {
    const bulkResponse = await esClient.bulk({ refresh: true, body });

    if (bulkResponse && bulkResponse.body && bulkResponse.body.errors) {
      const erroredDocuments = [];
      bulkResponse.body.items.forEach((action, i) => {
        const operation = Object.keys(action)[0];
        if (action[operation].error) {
          erroredDocuments.push({
            status: action[operation].status,
            error: action[operation].error,
            operation: body[i * 2],
            document: body[i * 2 + 1]
          });
        }
      });
      console.error('一部のドキュメントの書き込みに失敗しました:', erroredDocuments);
    } else {
      console.log(`ElasticSearchインデックス '${ELASTICSEARCH_INDEX}' にデータをバルク書き込みしました。`);
    }
  } catch (error) {
    console.error('ElasticSearchへのバルク書き込み中にエラーが発生しました:', error);
    throw error;
  }
}

/**
 * ElasticSearchから一部のデータを取得してコンソールに出力する関数
 */
async function verifyElasticSearchData() {
  try {
    const response = await esClient.search({
      index: ELASTICSEARCH_INDEX,
      size: 10, // 取得するドキュメント数
      query: {
        match_all: {}
      }
    });
    // console.log("レスポンス全体:", response);
    // console.log("レスポンスのhits:", response.hits);
    // console.log("レスポンスのhits.hits:", response.hits ? response.hits.hits : undefined);
    // レスポンスの内容をログ出力して確認
    // console.log("ElasticSearchから取得したレスポンス:", JSON.stringify(response, null, 2));
    // レスポンスが期待した形であるかを確認
    if (response && response.hits && response.hits.hits) { // 修正箇所
      const documents = response.hits.hits; // 修正箇所
      const hasSourceData = documents.some((hit) => hit._source);

      if (hasSourceData) {
        console.log(`ElasticSearchインデックス '${ELASTICSEARCH_INDEX}' からデータを確認しました。`);
        documents.forEach((hit, index) => {
          // console.log(`\nドキュメント ${index + 1}:`);
          console.log(JSON.stringify(hit._source, null, 2));
        });
      } else {
        console.log("ElasticSearchに'_source'を含むデータが見つかりませんでした。");
      }
    } else {
      console.log("ElasticSearchからのデータが見つかりませんでした。");
    }
  } catch (error) {
    console.error('ElasticSearchからのデータ検証中にエラーが発生しました:', error);
    throw error;
  }
}
/**
 * メインのメンテナンス処理を実行する関数
 */
async function main() {
  try {
    // PostgreSQLに接続
    await pgClient.connect();
    console.log('PostgreSQLに接続しました。');

    // ElasticSearchのセットアップ
    await setupElasticSearchWithRetry(5);

    // ElasticSearchのシャード再割り当て
    await rerouteElasticSearchShards();

    // ElasticSearchのデータ削除
    await deleteElasticSearchData();

    // インデックスの再作成
    await recreateIndex();

    // PostgreSQLからデータ取得
    const postgresData = await fetchPostgresData();

    // ElasticSearchにデータ書き込み
    await bulkInsertToElasticSearch(postgresData);

    // データ検証
    await verifyElasticSearchData();

    // blogデータの同期
    console.log('\nblogデータの同期を開始します...');
    const blogData = await fetchBlogPostgresData();
    await deleteBlogElasticSearchData();
    await bulkInsertBlogToElasticSearch(blogData);
    console.log('blogデータの同期が完了しました。\n');

    console.log('\n############################\nメンテナンス処理が完了しました\n############################\n');
  } catch (error) {
    console.error('メンテナンス処理中に予期せぬエラーが発生しました:', error);
  } finally {
    // クライアントを終了
    await pgClient.end();
    await esClient.close();
    console.log('PostgreSQLおよびElasticSearchのクライアントを終了しました。');
  }
}

// メイン関数を実行
main();
