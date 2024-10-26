// maintenance.js

const fs = require('fs');
const dotenv = require('dotenv');
const path = require('path');
const { Client: PGClient } = require('pg');
const { Client: ESClient } = require('@elastic/elasticsearch');

console.log('\n############################\nメンテナンススクリプトを開始します\n############################\n');

const envFilePath = path.resolve(__dirname, './.env');

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
const ELASTICSEARCH_INDEX = post
// PostgreSQLクライアントの設定
const pgClient = new PGClient({
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

    // インデックスが存在するか確認
    const indexExists = await esClient.indices.exists({ index: ELASTICSEARCH_INDEX });

    if (!indexExists.body) {
      console.log(`ElasticSearchインデックス '${ELASTICSEARCH_INDEX}' が存在しません。作成します。`);

      // インデックスのマッピング設定
      const indexSettings = {
        mappings: {
          properties: {
            post_text: { type: 'text' },
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
      console.log(`ElasticSearchインデックス '${ELASTICSEARCH_INDEX}' は既に存在します。`);
    }
  } catch (error) {
    console.error('ElasticSearchのセットアップ中にエラーが発生しました:', error);
    if (retries > 0) {
      console.log(`30秒後に再試行します。残り試行回数: ${retries}`);
      await delay(30000); // 30秒待機
      await setupElasticSearchWithRetry(retries - 1);
    } else {
      console.error('ElasticSearchのセットアップに失敗しました。プロセスを終了します。');
      process.exit(1);
    }
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
      }
    });

    console.log(`ElasticSearchインデックス '${ELASTICSEARCH_INDEX}' のデータを削除しました。`);
    console.log(`削除結果: ${JSON.stringify(deleteResponse.body)}`);
  } catch (error) {
    console.error('ElasticSearchのデータ削除中にエラーが発生しました:', error);
    throw error;
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
      post_text: doc.post_text,
      post_createat: doc.post_createat,
      post_tag: doc.post_tag
      // 必要に応じて他のフィールドも追加
    });
  });

  try {
    const bulkResponse = await esClient.bulk({ refresh: true, body });

    if (bulkResponse.body.errors) {
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
    const { body } = await esClient.search({
      index: ELASTICSEARCH_INDEX,
      size: 10, // 取得するドキュメント数
      query: {
        match_all: {}
      }
    });

    console.log(`ElasticSearchインデックス '${ELASTICSEARCH_INDEX}' から取得したデータの一部:`);
    body.hits.hits.forEach((hit, index) => {
      console.log(`\nドキュメント ${index + 1}:`);
      console.log(JSON.stringify(hit._source, null, 2));
    });
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

    // ElasticSearchのデータ削除
    await deleteElasticSearchData();

    // PostgreSQLからデータ取得
    const postgresData = await fetchPostgresData();

    // ElasticSearchにデータ書き込み
    await bulkInsertToElasticSearch(postgresData);

    // データ検証
    await verifyElasticSearchData();

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
