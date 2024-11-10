// src/pages/SearchPage.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Card from '../component/SearchCard';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';

const SearchPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // クエリパラメータを取得
  const queryParams = new URLSearchParams(location.search);
  const urlSearchText = queryParams.get('searchText') || '';
  const urlSearchType = queryParams.get('searchType') || '全文検索';

  const [searchText, setSearchText] = useState(urlSearchText);
  const [searchType, setSearchType] = useState(urlSearchType);
  const [results, setResults] = useState([]);
  const [offset, setOffset] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const observer = useRef();
  const loadMoreRef = useRef();
  const isLoggedIn = true; // ログイン状態を適切に管理してください

  const formatDate = (date) => {
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}000000`;
  };

  // 検索を実行する関数
  const performSearch = useCallback(
    async (searchTerm, searchMode, initial = true) => {
      if (searchTerm.trim() === '') {
        alert('検索文字を入力してください。');
        return;
      }

      if (initial) {
        setLoading(true);
        setError(null);
        setResults([]);
        setOffset(null);
        setHasMore(false);
      }

      const now = new Date();
      const formattedDate = formatDate(now);

      const apiUrl =
        searchMode === '全文検索'
          ? `${process.env.REACT_APP_SITE_DOMAIN}/api/post/search/${encodeURIComponent(searchTerm)}`
          : `${process.env.REACT_APP_SITE_DOMAIN}/api/post/tag_search/${encodeURIComponent(searchTerm)}`;

      const params = new URLSearchParams({
        offset: initial ? formattedDate : offset,
        limit: '10',
      });

      try {
        const response = await axios.get(`${apiUrl}?${params.toString()}`);
        const data = response.data;
        setResults((prevResults) => (initial ? data : [...prevResults, ...data]));
        if (data.length === 10) {
          const lastPost = data[data.length - 1];
          const lastPostDate = new Date(lastPost.post_createat);
          setOffset(formatDate(lastPostDate));
          setHasMore(true);
        } else {
          setHasMore(false);
        }
      } catch (err) {
        setError(err.message || 'エラーが発生しました。');
      } finally {
        setLoading(false);
      }
    },
    [offset]
  );

  // 検索ボタンがクリックされたときの処理
  const handleSearch = () => {
    if (searchText.trim() === '') {
      alert('検索文字を入力してください。');
      return;
    }

    // クエリパラメータに検索条件を追加
    navigate(`/search?searchText=${encodeURIComponent(searchText)}&searchType=${encodeURIComponent(searchType)}`);
  };

  // クエリパラメータが変更されたときに検索を実行
  useEffect(() => {
    if (urlSearchText) {
      performSearch(urlSearchText, urlSearchType, true);
    }
  }, [urlSearchText, urlSearchType, performSearch]);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    setError(null);

    const apiUrl =
      searchType === '全文検索'
        ? `${process.env.REACT_APP_SITE_DOMAIN}/api/post/search/${encodeURIComponent(searchText)}`
        : `${process.env.REACT_APP_SITE_DOMAIN}/api/post/tag_search/${encodeURIComponent(searchText)}`;

    const params = new URLSearchParams({
      offset: offset,
      limit: '10',
    });

    try {
      const response = await axios.get(`${apiUrl}?${params.toString()}`);
      const data = response.data;
      setResults((prevResults) => [...prevResults, ...data]);

      if (data.length === 10) {
        const lastPost = data[data.length - 1];
        const lastPostDate = new Date(lastPost.post_createat);
        setOffset(formatDate(lastPostDate));
        setHasMore(true);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      setError(err.message || 'エラーが発生しました。');
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, offset, searchText, searchType]);

  // 無限スクロールの設定
  useEffect(() => {
    if (loading) return;
    if (!hasMore) return;

    const options = {
      root: null,
      rootMargin: '0px',
      threshold: 1.0,
    };

    const callback = (entries) => {
      if (entries[0].isIntersecting) {
        loadMore();
      }
    };

    const currentObserver = observer.current;
    if (currentObserver) currentObserver.disconnect();

    observer.current = new IntersectionObserver(callback, options);
    if (loadMoreRef.current) {
      observer.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observer.current) observer.current.disconnect();
    };
  }, [loading, hasMore, loadMore]);

  // 投稿を削除する関数
  const handleDelete = async (post_id) => {
    if (!window.confirm('本当に削除しますか？')) return;

    try {
      const response = await axios.delete(`${process.env.REACT_APP_SITE_DOMAIN}/api/post/post_delete`, {
        data: { post_id },
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 200) {
        setResults((prevResults) => prevResults.filter(post => post.post_id !== post_id));
        alert('投稿が削除されました。');
      } else {
        alert('削除に失敗しました。');
      }
    } catch (error) {
      console.error('削除エラー:', error);
      alert('エラーが発生しました。');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4 flex flex-col">
      <div className="max-w-4xl mx-auto mb-6">
        <div className="flex items-center">
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="検索キーワードを入力"
            className="flex-1 px-4 py-2 border border-gray-300 dark:bg-gray-800 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={searchType}
            onChange={(e) => setSearchType(e.target.value)}
            className="border border-gray-300 dark:bg-gray-800 px-2 py-1 mx-2 rounded-md"
          >
            <option value="全文検索">全文検索</option>
            <option value="タグ検索">タグ検索</option>
          </select>
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-blue-500 text-white font-semibold rounded-r-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            検索
          </button>
        </div>
      </div>

      {loading && results.length === 0 && (
        <div className="text-center text-gray-500">検索中...</div>
      )}

      {error && (
        <div className="text-center text-red-500">エラー: {error}</div>
      )}

      {/* スクロール可能なカードコンテナ */}
      <div className="flex-1 overflow-y-auto max-h-[750px] mx-auto w-full max-w-4xl">
        <div className="flex flex-col space-y-4">
          {results.map((post) => (
            <Card
              key={post.post_id}
              post={post}
              isLoggedIn={isLoggedIn}
              onDelete={handleDelete}
            />
          ))}
        </div>
        {/* ロード中のインディケーター */}
        {loading && results.length > 0 && (
          <div className="text-center text-gray-500 my-4">読み込み中...</div>
        )}
        {/* 追加のロードトリガー */}
        <div ref={loadMoreRef} className="h-1"></div>
      </div>

      {(!loading && results.length === 0 && !error) && (
        <div className="text-center text-gray-500 mt-4">結果が見つかりませんでした。</div>
      )}
    </div>
  );
};

export default SearchPage;
