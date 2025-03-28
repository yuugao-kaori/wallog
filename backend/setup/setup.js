import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';
import pkg from 'pg';
const { Client } = pkg;
import { Client as ESClient } from '@elastic/elasticsearch';
import { fileURLToPath } from 'url';
import { esClient, pgClient, initializeClients } from './maintenance.js';
// __dirname の代替を定義
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ログ記録関数を追加
async function logSetupAction(client, level, message, metadata = {}) {
  try {
    const query = `
      INSERT INTO logs (level, source, message, metadata)
      VALUES ($1, $2, $3, $4)
    `;
    await client.query(query, [
      level,
      'setup',
      message,
      JSON.stringify(metadata)
    ]);
  } catch (error) {
    console.error('ログの記録に失敗しました:', error);
  }
}

async function setupDatabase() {
  const client = new Client({
    user: process.env.POSTGRES_USER,
    host: process.env.POSTGRES_NAME,
    database: process.env.POSTGRES_DB,
    password: process.env.POSTGRES_PASSWORD,
    port: 5432,
  });

  try {
    await client.connect();
    await logSetupAction(client, 'INFO', 'データベース接続を確認しました。');
    console.log('データベース接続を確認しました。');
  } catch (error) {
    console.error('データベースセットアップ中にエラーが発生しました:', error);
    if (client) {
      await logSetupAction(client, 'ERROR', 'データベースセットアップ中にエラーが発生しました', { error: error.message });
    }
    throw error;
  } finally {
    if (client) {
      await client.end();
    }
  }
}

// その他のヘルパー関数の定義
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function checkElasticsearchConnection(esClient) {
  try {
    const health = await esClient.cluster.health();
    console.log('Elasticsearch接続状態:', health);
    return true;
  } catch (error) {
    console.error('Elasticsearch接続確認中のエラー:', error);
    return false;
  }
}

async function setupElasticSearchWithRetry(retries, esClient, ELASTICSEARCH_INDEX, ELASTICSEARCH_INDEX2, ELASTICSEARCH_INDEX3) {
  try {
    const isConnected = await checkElasticsearchConnection(esClient);
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
      await setupElasticSearchWithRetry(retries - 1, esClient, ELASTICSEARCH_INDEX, ELASTICSEARCH_INDEX2, ELASTICSEARCH_INDEX3);
    } else {
      throw error;
    }
  }
}

