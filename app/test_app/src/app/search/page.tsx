'use client';

import React, { useState, useEffect, useCallback } from 'react';
import PostCard from '@/components/PostCard';
import BlogCard from '@/components/BlogCard'; // Import the BlogCard component
import axios from 'axios';
import { useSearchParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { FaSearch } from "react-icons/fa"; // React Iconsからの検索アイコンをインポート

interface Post {
  post_id: string;
  post_createat: string;
  post_text: string;
  post_tag: string;
  post_file?: string;
  created_at: string;
  user_id: string;
}

// Blog interface for blog search results
interface Blog {
  blog_id: string;
  blog_text: string;
  blog_title: string;
  blog_createat: string;
  blog_thumbnail?: string;
  blog_description?: string;
}

// Union type for search results
type SearchResultItem = Post | Blog;

// 新しいAPIレスポンス型定義
interface SearchResponse {
  success: boolean;
  data: SearchResultItem[];
  meta: {
    total: number;
    limit: number;
    next_search_after: string | null;
  };
  error?: string;
}

// メタデータ表示用のコンポーネント
interface SearchMetadataProps {
  total: number;
  currentPage: number;
  hasMore: boolean;
  searchTerm: string;
  searchType: string;
  sinceDate: string | null;
  untilDate: string | null;
}

const SearchMetadata: React.FC<SearchMetadataProps> = ({
  total,
  currentPage,
  hasMore,
  searchTerm,
  searchType,
  sinceDate,
  untilDate
}) => {
  const getSearchTypeLabel = (type: string): string => {
    const typeMap: Record<string, string> = {
      'post_full_text': 'Diary-全文検索',
      'post_hashtag': 'Diary-タグ検索',
      'blog_full_text': 'Blog-全文検索',
      'blog_hashtag': 'Blog-タグ検索',
      'blog_title': 'Blog-タイトル検索'
    };
    return typeMap[type] || type;
  };

  return (
    <div className="p-4 mb-4 rounded-lg shadow">
      <h3 className="text-s font-semibold mb-2 dark:text-white">検索結果</h3>
      <div className="text-sm text-gray-600 dark:text-gray-300">
        <p>総件数: {total}件  現在のページ: {currentPage}</p>
        {searchTerm && (
          <p>検索キーワード: 『<span className="font-medium">{searchTerm}</span>』</p>
        )}
        {searchTerm && (
          <p>検索モード： ({getSearchTypeLabel(searchType)})</p>
        )}
        {(sinceDate || untilDate) && (
          <p>
            期間: 
            {sinceDate ? <span className="font-medium">{sinceDate}</span> : '指定なし'}
            {' 〜 '}
            {untilDate ? <span className="font-medium">{untilDate}</span> : '指定なし'}
          </p>
        )}
        {hasMore && <p className="text-blue-500">※ さらに結果があります</p>}
      </div>
    </div>
  );
};

export default function SearchPage() {
  // 日付変換用の関数を改善
  const convertPostIdToDateString = (postId: string): string => {
    try {
      if (!postId) return '';
      
      // すでにYYYY-MM-DD形式の場合
      if (postId.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return postId;
      }
      
      // YYYYMMDDの形式から変換
      if (postId.match(/^\d{8}/)) {
        const year = postId.substring(0, 4);
        const month = postId.substring(4, 6);
        const day = postId.substring(6, 8);
        
        // 日付として有効かチェック
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        if (isNaN(date.getTime())) return '';
        
        return `${year}-${month}-${day}`;
      }
      
      return '';
    } catch (error) {
      console.error('Date conversion error:', error);
      return '';
    }
  };


  // ログイン状態の管理
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const checkLogin = async () => {
      try {
        const response = await axios.get('/api/user/login_check');
        setIsLoggedIn(response.status === 200);
      } catch (err) {
        setIsLoggedIn(false);
      }
    };

    checkLogin();
  }, []);


  const searchParams = useSearchParams();
  const router = useRouter();
  
  const urlSearchText = searchParams.get('searchText') || '';
  const urlSearchType = searchParams.get('searchType') || 'post_full_text';
  const urlSinceDate = searchParams.get('since') || '';
  const urlUntilDate = searchParams.get('until') || '';

  const [searchText, setSearchText] = useState(urlSearchText);
  const [searchType, setSearchType] = useState(urlSearchType);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [nextSearchAfter, setNextSearchAfter] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  // 初期値にURLパラメータを設定
  const [sinceDate, setSinceDate] = useState<string>(convertPostIdToDateString(urlSinceDate));
  const [untilDate, setUntilDate] = useState<string>(convertPostIdToDateString(urlUntilDate));
  // モーダル状態
  const [isModalOpen, setIsModalOpen] = useState(false);

  const formatDate = (date: Date | string): string => {
    if (typeof date === 'string') {
      date = new Date(date);
    }
    const pad = (n: number): string => String(n).padStart(2, '0');
    return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  };

  // 日時をpost_idに変換する関数
  const convertDateToPostId = (dateStr: string, isStart: boolean): string => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '';
      const formatString = format(date, 'yyyyMMddHHmmss');
      const randomDigits = isStart ? '000000' : '999999';
      return `${formatString}${randomDigits}`;
    } catch (error) {
      console.error('Date conversion error:', error);
      return '';
    }
  };

  // Helper function to check if a search result is a blog
  const isBlog = (item: SearchResultItem): item is Blog => {
    return 'blog_title' in item;
  };

  // 検索履歴を保持（検索後メタデータを使用）
  const [searchHistory, setSearchHistory] = useState<Array<string | null>>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState<number>(-1);

  // メタデータ用の状態変数
  const [totalResults, setTotalResults] = useState<number>(0);

  const performSearch = useCallback(
    async (searchTerm: string, searchMode: string, initial = true, customSearchAfter?: string | null) => {
      // 検索条件の検証
      if (searchTerm.trim() === '' && !sinceDate && !untilDate) {
        alert('検索文字を入力するか、日時を指定してください。');
        return;
      }

      if (loading) return;

      try {
        setLoading(true);
        if (initial) {
          setError(null);
          setResults([]);
          setNextSearchAfter(null);
          setHasMore(false);
          setSearchHistory([]);
          setCurrentSearchIndex(-1);
          setTotalResults(0); // メタデータをリセット
        }

        // APIエンドポイント
        const apiUrl = '/api/search/all_search';
        
        // パラメータの構築
        const params: Record<string, string> = {
          limit: '10'
        };
        
        // 検索条件の追加
        if (searchTerm.trim() !== '') {
          params.q = searchTerm;
          params.type = searchMode;
        }
        
        // search_afterパラメータの追加
        const searchAfterParam = customSearchAfter !== undefined ? customSearchAfter : (initial ? null : nextSearchAfter);
        if (searchAfterParam) {
          params.search_after = searchAfterParam;
        }
        
        // 日付範囲パラメータ
        if (sinceDate) {
          const sinceDateId = convertDateToPostId(sinceDate, true);
          if (sinceDateId) params.since = sinceDateId;
        }
        
        if (untilDate) {
          const untilDateId = convertDateToPostId(untilDate, false);
          if (untilDateId) params.until = untilDateId;
        }

        // API呼び出し
        const response = await axios.get(apiUrl, {
          params,
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });

        // レスポンス処理
        const responseData = response.data as SearchResponse;
        
        if (!responseData.success || !responseData.data) {
          throw new Error(responseData.error || '検索結果の取得に失敗しました');
        }

        // 結果とメタデータを更新
        setResults(responseData.data);
        setNextSearchAfter(responseData.meta.next_search_after);
        setHasMore(Boolean(responseData.meta.next_search_after));
        setTotalResults(responseData.meta.total); // 総件数を保存
        
        // 履歴更新
        if (responseData.meta.next_search_after) {
          if (initial) {
            setSearchHistory([responseData.meta.next_search_after]);
            setCurrentSearchIndex(0);
          } else {
            setSearchHistory(prev => [...prev, responseData.meta.next_search_after as string]);
            setCurrentSearchIndex(prev => prev + 1);
          }
        }
      } catch (err) {
        console.error('Search error:', err);
        setError(err instanceof Error ? err.message : '検索中にエラーが発生しました。');
      } finally {
        setLoading(false);
      }
    },
    [loading, sinceDate, untilDate, nextSearchAfter]
  );

  // 前のページに移動
  const handlePrevPage = useCallback(() => {
    if (currentSearchIndex <= 0) return;
    
    const newIndex = currentSearchIndex - 1;
    const prevSearchAfter = newIndex === 0 ? null : searchHistory[newIndex - 1];
    
    // 前のページを検索
    performSearch(searchText, searchType, true, prevSearchAfter);
    
    // 状態を更新
    setCurrentSearchIndex(newIndex);
  }, [currentSearchIndex, searchHistory, searchText, searchType, performSearch]);

  // 次のページに移動
  const handleNextPage = useCallback(() => {
    if (!hasMore || loading) return;
    
    // 次のページを検索
    performSearch(searchText, searchType, false);
  }, [hasMore, loading, searchText, searchType, performSearch]);

  // 投稿削除処理
  const handleDelete = async (event: React.MouseEvent<Element, MouseEvent>, id: string): Promise<boolean> => {
    event.stopPropagation();
    if (!window.confirm('本当に削除しますか？')) return false;

    try {
      // Determine if we're deleting a post or blog based on the search type
      const isBlogSearch = ['blog_full_text', 'blog_hashtag', 'blog_title'].includes(searchType);
      
      if (isBlogSearch) {
        // Blog deletion
        const response = await axios.post('/api/blog/blog_delete', {
          file_id: id
        }, {
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (response.status === 200) {
          setResults((prevResults) => prevResults.filter(item => 
            isBlog(item) ? item.blog_id !== id : true
          ));
          alert('ブログが削除されました。');
          return true;
        }
      } else {
        // Post deletion (diary)
        const response = await axios.delete('/api/post/post_delete', {
          data: { post_id: id },
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (response.status === 200) {
          setResults((prevResults) => prevResults.filter(item => 
            !isBlog(item) ? item.post_id !== id : true
          ));
          alert('投稿が削除されました。');
          return true;
        }
      }
      
      alert('削除に失敗しました。');
      return false;
    } catch (error) {
      console.error('削除エラー:', error);
      alert('エラーが発生しました。');
      return false;
    }
  };

  // 検索実行
  const handleSearch = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>): void => {
    event.preventDefault();
    
    // 検索条件の検証
    if (searchText.trim() === '' && !sinceDate && !untilDate) {
      alert('検索文字を入力するか、日時を指定してください。');
      return;
    }

    // クエリパラメータの更新
    const queryParams = new URLSearchParams();
    if (searchText.trim() !== '') {
      queryParams.set('searchText', searchText);
      queryParams.set('searchType', searchType);
    }
    
    // 日付パラメータの設定
    if (sinceDate && sinceDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      queryParams.set('since', sinceDate);
    }
    if (untilDate && untilDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      queryParams.set('until', untilDate);
    }

    // URLを更新
    const queryString = queryParams.toString();
    router.push(queryString ? `/search?${queryString}` : '/search');
    
    // 検索を実行
    performSearch(searchText, searchType, true);
    
    // モーダルを閉じる
    setIsModalOpen(false);
  };

  // URLパラメータが変更されたときに検索を実行
  useEffect(() => {
    // コンポーネントがマウントされた時だけ実行する
    const executeInitialSearch = () => {
      // URLパラメーターから値を設定
      setSearchText(urlSearchText);
      setSearchType(urlSearchType);
      
      // 日付パラメータの処理
      if (urlSinceDate) {
        const normalizedSinceDate = convertPostIdToDateString(urlSinceDate);
        if (normalizedSinceDate) {
          setSinceDate(normalizedSinceDate);
        }
      }
      
      if (urlUntilDate) {
        const normalizedUntilDate = convertPostIdToDateString(urlUntilDate);
        if (normalizedUntilDate) {
          setUntilDate(normalizedUntilDate);
        }
      }
      
      // 検索条件があれば検索実行
      if (urlSearchText || urlSinceDate || urlUntilDate) {
        // 少し遅延させて実行（状態が完全に更新された後）
        setTimeout(() => {
          performSearch(urlSearchText, urlSearchType, true);
        }, 0);
      }
    };
    
    executeInitialSearch();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlSearchText, urlSearchType, urlSinceDate, urlUntilDate]);

  // モーダル表示時のスクロール制御
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isModalOpen]);

  // Check if the search type is for blogs
  const isBlogSearch = searchType.startsWith('blog_');

  // Render a search result item based on its type
  const renderSearchResultItem = (item: SearchResultItem, index: number) => {
    // For blog search types, render BlogCard
    if (isBlog(item)) {
      return (
        <BlogCard
          key={item.blog_id}
          blog={item}
          isLoggedIn={isLoggedIn}
          onDelete={isLoggedIn ? handleDelete : undefined}
          formatDate={(date) => formatDate(date)}
        />
      );
    }
    // For post search types, render PostCard
    else {
      return (
        <PostCard
          key={item.post_id}
          post={item as Post}
          isLoggedIn={isLoggedIn}
          onDelete={handleDelete}
          handleDeleteClick={handleDelete}
          formatDate={(date) => formatDate(date)}
        />
      );
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* メインコンテンツ */}
      <main className="flex-1 min-h-screen md:pl-64">
        <div className="h-screen max-w-4xl mx-auto px-4 py-4 md:pr-[320px] overflow-y-auto scrollbar-hide">
          {loading && results.length === 0 && (
            <div className="text-center text-gray-500">検索中...</div>
          )}

          {error && (
            <div className="text-center text-red-500">エラー: {error}</div>
          )}

          {/* 検索結果メタデータの表示 */}
          {!loading && results.length > 0 && (
            <SearchMetadata 
              total={totalResults}
              currentPage={currentSearchIndex + 1}
              hasMore={hasMore}
              searchTerm={searchText}
              searchType={searchType}
              sinceDate={sinceDate}
              untilDate={untilDate}
            />
          )}

          <div className="flex flex-col">
            {results.map((item, index) => renderSearchResultItem(item, index))}
          </div>

          {loading && (
            <div className="text-center text-gray-500 my-4">読み込み中...</div>
          )}

          {(!loading && results.length === 0 && !error) && (
            <div className="text-center text-gray-500 mt-4">結果が見つかりませんでした。</div>
          )}

          {/* ページネーションボタン */}
          {results.length > 0 && (
            <div className="flex justify-center space-x-4 my-4">
              <button
                onClick={handlePrevPage}
                disabled={currentSearchIndex <= 0}
                className={`px-4 py-2 rounded-md ${
                  currentSearchIndex <= 0
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}
              >
                前へ
              </button>
              <button
                onClick={handleNextPage}
                disabled={!hasMore || loading}
                className={`px-4 py-2 rounded-md ${
                  !hasMore || loading
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}
              >
                次へ
              </button>
            </div>
          )}
        </div>
      </main>

      {/* デスクトップ用検索フォーム */}
      <aside className="hidden md:block fixed right-0 top-0 w-[300px] h-full bg-white dark:bg-gray-900 border-l dark:border-gray-800 z-20">
        <div className="p-4 h-full">
          <h2 className="text-xl font-bold mb-4 dark:text-white">検索</h2>
          <div className="flex flex-col space-y-4">
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="検索キーワードを入力"
              className="w-full px-4 py-2 border border-gray-300 dark:bg-gray-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={searchType}
              onChange={(e) => setSearchType(e.target.value)}
              className="w-full border border-gray-300 dark:bg-gray-800 px-4 py-2 rounded-md"
            >
              <option value="post_full_text">Diary-全文検索</option>
              <option value="post_hashtag">Diary-タグ検索</option>
              <option value="blog_full_text">Blog-全文検索</option>
              <option value="blog_hashtag">Blog-タグ検索</option>
              <option value="blog_title">Blog-タイトル検索</option>
            </select>
            <input
              type="date"
              value={sinceDate}
              onChange={(e) => setSinceDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:bg-gray-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="date"
              value={untilDate}
              onChange={(e) => setUntilDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:bg-gray-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSearch}
              className="w-full px-4 py-2 bg-blue-500 text-white font-semibold rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              検索
            </button>
          </div>
        </div>
      </aside>

      {/* モバイル用検索ボタン */}
      <button
        className="md:hidden fixed bottom-4 right-4 bg-blue-500 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg z-50"
        onClick={() => setIsModalOpen(true)}
      >
        <FaSearch />
      </button>

      {/* モーダル内検索フォーム */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[60]">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-11/12 max-w-md">
            <h2 className="text-xl font-bold mb-4 dark:text-white">検索</h2>
            <div className="flex flex-col space-y-4">
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="検索キーワードを入力"
                className="w-full px-4 py-2 border border-gray-300 dark:bg-gray-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={searchType}
                onChange={(e) => setSearchType(e.target.value)}
                className="w-full border border-gray-300 dark:bg-gray-800 px-4 py-2 rounded-md"
              >
                <option value="post_full_text">投稿-全文検索</option>
                <option value="post_hashtag">投稿-タグ検索</option>
                <option value="blog_full_text">ブログ-全文検索</option>
                <option value="blog_hashtag">ブログ-タグ検索</option>
                <option value="blog_title">ブログ-タイトル検索</option>
              </select>
              <input
                type="date"
                value={sinceDate}
                onChange={(e) => setSinceDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:bg-gray-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="date"
                value={untilDate}
                onChange={(e) => setUntilDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:bg-gray-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSearch}
                className="w-full px-4 py-2 bg-blue-500 text-white font-semibold rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                検索
              </button>
            </div>
            <button
              onClick={() => setIsModalOpen(false)}
              className="mt-4 w-full px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
