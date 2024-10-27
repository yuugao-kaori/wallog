import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';
import pkg from 'pg';
const { Client } = pkg;
import { Client as ESClient } from '@elastic/elasticsearch';



console.log('\n############################\nセットアップ処理を開始します\n############################\n');

const envFilePath = './.env';

if (fs.existsSync(envFilePath)) {
  dotenv.config();
  console.log('.envファイルを認識しました。\n');

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
    ELASTICSEARCH_INDEX,
    APP_ADMIN_USER,
    APP_ADMIN_PASSWORD
  } = process.env;

  // PostgreSQLクライアントの設定
  const pgClient = new Client({
    user: POSTGRES_USER,
    host: POSTGRES_NAME,
    database: POSTGRES_DB,
    password: POSTGRES_PASSWORD,
    port: 5432,
  });

  // ElasticSearchクライアントの設定を修正
  const esClient = new ESClient({
    node: {
      url: new URL(`http://${ELASTICSEARCH_HOST}:9200`),
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
      console.log('Elasticsearch接続状態:', health);
      return true;
    } catch (error) {
      console.error('Elasticsearch接続確認中のエラー:', error);
      return false;
    }
  }

  /**
   * ElasticSearchのセットアップを再試行付きで実行する関数
   * @param {number} retries - 残りの再試行回数
   */
  async function setupElasticSearchWithRetry(retries) {
    try {
      // まず接続を確認
      const isConnected = await checkElasticsearchConnection();
      if (!isConnected) {
        throw new Error('Elasticsearchに接続できません');
      }

      // インデックスが存在するか確認
      const indexExists = await esClient.indices.exists({
        index: ELASTICSEARCH_INDEX
      });

      if (!indexExists) {
        console.log(`ElasticSearchインデックス '${ELASTICSEARCH_INDEX}' が存在しません。作成します。`);

        // インデックスのマッピング設定
        const indexSettings = {
          mappings: {
            properties: {
              post_id: { type: 'keyword' },
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
   * PostgreSQLのテーブルとトリガーのセットアップ
   */
  async function checkTableExists() {
    try {
      // PostgreSQLに接続
      await pgClient.connect();

      // postテーブルが存在するか確認
      const res = await pgClient.query(`
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.tables 
          WHERE table_schema = 'public'
          AND table_name = 'post'
        );
      `);

      if (res.rows[0].exists) {
        console.log('動作に必要なテーブルの存在を確認しました。');
      } else {
        console.log('動作に必要なテーブルが存在しません。\nテーブル作成を実行します。');

        // ./setup/init.sqlを実行
        const sqlFilePath = path.join(__dirname, './init.sql');
        const sql = fs.readFileSync(sqlFilePath, 'utf8');
        
        console.log('データベースにテーブル作成SQLを実行します。');
        await pgClient.query(sql);
        console.log('テーブル作成SQLを実行し、テーブルが作成されました。');
      }

      // トリガーが存在するか確認
      const checkTrigger = `
        SELECT tgname 
        FROM pg_trigger 
        WHERE tgname = 'post_update_trigger';
      `;

      const resTrigger = await pgClient.query(checkTrigger);

      if (resTrigger.rows.length === 0) {
        console.log('トリガーが存在しません。新規作成します。');

        const notify = `
          CREATE OR REPLACE FUNCTION notify_post_update()
          RETURNS TRIGGER AS $$
          BEGIN
            PERFORM pg_notify('post_updates', 'Post updated');
            RETURN NEW;
          END;
          $$ LANGUAGE plpgsql;
      
          CREATE TRIGGER post_update_trigger
          AFTER INSERT OR UPDATE ON post
          FOR EACH ROW EXECUTE FUNCTION notify_post_update();
        `;
        await pgClient.query(notify);
        console.log('トリガーが作成されました');
      } else {
        console.log('トリガーは既に存在しています。');
      }

      // 管理者ユーザーの作成
      const now = new Date();
      const checkAdminUserQuery = 'SELECT user_id FROM "user" WHERE user_id = $1';
      const result = await pgClient.query(checkAdminUserQuery, [APP_ADMIN_USER]);

      if (result.rows.length === 0) {
        console.log(`.envで定義された管理者ユーザーがテーブルに存在しません。\n初期ユーザの作成処理を行います。`);
        const insert_sql = `
          INSERT INTO "user" (
            user_id, 
            user_password, 
            user_salt, 
            user_birth,
            user_icon,
            user_mail,
            user_attitude,
            user_prof,
            user_createat,
            user_updateat,
            user_failcount,
            user_token
          ) VALUES ($1, $2, 'salt', null, 'none_data', 'none_data', null, 'none_data', $3, $4, 0, 'none_data');
        `;
        
        await pgClient.query(insert_sql, [APP_ADMIN_USER, APP_ADMIN_PASSWORD, now, now]);
        console.log(`管理者ユーザーが作成されました。ユーザID：'${APP_ADMIN_USER}'`);
      } else {
        console.log(`管理者ユーザーの存在を確認しました。ユーザID：'${APP_ADMIN_USER}'`);
      }

      /**
       * ElasticSearchのセットアップを再試行付きで実行
       */
      await setupElasticSearchWithRetry(5);

    } catch (err) {
      console.error('SQL実行中にエラーが発生しました:', err);
    } finally {
      // PostgreSQLクライアントを終了
      await pgClient.end();
      // ElasticSearchクライアントを終了
      esClient.close();
    }
  }

  // セットアップ関数を実行
  checkTableExists();

} else {
  console.log('.envファイルが見つかりませんでした。');
} 
