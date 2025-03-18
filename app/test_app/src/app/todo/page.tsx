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
  todo_public: boolean
  todo_complete: boolean
}

// デフォルトの日時を取得する関数（24時間後の日時を返す）
const getDefaultDateTime = () => {
  const date = new Date();
  date.setHours(date.getHours() + 24); // 24時間後
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

// 日付フォーマット用のヘルパー関数を修正（UTC→日本時間への変換対応）
const formatDateTime = (dateTimeString: string) => {
  if (!dateTimeString) return '';
  
  try {
    // UTCの日時文字列をDateオブジェクトに変換
    const date = new Date(dateTimeString);
    
    // タイムゾーンを指定して日本時間で表示
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Tokyo'
    }).format(date);
  } catch (error) {
    console.error('Date formatting error:', error, dateTimeString);
    return 'Invalid date';
  }
};

// フォームの日時入力用のフォーマット関数を修正
const formatDateTimeForInput = (dateTimeString: string) => {
  if (!dateTimeString) return getDefaultDateTime();
  
  try {
    // 入力がUTCで保存されている場合、Dateオブジェクトに変換
    const date = new Date(dateTimeString);
    
    // JSTに変換せず、ブラウザのローカルタイムで表示（HTMLのdatetime-localはローカルタイムを想定）
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch (error) {
    console.error('Input date formatting error:', error);
    return getDefaultDateTime();
  }
};

// 優先度を文字列に変換するヘルパー関数を追加
const getPriorityText = (priority: number) => {
  switch (priority) {
    case 1:
      return '高';
    case 2:
      return '中';
    case 3:
      return '低';
    default:
      return '不明';
  }
};

// 期限切れかどうかを判定する関数（日本時間で適切に扱う）
const isOverdue = (limitDateString: string): boolean => {
  if (!limitDateString) return false;
  
  // 現在時刻
  const now = new Date();
  
  // 期限日時
  const limitDate = new Date(limitDateString);
  
  // シンプルに比較
  return now > limitDate;
};

export default function TodoPage() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [newTodo, setNewTodo] = useState({
      todo_text: '',
      todo_priority: 3,
      todo_limitat: getDefaultDateTime(), // デフォルト値を設定
      todo_category: '',
      todo_attitude: 'normal',
      todo_public: true,
      todo_complete: false
  })
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null)
  const [error, setError] = useState('')
  const { theme } = useTheme()
  const [filter, setFilter] = useState({
    category: '',
    priority: ''
  })
  // タブ状態を管理する状態変数を追加
  const [activeTab, setActiveTab] = useState<'todo' | 'done'>('todo')
  // カテゴリのプリセット選択肢を追加
  const categoryPresets = ['default', '買い物', '手続き', 'Wallog開発', '趣味（アニメ）', '趣味（ゲーム）']
  // カテゴリ入力時の表示状態を管理
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)

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

  // タブ切替時にもフェッチを行うように依存配列を修正
  useEffect(() => {
    fetchTodos()
  }, [filter, activeTab])

  // TODOの作成
  const createTodo = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const todoToCreate = {...newTodo};
      // ISO形式で送信して、タイムゾーン情報をバックエンドに伝える
      if (todoToCreate.todo_limitat) {
        const localDate = new Date(todoToCreate.todo_limitat);
        todoToCreate.todo_limitat = localDate.toISOString();
      }
      console.log('送信データ:', todoToCreate); // デバッグ用
      await api.post('/api/todo/todo_create', todoToCreate)
      // 成功後に状態をリセット

      setNewTodo({
        todo_text: '',
        todo_priority: 3,
        todo_limitat: getDefaultDateTime(), // リセット時にも24時間後をデフォルト値として設定
        todo_category: '',
        todo_attitude: 'normal',
        todo_public: true,
        todo_complete: false
      })
      fetchTodos()
    } catch (err) {
      console.error('エラー詳細:', err); // エラー詳細を確認
      setError('TODOの作成に失敗しました')
    }
  }

  // TODOの更新
  const updateTodo = async (todo: Todo) => {
    try {
      const todoToUpdate = {...todo};
      // ISO形式で送信して、タイムゾーン情報をバックエンドに伝える
      if (todoToUpdate.todo_limitat) {
        const localDate = new Date(todoToUpdate.todo_limitat);
        todoToUpdate.todo_limitat = localDate.toISOString();
      }
      await api.put('/api/todo/todo_update', todoToUpdate)
      setEditingTodo(null)
      fetchTodos()
    } catch (err) {
      setError('TODOの更新に失敗しました')
    }
  }

  // TODOを時間によってグループ化する関数
  const groupTodosByTimeframe = (todos: Todo[]) => {
    const now = new Date();
    const hour24 = 24 * 60 * 60 * 1000;
    const hour72 = 72 * 60 * 60 * 1000;
    const week = 7 * 24 * 60 * 60 * 1000;

    return {
      past: {
        overWeek: todos.filter(todo => {
          const limitDate = new Date(todo.todo_limitat);
          return now.getTime() - limitDate.getTime() > week;
        }),
        within72Hours: todos.filter(todo => {
          const limitDate = new Date(todo.todo_limitat);
          const diff = now.getTime() - limitDate.getTime();
          return diff <= week && diff > hour72;
        }),
        within24Hours: todos.filter(todo => {
          const limitDate = new Date(todo.todo_limitat);
          const diff = now.getTime() - limitDate.getTime();
          return diff <= hour72 && diff > hour24;
        }),
        lessThan24Hours: todos.filter(todo => {
          const limitDate = new Date(todo.todo_limitat);
          const diff = now.getTime() - limitDate.getTime();
          return diff <= hour24 && diff > 0;
        }),
      },
      future: {
        lessThan24Hours: todos.filter(todo => {
          const limitDate = new Date(todo.todo_limitat);
          const diff = limitDate.getTime() - now.getTime();
          return diff > 0 && diff <= hour24;
        }),
        within24Hours: todos.filter(todo => {
          const limitDate = new Date(todo.todo_limitat);
          const diff = limitDate.getTime() - now.getTime();
          return diff > hour24 && diff <= hour72;
        }),
        within72Hours: todos.filter(todo => {
          const limitDate = new Date(todo.todo_limitat);
          const diff = limitDate.getTime() - now.getTime();
          return diff > hour72 && diff <= week;
        }),
        overWeek: todos.filter(todo => {
          const limitDate = new Date(todo.todo_limitat);
          return limitDate.getTime() - now.getTime() > week;
        }),
      }
    };
  };

  // タブに応じたToDo表示用の関数
  const filteredTodos = todos.filter(todo => 
    activeTab === 'todo' ? !todo.todo_complete : todo.todo_complete
  );

  // グループ化されたTODOを取得
  const groupedTodos = groupTodosByTimeframe(filteredTodos);

  return (
    <div className="p-4 md:ml-48">
      <h1 className="text-2xl font-bold mb-4">ToDo & Doneリスト</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* フィルター - モバイル用に横スクロールを防止するためにflex-wrapを追加 */}
      <div className="mb-4 flex flex-wrap gap-2 md:gap-4">
        <input
          type="text"
          placeholder="カテゴリで絞り込み"
          value={filter.category}
          onChange={(e) => setFilter({...filter, category: e.target.value})}
          className="border p-2 rounded dark:bg-gray-700 w-full sm:w-auto"
        />
        <select
          value={filter.priority}
          onChange={(e) => setFilter({...filter, priority: e.target.value})}
          className="border p-2 rounded dark:bg-gray-700 w-full sm:w-auto"
        >
          <option value="">優先度: すべて</option>
          <option value="1">高</option>
          <option value="2">中</option>
          <option value="3">低</option>
        </select>
      </div>

      {/* TODO作成フォーム */}
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
          <div className="flex flex-wrap gap-2 mb-4">
            <select
              value={newTodo.todo_priority}
              onChange={(e) => setNewTodo({...newTodo, todo_priority: Number(e.target.value)})}
              className="p-2 border rounded dark:bg-gray-700 w-full sm:w-auto"
            >
              <option value={1}>優先度: 高</option>
              <option value={2}>優先度: 中</option>
              <option value={3}>優先度: 低</option>
            </select>
            <input
              type="datetime-local"
              value={newTodo.todo_limitat}
              onChange={(e) => setNewTodo({...newTodo, todo_limitat: e.target.value})}
              className="p-2 border rounded dark:bg-gray-700 w-full sm:w-auto"
            />
            <div className="relative w-full sm:w-auto">
              <input
                type="text"
                placeholder="カテゴリ"
                value={newTodo.todo_category}
                onChange={(e) => setNewTodo({...newTodo, todo_category: e.target.value})}
                onFocus={() => setShowCategoryDropdown(true)}
                className="p-2 border rounded dark:bg-gray-700 w-full"
              />
              {showCategoryDropdown && (
                <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-700 border rounded shadow-lg">
                  {categoryPresets.map((category) => (
                    <div 
                      key={category}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer"
                      onClick={() => {
                        setNewTodo({...newTodo, todo_category: category});
                        setShowCategoryDropdown(false);
                      }}
                    >
                      {category}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mb-4 space-x-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={newTodo.todo_public}
                onChange={(e) => setNewTodo({...newTodo, todo_public: e.target.checked})}
                className="mr-2"
              />
              公開
            </label>
          </div>
          <button
            type="submit"
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            作成
          </button>
        </form>
      )}

      {/* タブナビゲーション - タスク作成UIの下に移動 */}
      <div className="flex mb-4 border-b">
        <button
          className={`py-2 px-4 ${
            activeTab === 'todo'
              ? 'border-b-2 border-blue-500 text-blue-500 font-medium'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('todo')}
        >
          TODO
        </button>
        <button
          className={`py-2 px-4 ${
            activeTab === 'done'
              ? 'border-b-2 border-blue-500 text-blue-500 font-medium'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('done')}
        >
          DONE
        </button>
      </div>

      {/* 時間区切りがあるTODOリスト - 区分ごとに表示 */}
      <div className="grid gap-4">
        {filteredTodos.length > 0 ? (
          <>
            {/* 過去の期限切れTODO */}
            {groupedTodos.past.overWeek.length > 0 && (
              <>
                <div className="border-t border-gray-300 dark:border-gray-600 my-4 flex justify-center">
                  <p className="text-center bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 px-4 py-1 rounded-full inline-block -mt-3">
                    1週間以上期限切れ
                  </p>
                </div>
                {groupedTodos.past.overWeek.map(todo => renderTodoItem(todo))}
              </>
            )}

            {groupedTodos.past.within72Hours.length > 0 && (
              <>
                <div className="border-t border-gray-300 dark:border-gray-600 my-4 flex justify-center">
                  <p className="text-center bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 px-4 py-1 rounded-full inline-block -mt-3">
                    3日〜1週間前に期限切れ
                  </p>
                </div>
                {groupedTodos.past.within72Hours.map(todo => renderTodoItem(todo))}
              </>
            )}

            {groupedTodos.past.within24Hours.length > 0 && (
              <>
                <div className="border-t border-gray-300 dark:border-gray-600 my-4 flex justify-center">
                  <p className="text-center bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 px-4 py-1 rounded-full inline-block -mt-3">
                    1日〜3日前に期限切れ
                  </p>
                </div>
                {groupedTodos.past.within24Hours.map(todo => renderTodoItem(todo))}
              </>
            )}

            {groupedTodos.past.lessThan24Hours.length > 0 && (
              <>
                <div className="border-t border-gray-300 dark:border-gray-600 my-4 flex justify-center">
                  <p className="text-center bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 px-4 py-1 rounded-full inline-block -mt-3">
                    24時間以内に期限切れ
                  </p>
                </div>
                {groupedTodos.past.lessThan24Hours.map(todo => renderTodoItem(todo))}
              </>
            )}

            {/* 未来のTODO */}
            {groupedTodos.future.lessThan24Hours.length > 0 && (
              <>
                <div className="border-t border-gray-300 dark:border-gray-600 my-4 flex justify-center">
                  <p className="text-center bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-4 py-1 rounded-full inline-block -mt-3">
                    24時間以内に期限到来
                  </p>
                </div>
                {groupedTodos.future.lessThan24Hours.map(todo => renderTodoItem(todo))}
              </>
            )}

            {groupedTodos.future.within24Hours.length > 0 && (
              <>
                <div className="border-t border-gray-300 dark:border-gray-600 my-4 flex justify-center">
                  <p className="text-center bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-4 py-1 rounded-full inline-block -mt-3">
                    1日〜3日以内に期限到来
                  </p>
                </div>
                {groupedTodos.future.within24Hours.map(todo => renderTodoItem(todo))}
              </>
            )}

            {groupedTodos.future.within72Hours.length > 0 && (
              <>
                <div className="border-t border-gray-300 dark:border-gray-600 my-4 flex justify-center">
                  <p className="text-center bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 px-4 py-1 rounded-full inline-block -mt-3">
                    3日〜1週間以内に期限到来
                  </p>
                </div>
                {groupedTodos.future.within72Hours.map(todo => renderTodoItem(todo))}
              </>
            )}

            {groupedTodos.future.overWeek.length > 0 && (
              <>
                <div className="border-t border-gray-300 dark:border-gray-600 my-4 flex justify-center">
                  <p className="text-center bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-4 py-1 rounded-full inline-block -mt-3">
                    1週間以上先に期限到来
                  </p>
                </div>
                {groupedTodos.future.overWeek.map(todo => renderTodoItem(todo))}
              </>
            )}
          </>
        ) : (
          <p className="text-center text-gray-500 py-4">
            {activeTab === 'todo' ? '未完了のタスクはありません' : '完了済みのタスクはありません'}
          </p>
        )}
      </div>
    </div>
  );

  // TODOアイテムのレンダリング用ヘルパー関数
  function renderTodoItem(todo: Todo) {
    return (
      <div
        key={todo.todo_id}
        className={`p-4 bg-white dark:bg-gray-800 rounded shadow ${
          activeTab === 'todo' && isOverdue(todo.todo_limitat) 
            ? 'border-2 border-red-500' 
            : ''
        }`}
      >
        {editingTodo?.todo_id === todo.todo_id ? (
          <div className="space-y-4">
            <input
              type="text"
              value={editingTodo.todo_text}
              onChange={(e) => setEditingTodo({...editingTodo, todo_text: e.target.value})}
              className="w-full p-2 border rounded dark:bg-gray-700"
            />
            <div className="flex flex-wrap gap-4">
              <select
                value={editingTodo.todo_priority}
                onChange={(e) => setEditingTodo({...editingTodo, todo_priority: Number(e.target.value)})}
                className="p-2 border rounded dark:bg-gray-700 w-full sm:w-auto"
              >
                <option value={1}>優先度: 高</option>
                <option value={2}>優先度: 中</option>
                <option value={3}>優先度: 低</option>
              </select>
              <input
                type="datetime-local"
                value={formatDateTimeForInput(editingTodo.todo_limitat)}
                onChange={(e) => setEditingTodo({...editingTodo, todo_limitat: e.target.value})}
                className="p-2 border rounded dark:bg-gray-700 w-full sm:w-auto"
              />
              <div className="relative w-full sm:w-auto">
                <input
                  type="text"
                  value={editingTodo.todo_category}
                  onChange={(e) => setEditingTodo({...editingTodo, todo_category: e.target.value})}
                  onFocus={() => setShowCategoryDropdown(true)}
                  className="p-2 border rounded dark:bg-gray-700 w-full"
                />
                {showCategoryDropdown && (
                  <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-700 border rounded shadow-lg">
                    {categoryPresets.map((category) => (
                      <div 
                        key={category}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer"
                        onClick={() => {
                          setEditingTodo({...editingTodo, todo_category: category});
                          setShowCategoryDropdown(false);
                        }}
                      >
                        {category}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={editingTodo.todo_public}
                  onChange={(e) => setEditingTodo({...editingTodo, todo_public: e.target.checked})}
                  className="mr-2"
                />
                公開
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={editingTodo.todo_complete}
                  onChange={(e) => setEditingTodo({...editingTodo, todo_complete: e.target.checked})}
                  className="mr-2"
                />
                完了
              </label>
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
              <h3 className="text-lg font-semibold break-words">{todo.todo_text}</h3>
              {isLoggedIn && (
                <button
                  onClick={() => setEditingTodo(todo)}
                  className="text-blue-500 hover:text-blue-600 ml-2 shrink-0"
                >
                  編集
                </button>
              )}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <p>優先度: {getPriorityText(todo.todo_priority)}</p>
              <p>期限: {formatDateTime(todo.todo_limitat)}</p>
              <p>カテゴリ: {todo.todo_category}</p>
              <p>公開設定: {todo.todo_public ? '公開' : '非公開'}</p>
            </div>
          </div>
        )}
      </div>
    );
  }
}

