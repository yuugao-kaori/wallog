'use client'
import { useState, useEffect } from 'react'
import axios from 'axios'
import { useTheme } from '../ThemeProvider'

interface Todo {
  todo_id: string
  todo_text: string
  todo_priority: number
  todo_limitat: string
  todo_category: string
  todo_attitude: string
  todo_createat: string
  todo_updateat: string
}

// 日付フォーマット用のヘルパー関数を追加
const formatDateTime = (dateTimeString: string) => {
  if (!dateTimeString) return '';
  // UTCの日時文字列をDateオブジェクトに変換
  const date = new Date(dateTimeString);
  
  // タイムゾーンを考慮せずに、そのままの値を使用
  return date.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC'  // UTCとして解釈
  });
};

export default function TodoPage() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [newTodo, setNewTodo] = useState({
    todo_text: '',
    todo_priority: 3,
    todo_limitat: '',
    todo_category: '',
    todo_attitude: 'normal'
  })
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null)
  const [error, setError] = useState('')
  const { theme } = useTheme()
  const [filter, setFilter] = useState({
    category: '',
    priority: ''
  })

  const api = axios.create({
    baseURL: 'https://wallog.seitendan.com',
    headers: {
      'Content-Type': 'application/json;charset=utf-8',
      'Access-Control-Allow-Credentials': 'true'
    },
    withCredentials: true
  })

  // ログイン状態の確認
  useEffect(() => {
    const checkLogin = async () => {
      try {
        await api.get('/api/user/login_check')
        setIsLoggedIn(true)
      } catch (err) {
        setIsLoggedIn(false)
      }
    }
    checkLogin()
  }, [])

  // TODOリストの取得
  const fetchTodos = async () => {
    try {
      const params = new URLSearchParams()
      if (filter.category) params.append('category', filter.category)
      if (filter.priority) params.append('priority', filter.priority)
      
      const response = await api.get(`/api/todo/todo_list?${params.toString()}`)
      setTodos(response.data.todos)
    } catch (err) {
      setError('TODOの取得に失敗しました')
    }
  }

  useEffect(() => {
    fetchTodos()
  }, [filter])

  // TODOの作成
  const createTodo = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/api/todo/todo_create', newTodo)
      setNewTodo({
        todo_text: '',
        todo_priority: 3,
        todo_limitat: '',
        todo_category: '',
        todo_attitude: 'normal'
      })
      fetchTodos()
    } catch (err) {
      setError('TODOの作成に失敗しました')
    }
  }

  // TODOの更新
  const updateTodo = async (todo: Todo) => {
    try {
      await api.put('/api/todo/todo_update', todo)
      setEditingTodo(null)
      fetchTodos()
    } catch (err) {
      setError('TODOの更新に失敗しました')
    }
  }

  return (
    <div className="p-4 ml-48">
      <h1 className="text-2xl font-bold mb-4">TODOリスト</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* フィルター */}
      <div className="mb-4 flex gap-4">
        <input
          type="text"
          placeholder="カテゴリで絞り込み"
          value={filter.category}
          onChange={(e) => setFilter({...filter, category: e.target.value})}
          className="border p-2 rounded dark:bg-gray-700"
        />
        <select
          value={filter.priority}
          onChange={(e) => setFilter({...filter, priority: e.target.value})}
          className="border p-2 rounded dark:bg-gray-700"
        >
          <option value="">優先度: すべて</option>
          <option value="1">高</option>
          <option value="2">中</option>
          <option value="3">低</option>
        </select>
      </div>

      {/* TODO作成フォーム (ログイン時のみ表示) */}
      {isLoggedIn && (
        <form onSubmit={createTodo} className="mb-8 p-4 bg-gray-100 dark:bg-gray-800 rounded">
          <div className="mb-4">
            <input
              type="text"
              placeholder="TODO内容"
              value={newTodo.todo_text}
              onChange={(e) => setNewTodo({...newTodo, todo_text: e.target.value})}
              required
              className="w-full p-2 border rounded dark:bg-gray-700"
            />
          </div>
          <div className="flex gap-4 mb-4">
            <select
              value={newTodo.todo_priority}
              onChange={(e) => setNewTodo({...newTodo, todo_priority: Number(e.target.value)})}
              className="p-2 border rounded dark:bg-gray-700"
            >
              <option value={1}>優先度: 高</option>
              <option value={2}>優先度: 中</option>
              <option value={3}>優先度: 低</option>
            </select>
            <input
              type="datetime-local"
              value={newTodo.todo_limitat}
              onChange={(e) => setNewTodo({...newTodo, todo_limitat: e.target.value})}
              className="p-2 border rounded dark:bg-gray-700"
            />
            <input
              type="text"
              placeholder="カテゴリ"
              value={newTodo.todo_category}
              onChange={(e) => setNewTodo({...newTodo, todo_category: e.target.value})}
              className="p-2 border rounded dark:bg-gray-700"
            />
          </div>
          <button
            type="submit"
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            作成
          </button>
        </form>
      )}

      {/* TODOリスト */}
      <div className="grid gap-4">
        {todos.map(todo => (
          <div
            key={todo.todo_id}
            className="p-4 bg-white dark:bg-gray-800 rounded shadow"
          >
            {editingTodo?.todo_id === todo.todo_id ? (
              <div className="space-y-4">
                <input
                  type="text"
                  value={editingTodo.todo_text}
                  onChange={(e) => setEditingTodo({...editingTodo, todo_text: e.target.value})}
                  className="w-full p-2 border rounded dark:bg-gray-700"
                />
                <div className="flex gap-4">
                  <select
                    value={editingTodo.todo_priority}
                    onChange={(e) => setEditingTodo({...editingTodo, todo_priority: Number(e.target.value)})}
                    className="p-2 border rounded dark:bg-gray-700"
                  >
                    <option value={1}>優先度: 高</option>
                    <option value={2}>優先度: 中</option>
                    <option value={3}>優先度: 低</option>
                  </select>
                  <input
                    type="datetime-local"
                    value={editingTodo.todo_limitat.slice(0, 16)}
                    onChange={(e) => setEditingTodo({...editingTodo, todo_limitat: e.target.value})}
                    className="p-2 border rounded dark:bg-gray-700"
                  />
                  <input
                    type="text"
                    value={editingTodo.todo_category}
                    onChange={(e) => setEditingTodo({...editingTodo, todo_category: e.target.value})}
                    className="p-2 border rounded dark:bg-gray-700"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => updateTodo(editingTodo)}
                    className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                  >
                    更新
                  </button>
                  <button
                    onClick={() => setEditingTodo(null)}
                    className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold">{todo.todo_text}</h3>
                  {isLoggedIn && (
                    <button
                      onClick={() => setEditingTodo(todo)}
                      className="text-blue-500 hover:text-blue-600"
                    >
                      編集
                    </button>
                  )}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <p>優先度: {todo.todo_priority}</p>
                  <p>期限: {formatDateTime(todo.todo_limitat)}</p>
                  <p>カテゴリ: {todo.todo_category}</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
