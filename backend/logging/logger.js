/**
 * ロギングシステム
 * 
 * @module logger
 * @description PostgreSQLデータベースを使用してアプリケーションのログを記録するためのユーティリティ
 * 
 * @example
 * // 基本的な使用方法
 * import { logger } from '../logging/logger.js';
 * 
 * // 異なるログレベルでのログ記録
 * await logger.info('ユーザーがログインしました', { userId: 'user123' });
 * await logger.warn('パスワードリセット要求', { userId: 'user123', requestIP: '192.168.1.1' });
 * await logger.error('データベース接続に失敗しました', { errorCode: 500, errorMessage: 'Connection timeout' });
 * await logger.debug('詳細なデバッグ情報', { queryParams: { limit: 10, page: 2 } });
 * 
 * // カスタムソースを指定する
 * await logger.info('サービスが開始しました', { port: 3000 }, 'api-server');
 * 
 * // クラス内でのthisコンテキストを使用する場合
 * const logMethod = logger.info;
 * logMethod('コンテキスト付きメッセージ', { contextData: 'value' });
 */

import pkg from 'pg';
const { Pool } = pkg;

/**
 * PostgreSQLへの接続プール
 * @type {Pool}
 */
const pool = new Pool({
  user: process.env.POSTGRES_USER,
  host: process.env.POSTGRES_NAME,
  database: process.env.POSTGRES_DB,
  password: process.env.POSTGRES_PASSWORD,
  port: 5432,
});

/**
 * @typedef {Object} Logger
 * @property {Function} debug - デバッグレベルのログを記録します
 * @property {Function} info - 情報レベルのログを記録します
 * @property {Function} warn - 警告レベルのログを記録します
 * @property {Function} error - エラーレベルのログを記録します
 */

/**
 * ログをコンソールに出力する関数
 * 
 * @param {string} level - ログレベル ('DEBUG', 'INFO', 'WARN', 'ERROR')
 * @param {string} message - ログメッセージ
 * @param {Object} [metadata={}] - 追加のメタデータ
 * @param {string} [source='application'] - ログのソース
 */
function logToConsole(level, message, metadata = {}, source = 'application') {
  const timestamp = new Date().toISOString();
  const logData = {
    timestamp,
    level,
    source,
    message,
    metadata
  };
  
  switch(level) {
    case 'DEBUG':
      console.debug(`[${timestamp}] [${level}] [${source}] ${message}`, metadata);
      break;
    case 'INFO':
      console.info(`[${timestamp}] [${level}] [${source}] ${message}`, metadata);
      break;
    case 'WARN':
      console.warn(`[${timestamp}] [${level}] [${source}] ${message}`, metadata);
      break;
    case 'ERROR':
      console.error(`[${timestamp}] [${level}] [${source}] ${message}`, metadata);
      break;
    default:
      console.log(`[${timestamp}] [${level}] [${source}] ${message}`, metadata);
  }
}

/**
 * ログを記録する関数
 * 
 * @param {string} level - ログレベル ('DEBUG', 'INFO', 'WARN', 'ERROR')
 * @param {string} message - ログメッセージ
 * @param {Object} [metadata={}] - 追加のメタデータ
 * @param {string} [source='application'] - ログのソース
 * @returns {Promise<void>}
 */
async function log(level, message, metadata = {}, source = 'application') {
  // コンソールにログを出力
  logToConsole(level, message, metadata, source);
  
  // データベースにログを記録
  const client = await pool.connect();
  try {
    const query = `
      INSERT INTO logs (level, source, message, metadata)
      VALUES ($1, $2, $3, $4)
    `;
    await client.query(query, [
      level,
      source,
      message,
      JSON.stringify(metadata)
    ]);
  } catch (error) {
    console.error('ログの記録に失敗しました:', error);
  } finally {
    client.release();
  }
}

/**
 * ロガーオブジェクト
 * @type {Logger}
 */
export const logger = {
  /**
   * DEBUGレベルのログを記録します
   * 
   * @param {string} message - ログメッセージ
   * @param {Object} [metadata={}] - 追加のメタデータ
   * @param {string} [source='application'] - ログのソース
   * @returns {Promise<void>}
   */
  debug: async (message, metadata = {}, source = 'application') => {
    await log('DEBUG', message, metadata, source);
  },

  /**
   * INFOレベルのログを記録します
   * 
   * @param {string} message - ログメッセージ
   * @param {Object} [metadata={}] - 追加のメタデータ
   * @param {string} [source='application'] - ログのソース
   * @returns {Promise<void>}
   */
  info: async (message, metadata = {}, source = 'application') => {
    await log('INFO', message, metadata, source);
  },

  /**
   * WARNレベルのログを記録します
   * 
   * @param {string} message - ログメッセージ
   * @param {Object} [metadata={}] - 追加のメタデータ
   * @param {string} [source='application'] - ログのソース
   * @returns {Promise<void>}
   */
  warn: async (message, metadata = {}, source = 'application') => {
    await log('WARN', message, metadata, source);
  },

  /**
   * ERRORレベルのログを記録します
   * 
   * @param {string} message - ログメッセージ
   * @param {Object} [metadata={}] - 追加のメタデータ
   * @param {string} [source='application'] - ログのソース
   * @returns {Promise<void>}
   */
  error: async (message, metadata = {}, source = 'application') => {
    await log('ERROR', message, metadata, source);
  }
};

/**
 * エラーハンドリングラッパー
 * 
 * @param {Function} fn - 実行する関数
 * @param {string} errorMessage - エラー発生時のメッセージ
 * @param {Object} [metadata={}] - エラーに関連するメタデータ
 * @param {string} [source='application'] - ログのソース
 * @returns {Function} - ラップされた関数
 */
export const withErrorLogging = (fn, errorMessage, metadata = {}, source = 'application') => {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      const errorData = {
        ...metadata,
        errorMessage: error.message,
        stack: error.stack
      };
      await logger.error(errorMessage, errorData, source);
      throw error;
    }
  };
};

/**
 * PostgreSQLクライアントを初期化します
 * 
 * @returns {Promise<Object>} - 接続プールオブジェクト
 */
export async function initLogger() {
  try {
    // 接続テスト
    const client = await pool.connect();
    await logger.info('ロギングシステムが初期化されました');
    client.release();
    return pool;
  } catch (error) {
    console.error('ロガーの初期化に失敗しました:', error);
    throw error;
  }
}

export default logger;