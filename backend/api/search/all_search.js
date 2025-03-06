/**
 * @fileoverview 統合検索APIを提供するExpressルーター
 * このモジュールは投稿データとブログデータを様々な条件で検索するための
 * 統合エンドポイントを提供します。
 */

import express from 'express';
import { searchPosts } from '../../component/elasticSearchService.js';
import logger from '../../logging/logger.js';

const router = express.Router();

/**
 * 統合検索APIエンドポイント
 * 
 * @route GET /api/search/all_search
 * @param {string} q - 検索テキスト
 * @param {string} type - 検索タイプ (post_full_text, post_hashtag, blog_full_text, blog_hashtag, blog_title)
 * @param {number} limit - 返す最大結果数
 * @param {string} search_after - ページネーション用のマーカー
 * @returns {Object} 検索結果と検索メタデータを含むJSONオブジェクト
 */
router.get('/all_search', async (req, res) => {
    try {
        // リクエスト全体をログに記録
        logger.debug(`All search request query params: ${JSON.stringify(req.query)}`);
        
        // クエリパラメータから検索データを取得
        const searchText = req.query.q || '';
        const searchType = req.query.type || 'post_full_text';
        const limit = parseInt(req.query.limit) || 10;
        
        // 検索テキストの正規化（ハッシュタグ検索の場合）
        let normalizedText = searchText;
        if (searchType === 'post_hashtag' || searchType === 'blog_hashtag') {
            normalizedText = searchText.startsWith('#') ? searchText : `#${searchText}`;
        }
        
        logger.debug(`Normalized search text: "${normalizedText}", Type: ${searchType}`);
        
        // search_afterパラメータの処理（ページネーション用）
        let searchAfter = null;
        if (req.query.search_after) {
            try {
                if (typeof req.query.search_after === 'string' && req.query.search_after.length > 0) {
                    const timestamp = req.query.search_after.substring(0, 14);
                    const id = req.query.search_after.substring(14);
                    searchAfter = [timestamp, id];
                } else if (Array.isArray(req.query.search_after)) {
                    searchAfter = req.query.search_after;
                }
            } catch (parseError) {
                logger.error(`Invalid search_after parameter: ${req.query.search_after}`);
                searchAfter = null;
            }
        }

        logger.info(`Search request - text: "${normalizedText}", type: ${searchType}, limit: ${limit}, search_after: ${JSON.stringify(searchAfter)}`);

        // 検索タイプのマッピング
        let elasticSearchType;
        switch (searchType) {
            case 'post_full_text':
                elasticSearchType = 'full_text';
                break;
            case 'post_hashtag':
                elasticSearchType = 'tag';
                break;
            case 'blog_title':
                elasticSearchType = 'title';
                break;
            case 'blog_full_text':
                elasticSearchType = 'full_text'; // 適切なindexを指定する必要があります
                break;
            case 'blog_hashtag':
                elasticSearchType = 'tag'; // 適切なindexを指定する必要があります
                break;
            default:
                elasticSearchType = 'full_text';
        }

        // ElasticSearchServiceを使用して検索を実行
        const results = await searchPosts(normalizedText, elasticSearchType, limit, searchAfter);

        // レスポンスの形成
        const response = {
            success: true,
            data: results.posts,
            meta: {
                total: results.total,
                limit: limit,
                next_search_after: results.next_search_after
            }
        };

        res.json(response);
    } catch (error) {
        logger.error(`Search error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'Error performing search',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

export default router;