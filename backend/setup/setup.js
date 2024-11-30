import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';
import pkg from 'pg';
const { Client } = pkg;
import { Client as ESClient } from '@elastic/elasticsearch';
import { fileURLToPath } from 'url';
// __dirname の代替を定義
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    ELASTICSEARCH_INDEX2,
    ELASTICSEARCH_INDEX3,
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
  (async () => {
    try {
      console.log('PostgreSQLに接続を試みています...');
      await pgClient.connect(); // 1回だけ接続
      console.log('PostgreSQLに接続されました。');
  
      await checkTableExists();
      await updateSettingsFromJson();
    } catch (err) {
      console.error('SQL実行中にエラーが発生しました:', err);
    } finally {
      if (pgClient) {
        try {
          console.log('PostgreSQLのセットアップ処理を完了しました');
          await pgClient.end(); // クライアント接続を閉じる
          console.log('PostgreSQLクライアントを正常に終了しました');
          process.exit(0); // プロセスを正常終了
        } catch (endErr) {
          console.error('PostgreSQLクライアントの終了中にエラーが発生しました:', endErr);
          process.exit(1); // エラーがあった場合は異常終了
        }
      }
    }
  })();
  async function updateSettingsFromJson() {
    try {
        console.log('PostgreSQLには接続しています');

        const setupFilePath = path.join(__dirname, './setup.json');
        if (!fs.existsSync(setupFilePath)) {
            console.error('setup.json ファイルが見つかりません。');
            return;
        }

        const setupData = JSON.parse(fs.readFileSync(setupFilePath, 'utf-8'));
        if (setupData.setup_count !== 0) {
            console.log('setup_count が 0 ではないため、設定データの書き込みをスキップします。');
            return;
        }

        // `setupData` 全体を `settingsData` として扱う
        const { setup_count, ...settingsData } = setupData;
        console.log('settingsData の内容:', settingsData);

        if (Object.keys(settingsData).length === 0) {
            console.warn('settingsData が空です。設定データが正しく読み込まれていることを確認してください。');
            return;
        }

        // トランザクションを開始
        await pgClient.query('BEGIN');
        for (const [key, value] of Object.entries(settingsData)) {
            console.log(`処理中の設定キー: ${key}, 値: ${value}`);
            const checkQuery = 'SELECT COUNT(*) AS count FROM settings WHERE settings_key = $1';
            const result = await pgClient.query(checkQuery, [key]);
            
            console.log(`キー ${key} の存在チェック結果:`, result.rows[0].count);

            if (parseInt(result.rows[0].count, 10) === 0) {
                const insertQuery = 'INSERT INTO settings (settings_key, settings_value) VALUES ($1, $2)';
                try {
                    await pgClient.query(insertQuery, [key, value]);
                    console.log(`設定 ${key} を settings テーブルに追加しました。`);
                } catch (queryErr) {
                    console.error(`設定 ${key} の追加中にエラーが発生しました:`, queryErr);
                    throw queryErr; // エラーが発生した場合はロールバック
                }
            } else {
                console.log(`設定 ${key} は既に存在します。��書きしません。`);
            }
        }

        // トランザクションをコミット
        await pgClient.query('COMMIT');
        console.log('設定データが正常に書き込まれました。');

        setupData.setup_count = 1;
        fs.writeFileSync(setupFilePath, JSON.stringify(setupData, null, 2));
        console.log('setup.json の setup_count を 1 に更新しました。');

    } catch (err) {
        console.error('settings テーブルの更新中にエラーが発生しました:', err);
        try {
            // トランザクションをロールバック
            await pgClient.query('ROLLBACK');
            console.log('ロールバックが実行されました。');
        } catch (rollbackErr) {
            console.error('ロールバック中にエラーが発生しました:', rollbackErr);
        }
    } finally {
        console.log('デフォルト設定の適用を完了しました');
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

      // 全てのインデックスに共通の設定
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
            post_text: { type: 'text', analyzer: 'kuromoji' },
            post_createat: { type: 'date' },
            post_tag: { type: 'keyword' }
          }
        }
      };

      // 各インデックスを順番に処理
      const indices = [ELASTICSEARCH_INDEX, ELASTICSEARCH_INDEX2, ELASTICSEARCH_INDEX3];
      
      for (const index of indices) {
        try {
          // インデックスの存在確認
          const indexExists = await esClient.indices.exists({ index });

          if (!indexExists) {
            console.log(`ElasticSearchインデックス '${index}' が存在しません。作成します。`);
            await esClient.indices.create({
              index,
              body: indexSettings
            });
            console.log(`ElasticSearchインデックス '${index}' が作成されました。`);
          } else {
            console.log(`ElasticSearchインデックス '${index}' は既に存在します。設定を更新します。`);
            await esClient.indices.putSettings({
              index,
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
            console.log(`ElasticSearchインデックス '${index}' のレプリカ数とティア設定を更新しました。`);
          }
        } catch (indexError) {
          console.error(`インデックス '${index}' の処理中にエラーが発生しました:`, indexError);
          // 個別のインデックスエラーは全体の処理を停止させない
          continue;
        }
      }
    } catch (error) {
      console.error('ElasticSearchのセットアップ中にエラーが発生しました:', error);
      if (retries > 0) {
        console.log(`30秒後に再試行します。残り試行回数: ${retries}`);
        await delay(30000);
        await setupElasticSearchWithRetry(retries - 1);
      } else {
        throw error;
      }
    }
  }

  /**
   * PostgreSQLのテーブルとトリガーのセットアップ
   */
  async function checkTableExists() {
    try {
      // PostgreSQLに接続

      // postテーブルが存在するか確認
      const res = await pgClient.query(`
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.tables 
          WHERE table_schema = 'public'
          AND table_name = 'sessions'
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
      console.log(`ElasticSearchのセットアップ処理を完了しました`);
      // ElasticSearchクライアントを終了
      esClient.close();
    }
  }


} else {
  console.log('.envファイルが見つかりませんでした。');
}
