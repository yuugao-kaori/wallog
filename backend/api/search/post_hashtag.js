/**
 * @fileoverview ハッシュタグ検索APIを提供するExpressルーター
 * このモジュールは投稿データをハッシュタグで検索するためのエンドポイントを提供します。
 * クエリパラメータを使用して検索条件を受け取ります。
 */

import express from 'express';
import { searchPosts } from '../../component/elasticSearchService.js';
import logger from '../../logging/logger.js';

const router = express.Router();

/**
 * ハッシュタグ検索APIエンドポイント
 * 
 * @route GET /api/search/post_hashtag
 * @param {string} q - 検索するハッシュタグ（#は省略可能）
 * @param {number} limit - 返す最大結果数
 * @param {string} search_after - ページネーション用のマーカー
 * @returns {Object} 検索結果を含むJSONオブジェクト
 */
router.get('/post_hashtag', async (req, res) => {
    try {
        // リクエスト全体をログに記録
        logger.debug(`Tag search request query params: ${JSON.stringify(req.query)}`);
        
        // クエリパラメータから検索データを取得
        const tagText = req.query.q || '';
        const limit = parseInt(req.query.limit) || 10;
        
        // タグテキストの正規化（#がない場合は追加）
        const normalizedTag = tagText.startsWith('#') ? tagText : `#${tagText}`;
        
        logger.debug(`Normalized tag search text: "${normalizedTag}"`);
        
        // search_afterパラメータの処理（ページネーション用）
        let searchAfter = null;
        if (req.query.search_after) {
            try {
                if (req.query.search_after.length > 0) {
                    const timestamp = req.query.search_after.substring(0, 14);
                    const id = req.query.search_after.substring(14);
                    searchAfter = [timestamp, id];
                }
            } catch (parseError) {
                logger.error(`Invalid search_after parameter: ${req.query.search_after}`);
                searchAfter = null;
            }
        }

        logger.info(`Tag search request - tag: "${normalizedTag}", limit: ${limit}, search_after: ${searchAfter}`);

        // ElasticSearchServiceを使用して検索を実行
        const results = await searchPosts(normalizedTag, 'tag', limit, searchAfter);

        res.json(results.posts);
    } catch (error) {
        logger.error(`Tag search error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'Error searching posts by tag',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

export default router;
