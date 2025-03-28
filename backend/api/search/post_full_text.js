/**
 * @fileoverview 投稿検索APIを提供するExpressルーター
 * このモジュールは投稿データをElasticSearchを使って検索するためのエンドポイントを提供します。
 * キーワードによる検索をサポートし、タイトル、全文、タグでの検索が可能です。
 * ページネーション機能も実装されています。
 */

import express from 'express';
import { searchPosts } from '../../component/elasticSearchService.js';
import logger from '../../logging/logger.js';

const router = express.Router();

/**
 * 投稿検索APIエンドポイント
 * 
 * @route GET /api/search/post
 * @param {string} q - 検索クエリテキスト
 * @param {string} type - 検索タイプ (title, full_text, tag)
 * @param {number} limit - 返す最大結果数
 * @param {string} search_after - ページネーション用のマーカー
 * @returns {Object} 検索結果を含むJSONオブジェクト
 */
router.get('/post', async (req, res) => {
    try {
        // リクエスト全体をログに記録して問題を診断
        logger.debug(`Search request query params: ${JSON.stringify(req.query)}`);
        
        // クエリパラメータから検索データを取得
        const searchText = req.query.q || '';
        const searchType = req.query.type || 'full_text';
        const limit = parseInt(req.query.limit) || 10;
        
        // 重要な値をログに出力
        logger.debug(`Extracted searchText: "${searchText}"`);
        logger.debug(`Extracted searchType: "${searchType}"`);
        
        // search_afterパラメータの処理（ページネーション用）
        let searchAfter = null;
        if (req.query.search_after) {
            try {
                // フロントエンドから渡されるsearch_afterをデコードして配列に変換
                // タイムスタンプ+IDの形式が期待される（例: 20230101000000123456）
                if (req.query.search_after.length > 0) {
                    const timestamp = req.query.search_after.substring(0, 14); // タイムスタンプ部分
                    const id = req.query.search_after.substring(14); // ID部分
                    searchAfter = [timestamp, id];
                }
            } catch (parseError) {
                logger.error(`Invalid search_after parameter: ${req.query.search_after}`);
                searchAfter = null;
            }
        }

        logger.info(`Search request - text: "${searchText}", type: ${searchType}, limit: ${limit}, search_after: ${searchAfter}`);

        // 検索実行する直前に最終確認のログを出力
        logger.debug(`About to call searchPosts with searchText: "${searchText}"`);
        
        // ElasticSearchサービスを使用して検索を実行
        const results = await searchPosts(searchText, searchType, limit, searchAfter);

        // フロントエンド用に次のページネーションマーカーを形式化
        let nextSearchAfter = null;
        if (results.next_search_after) {
            nextSearchAfter = `${results.next_search_after[0]}${results.next_search_after[1]}`;
        }

        res.json(results.posts);
    } catch (error) {
        logger.error(`Search error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'Error searching posts',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

export default router;