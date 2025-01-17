'use client';
import { useState, useEffect } from 'react';

interface Log {
  timestamp: string;
  level: string;
  message: string;
}

interface LogResponse {
  logs: Log[];
  total: number;
  offset: number;
  limit: number;
}

export default function LogView() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [limit] = useState(100);
  const [selectedLevel, setSelectedLevel] = useState<string>('');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        offset: offset.toString(),
        limit: limit.toString(),
        ...(selectedLevel && { level: selectedLevel.toUpperCase() })
      });

      const response = await fetch(`/api/logs/logs_read?${queryParams}`, {
        credentials: 'include'
      });

      if (!response.ok) throw new Error('ログの取得に失敗しました');
      
      const data: LogResponse = await response.json();
      setLogs(data.logs);
      setError(null);
    } catch (err) {
      setError('ログの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [offset, selectedLevel]);

  const getLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'error': return 'text-red-600';
      case 'warn': case 'warning': return 'text-yellow-600';  // WARNINGにも対応
      case 'info': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">システムログ</h2>
        <select
          value={selectedLevel}
          onChange={(e) => setSelectedLevel(e.target.value)}
          className="border rounded p-2 dark:bg-gray-800"
        >
          <option value="">全てのレベル</option>
          <option value="error">Error</option>
          <option value="warn">Warning</option>
          <option value="info">Info</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
        </div>
      ) : error ? (
        <div className="text-red-500 p-4 bg-red-50 rounded">{error}</div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-800">
                  <th className="p-2 text-left">タイムスタンプ</th>
                  <th className="p-2 text-left">レベル</th>
                  <th className="p-2 text-left">メッセージ</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, index) => (
                  <tr key={index} className="border-b">
                    <td className="p-2">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className={`p-2 ${getLevelColor(log.level)}`}>{log.level}</td>
                    <td className="p-2">{log.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between mt-4">
            <button
              onClick={() => setOffset(Math.max(0, offset - limit))}
              disabled={offset === 0}
              className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
            >
              前へ
            </button>
            <button
              onClick={() => setOffset(offset + limit)}
              disabled={logs.length < limit}
              className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
            >
              次へ
            </button>
          </div>
        </>
      )}
    </div>
  );
}
