const { Pool } = require('pg');
const { generateKeyPair } = require('./services/keys');
const { createDefaultActorIfNotExists } = require('./models/actor');

/**
 * ActivityPub機能の初期化・セットアップ
 * 
 * ActivityPub機能の初期化とセットアップを行います。
 * サーバー起動時に必要なテーブルの確認や初期データの作成を行います。
 */

// PostgreSQL接続プール
const pool = new Pool({
  user: process.env.POSTGRES_USER,
  host: process.env.POSTGRES_NAME,
  database: process.env.POSTGRES_DB,
  password: process.env.POSTGRES_PASSWORD,
  port: 5432,
});

/**
 * ActivityPub機能のセットアップを実行します
 * @param {object} config - 設定情報
 * @returns {Promise<void>}
 */
async function setupActivityPub(config = {}) {
  console.log('Setting up ActivityPub feature...');
  
  try {
    // 設定から必要な値を取得
    const username = config.defaultUsername || process.env.AP_DEFAULT_USERNAME || 'admin';
    
    // デフォルトアクターを作成（存在しなければ）
    await createDefaultActorIfNotExists(username);
    
    console.log(`ActivityPub setup complete: default actor "${username}" is ready`);
    
  } catch (error) {
    console.error('ActivityPub setup failed:', error);
    throw error;
  }
}

/**
 * メインエントリーポイント
 * @param {object} app - Expressアプリケーションインスタンス
 * @param {object} config - 設定情報
 */
async function initialize(app, config = {}) {
  try {
    // テーブルが存在するか確認（テーブルは事前に作成済みと仮定）
    const tableCheckQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'ap_actors'
      );
    `;
    
    const result = await pool.query(tableCheckQuery);
    const tablesExist = result.rows[0].exists;
    
    if (!tablesExist) {
      console.warn('ActivityPub tables do not exist. Please run database migrations first.');
      return;
    }
    
    // ActivityPub機能のセットアップを実行
    await setupActivityPub(config);
    
    console.log('ActivityPub initialization complete');
    
  } catch (error) {
    console.error('ActivityPub initialization failed:', error);
  }
}

module.exports = { initialize };