// ElasticSearchのセットアップ
async function setupElasticSearch() {
  try {
    const isConnected = await checkElasticsearchConnection();
    if (!isConnected) {
      throw new Error("ElasticSearchに接続できません");
    }

    // インデックスの存在をチェック
    const indexExists = await esClient.indices.exists({ index: "post" });

    if (!indexExists) {
      console.log('ElasticSearchインデックス "post" が存在しません。作成します...');
      
      // インデックスの作成
      await esClient.indices.create({
        index: "post",
        body: {
          settings: {
            number_of_shards: 1,
            number_of_replicas: 0,
            analysis: {
              analyzer: {
                kuromoji_analyzer: {
                  type: "custom",
                  tokenizer: "kuromoji_tokenizer"
                },
                ngram_analyzer: {
                  type: "custom",
                  tokenizer: "ngram_tokenizer",
                  filter: ["lowercase"]
                }
              },
              tokenizer: {
                ngram_tokenizer: {
                  type: "ngram",
                  min_gram: 2,
                  max_gram: 3,
                  token_chars: ["letter", "digit"]
                }
              }
            }
          },
          mappings: {
            properties: {
              post_id: { type: "keyword" },
              post_text: { 
                type: "text", 
                analyzer: "kuromoji_analyzer",
                fields: {
                  ngram: {
                    type: "text",
                    analyzer: "ngram_analyzer"
                  }
                }
              },
              post_createat: { type: "date" },
              post_tag: { type: "keyword" }
            }
          }
        }
      });
      console.log('ElasticSearchインデックス "post" を作成しました');
    } else {
      console.log('ElasticSearchインデックス "post" は既に存在します');
    }

    // blogインデックスの存在をチェック
    const blogIndexExists = await esClient.indices.exists({ index: "blog" });

    if (!blogIndexExists) {
      console.log('ElasticSearchインデックス "blog" が存在しません。作成します...');
      
      // blogインデックスの作成
      await esClient.indices.create({
        index: "blog",
        body: {
          settings: {
            number_of_shards: 1,
            number_of_replicas: 0,
            analysis: {
              analyzer: {
                kuromoji_analyzer: {
                  type: "custom",
                  tokenizer: "kuromoji_tokenizer"
                },
                ngram_analyzer: {
                  type: "custom",
                  tokenizer: "ngram_tokenizer",
                  filter: ["lowercase"]
                }
              },
              tokenizer: {
                ngram_tokenizer: {
                  type: "ngram",
                  min_gram: 2,
                  max_gram: 3,
                  token_chars: ["letter", "digit"]
                }
              }
            }
          },
          mappings: {
            properties: {
              blog_id: { type: "keyword" },
              blog_title: { 
                type: "text", 
                analyzer: "kuromoji_analyzer",
                fields: {
                  ngram: {
                    type: "text",
                    analyzer: "ngram_analyzer"
                  }
                }
              },
              blog_text: { 
                type: "text", 
                analyzer: "kuromoji_analyzer",
                fields: {
                  ngram: {
                    type: "text",
                    analyzer: "ngram_analyzer"
                  }
                }
              },
              blog_createat: { type: "date" },
              blog_tag: { type: "keyword" }
            }
          }
        }
      });
      console.log('ElasticSearchインデックス "blog" を作成しました');
    } else {
      console.log('ElasticSearchインデックス "blog" は既に存在します');
    }

  } catch (error) {
    console.error("ElasticSearchのセットアップ中にエラーが発生しました:", error);
    throw error;
  }
}

async function checkTableExists(pgClient, APP_ADMIN_USER, APP_ADMIN_PASSWORD) {
  try {
    // PostgreSQLに接続

    // ElasticSearchクライアントの設定
    const esClient = new ESClient({
      node: `http://${process.env.ELASTICSEARCH_HOST}:${process.env.ELASTICSEARCH_PORT}`,
      auth: {
        username: process.env.ELASTICSEARCH_USER,
        password: process.env.ELASTICSEARCH_PASSWORD
      },
      maxRetries: 5,
      requestTimeout: 60000,
      sniffOnStart: true,
      ssl: {
        rejectUnauthorized: false
      }
    });

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
      await logSetupAction(pgClient, 'INFO', '動作に必要なテーブルの存在を確認しました。');
      console.log('動作に必要なテーブルの存在を確認しました。');
    } else {
      await logSetupAction(pgClient, 'INFO', '必要なテーブルが存在しません。テーブル作成を実行します。');
      console.log('動作に必要なテーブルが存在しません。\nテーブル作成を実行します。');

      // ./setup/init.sqlを実行
      const sqlFilePath = path.join(__dirname, './init.sql');
      const sql = fs.readFileSync(sqlFilePath, 'utf8');
      
      console.log('データベースにテーブル作成SQLを実行します。');
      await pgClient.query(sql);
      await logSetupAction(pgClient, 'INFO', 'テーブル作成SQLを実行し、テーブルが作成されました。');
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
      await logSetupAction(pgClient, 'INFO', '管理者ユーザーの作成を開始します。', { user_id: APP_ADMIN_USER });
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
      await logSetupAction(pgClient, 'INFO', '管理者ユーザーが作成されました。', { user_id: APP_ADMIN_USER });
      console.log(`管理者ユーザーが作成されました。ユーザID：'${APP_ADMIN_USER}'`);
    } else {
      await logSetupAction(pgClient, 'INFO', '管理者ユーザーの存在を確認しました。', { user_id: APP_ADMIN_USER });
      console.log(`管理者ユーザーの存在を確認しました。ユーザID：'${APP_ADMIN_USER}'`);
    }

    /**
     * ElasticSearchのセットアップを再試行付きで実行
     */
    await setupElasticSearchWithRetry(
      5,
      esClient,
      process.env.ELASTICSEARCH_INDEX,
      process.env.ELASTICSEARCH_INDEX2,
      process.env.ELASTICSEARCH_INDEX3
    );
    
  } catch (err) {
    await logSetupAction(pgClient, 'ERROR', 'SQL実行中にエラーが発生しました', { error: err.message });
    console.error('SQL実行中にエラーが発生しました:', err);
  } finally {
    console.log(`ElasticSearchのセットアップ処理を完了しました`);
    // ElasticSearchクライアントを終了
    if (esClient) {
      await esClient.close();
    }
  }
}

