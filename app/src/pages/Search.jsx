// src/pages/SearchPage.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Card from './Card';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';

const SearchPage = () => {
  const { searchText: urlSearchText } = useParams(); // URLから検索テキストを取得
  const [searchText, setSearchText] = useState(urlSearchText || '');
  const [results, setResults] = useState([]);
  const [offset, setOffset] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const navigate = useNavigate();
  const isLoggedIn = true; // ログイン状態を適切に管理してください

  const observer = useRef();
  const loadMoreRef = useRef();

  // 日付をyyyymmddhhMMss000000形式にフォーマットするヘルパー関数
  const formatDate = (date) => {
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}000000`;
  };

  // 検索を実行する関数
  const performSearch = useCallback(async (searchTerm, initial = true) => {
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

    // 現在の日時をyyyymmddhhMMss000000形式で取得
    const now = new Date();
    const formattedDate = formatDate(now);

    const apiUrl = `http://192.168.1.148:25000/api/post/search/${encodeURIComponent(searchTerm)}`;

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
  }, [offset]);

  // 検索ボタンがクリックされたときの処理
  const handleSearch = () => {
    if (searchText.trim() === '') {
      alert('検索文字を入力してください。');
      return;
    }
    navigate(`/search/${encodeURIComponent(searchText)}`); // URLを更新
  };

  // 追加データをロードする関数
  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    setError(null);

    const apiUrl = `http://192.168.1.148:25000/api/post/search/${encodeURIComponent(searchText)}`;

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
  }, [loading, hasMore, offset, searchText]);

  // URLパラメータが変更されたときに検索を実行
  useEffect(() => {
    if (urlSearchText) {
      performSearch(urlSearchText, true);
    }
  }, [urlSearchText, performSearch]);

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
      const response = await axios.delete('http://192.168.1.148:25000/api/post/post_delete', {
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
        <div className="flex">
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="検索キーワードを入力"
            className="flex-1 px-4 py-2 border border-gray-300 dark:bg-gray-800 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
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