async function updateSettingsFromJson(pgClient) {
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
        console.log(`設定 ${key} は既に存在します。上書きしません。`);
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

export const runSetup = async () => {
  console.log('\n############################\nセットアップ処理を開始します\n############################\n');

  const envFilePath = './.env';

  if (fs.existsSync(envFilePath)) {
    dotenv.config();
    console.log('.envファイルを認識しました。\n');

    // 環境変数チェックを.env読み込み後に移動
    console.log('Direct env check:');
    console.log('ELASTICSEARCH_HOST:', process.env.ELASTICSEARCH_HOST);
    console.log('ELASTICSEARCH_HOST2:', process.env.ELASTICSEARCH_HOST2);

    // 環境変数の読み込み
    const { 
      POSTGRES_USER, 
      POSTGRES_PASSWORD, 
      POSTGRES_DB, 
      POSTGRES_NAME,
      ELASTICSEARCH_HOST,
      ELASTICSEARCH_HOST2,
      ELASTICSEARCH_PORT,
      ELASTICSEARCH_USER,
      ELASTICSEARCH_PASSWORD,
      ELASTICSEARCH_INDEX,
      ELASTICSEARCH_INDEX2,
      ELASTICSEARCH_INDEX3,
      APP_ADMIN_USER,
      APP_ADMIN_PASSWORD
    } = process.env;

    console.log(`es host:${ELASTICSEARCH_HOST}`);
    console.log(`es host2:${ELASTICSEARCH_HOST2}`);
    console.log(`pg host:${POSTGRES_NAME}`);

    const pgClient = new Client({
      user: POSTGRES_USER,
      host: POSTGRES_NAME,
      database: POSTGRES_DB,
      password: POSTGRES_PASSWORD,
      port: 5432,
    });

    try {
      console.log('PostgreSQLに接続を試みています...');
      await pgClient.connect();
      await logSetupAction(pgClient, 'INFO', 'セットアップ処理を開始します');
      console.log('PostgreSQLに接続されました。');

      await checkTableExists(pgClient, APP_ADMIN_USER, APP_ADMIN_PASSWORD);
      await updateSettingsFromJson(pgClient);
      await setupDatabase();
      await logSetupAction(pgClient, 'INFO', 'セットアップ処理が完了しました');
    } catch (err) {
      if (pgClient) {
        await logSetupAction(pgClient, 'ERROR', 'セットアップ処理中にエラーが発生しました', { error: err.message });
      }
      console.error('SQL実行中にエラーが発生しました:', err);
      throw err;
    } finally {
      if (pgClient) {
        try {
          console.log('PostgreSQLのセットアップ処理を完了しました');
          await pgClient.end();
          console.log('PostgreSQLクライアントを正常に終了しました');
        } catch (endErr) {
          console.error('PostgreSQLクライアントの終了中にエラーが発生しました:', endErr);
          throw endErr;
        }
      }
    }
  } else {
    console.log('.envファイルが見つかりませんでした。');
    throw new Error('.envファイルが見つかりません');
  }

  console.log('\n############################\nセットアップが完了しました\n############################\n');
};
