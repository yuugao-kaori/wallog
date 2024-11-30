import React, { useEffect, useState } from 'react';
import Notification from './Notification';

interface Note {
  'sticky-note_id': string;
  'sticky-note_title': string;
  'sticky-note_text': string;
  'sticky-note_hashtag': string;
  'sticky-note_createat': string;  // created_at から sticky-note_createat に変更
  'sticky-note_updateat': string;  // Add sticky-note_updateat property
}

interface FormData {
  title: string;
  text: string;
  hashtags: string;
}

export default function StickyNote() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [formData, setFormData] = useState<FormData>({
    title: '',
    text: '',
    hashtags: ''
  });
  const [isDeleteConfirmationOpen, setIsDeleteConfirmationOpen] = useState(false);
  const [emptyLineCount, setEmptyLineCount] = useState(0);
  const [notifications, setNotifications] = useState<{ id: string; message: string; }[]>([]);

  const addNotification = (message: string) => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { id, message }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(notification => notification.id !== id));
    }, 5000);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const response = await fetch('/api/sticky_note/sticky_note_read');
        const data = await response.json();
        setNotes(data.sticky_notes);
      } catch (error) {
        console.error('Error fetching notes:', error);
      }
    };
    fetchNotes();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/sticky_note/sticky_note_create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title,
          text: formData.text,
          hashtags: formData.hashtags.split(' ').filter(tag => tag),
        }),
      });

      if (response.ok) {
        setIsModalOpen(false);
        setFormData({ title: '', text: '', hashtags: '' });
        // 新しいノートを取得して表示を更新
        const response = await fetch('/api/sticky_note/sticky_note_read');
        const data = await response.json();
        setNotes(data.sticky_notes);
        addNotification('メモを作成しました');
      }
    } catch (error) {
      console.error('Error creating note:', error);
      addNotification('メモの作成に失敗しました');
    }
  };

  // フォームデータを初期化する関数を追加
  const resetFormData = () => {
    setFormData({
      title: '',
      text: '',
      hashtags: ''
    });
  };

  // isModalOpenの監視を追加
  useEffect(() => {
    if (!isModalOpen) {
      resetFormData();
    }
  }, [isModalOpen]);

  // isViewModalOpenの監視を追加
  useEffect(() => {
    if (!isViewModalOpen) {
      resetFormData();
    }
  }, [isViewModalOpen]);

  const handleNoteClick = (note: Note) => {
    setSelectedNote(note);
    setIsViewModalOpen(true);
    setFormData({
      title: note['sticky-note_title'],
      text: note['sticky-note_text'],
      hashtags: String(note['sticky-note_hashtag'] || '').replace(/,/g, ' ').trim()
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNote) return;

    try {
      const processedHashtags = formData.hashtags
        .split(' ')
        .filter(tag => tag)  // 空の要素を除去
        .join(' ');

      const response = await fetch(`/api/sticky_note/sticky_note_update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sticky_note_id: selectedNote['sticky-note_id'],
          sticky_note_title: formData.title,
          sticky_note_text: formData.text,
          sticky_note_hashtag: processedHashtags
        }),
      });

      if (response.ok) {
        setIsViewModalOpen(false);
        setSelectedNote(null);
        const response = await fetch('/api/sticky_note/sticky_note_read');
        const data = await response.json();
        setNotes(data.sticky_notes);
        addNotification('メモを更新しました');
      }
    } catch (error) {
      console.error('Error updating note:', error);
      addNotification('メモの更新に失敗しました');
    }
  };

  const handleDelete = async () => {
    setIsDeleteConfirmationOpen(true);
  };

  // confirmDeleteを修正
  const confirmDelete = async () => {
    if (!selectedNote) return;

    try {
      const response = await fetch(`/api/sticky_note/sticky_note_delete`, {
        method: 'put',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sticky_note_id: selectedNote['sticky-note_id']
        }),
      });

      if (response.ok) {
        setIsViewModalOpen(false);
        setSelectedNote(null);
        setIsDeleteConfirmationOpen(false);
        resetFormData();
        const response = await fetch('/api/sticky_note/sticky_note_read');
        const data = await response.json();
        setNotes(data.sticky_notes);
        addNotification('メモを削除しました');
      }
    } catch (error) {
      console.error('Error deleting note:', error);
      addNotification('メモの削除に失敗しました');
    }
  };

  const handleTextAreaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      const textarea = e.currentTarget;
      const { value, selectionStart } = textarea;
      
      const lastNewLine = value.lastIndexOf('\n', selectionStart - 1);
      const currentLineStart = lastNewLine + 1;
      const currentLine = value.slice(currentLineStart, selectionStart);
      
      // 現在の行が "- " で始まっているか、かつ内容が空かチェック
      if (currentLine.trimStart().startsWith('- ')) {
        const lineContent = currentLine.trim().slice(2); // "- " の後の内容

        if (lineContent === '') {
          // 空の行の場合、カウントを増やす
          const newCount = emptyLineCount + 1;
          setEmptyLineCount(newCount);

          // 1回空行の場合、オートコレクトを中止
          if (newCount >= 1) {
            setEmptyLineCount(0);
            return; // 通常の改行を許可
          }
        } else {
          // 内容がある行の場合、カウントをリセット
          setEmptyLineCount(0);
        }

        e.preventDefault();
        const newText = value.slice(0, selectionStart) + '\n- ' + value.slice(selectionStart);
        setFormData({...formData, text: newText});
        
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = selectionStart + 3;
        }, 0);
      } else {
        // "- "で始まっていない行の場合もカウントをリセット
        setEmptyLineCount(0);
      }
    }
  };

  const handleModalClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // モーダルの背景がクリックされた場合のみ処理を実行
    if (e.target === e.currentTarget) {
      handleEditSubmit(e as any);
    }
  };

  // handleCancelを修正
  const handleCancel = () => {
    setIsViewModalOpen(false);
    setSelectedNote(null);
    resetFormData();
  };

  return (
    <div className="p-4">
      <Notification 
        notifications={notifications}
        onClose={removeNotification}
      />
      <div className="mb-4">
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          新規作成
        </button>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 md:ml-48 bg-black bg-opacity-50 flex items-center justify-center">
          <div className=" bg-gray-100 dark:bg-gray-800 p-3 rounded-lg w-[576px]">
            <h2 className="text-xl font-bold mb-4 dark:text-white">新規メモ作成</h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="タイトル"
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  className="w-full bg-gray-100 dark:bg-gray-800  p-2 rounded dark:text-white focus:outline-none"
                  required
                />
              </div>
              <div className="mb-4">
                <textarea
                  placeholder="本文"
                  value={formData.text}
                  onChange={e => setFormData({...formData, text: e.target.value})}
                  onKeyDown={handleTextAreaKeyDown}
                  className="w-full bg-gray-100 dark:bg-gray-800 p-2 rounded h-64 dark:text-white focus:outline-none"
                />
              </div>
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="タグ（スペース区切り）"
                  value={formData.hashtags}
                  onChange={e => setFormData({...formData, hashtags: e.target.value})}
                  className="w-full bg-gray-100 dark:bg-gray-800 p-2 rounded dark:text-white focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-black dark:text-white font-bold py-2 px-4 rounded"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                >
                  作成
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isViewModalOpen && selectedNote && (
        <div className="fixed inset-0 md:ml-48 bg-black bg-opacity-40 flex items-center justify-center"
             onClick={handleModalClick}>
          <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-lg w-[90%] max-w-[600px] max-h-[90vh] overflow-y-auto shadow-xl dark:text-white"
               onClick={e => e.stopPropagation()}>
            <form onSubmit={handleEditSubmit}>
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="タイトル"
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  className="w-full bg-gray-100 dark:bg-gray-800 p-2 rounded dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="mb-4">
                <textarea
                  placeholder="本文"
                  value={formData.text}
                  onChange={e => setFormData({...formData, text: e.target.value})}
                  onKeyDown={handleTextAreaKeyDown}
                  className="w-full bg-gray-100 dark:bg-gray-800 p-2 rounded h-64 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="タグ（スペース区切り）"
                  value={formData.hashtags}
                  onChange={e => setFormData({...formData, hashtags: e.target.value})}
                  className="w-full bg-gray-100 dark:bg-gray-800 p-2 rounded dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-between gap-2">
                <button
                  type="button"
                  onClick={handleDelete}
                  className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors duration-200"
                >
                  削除
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-black dark:text-white font-bold py-2 px-4 rounded transition-colors duration-200"
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors duration-200"
                  >
                    更新
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDeleteConfirmationOpen && (
        <div className="fixed inset-0 md:ml-48 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className=" bg-gray-100 dark:bg-gray-800 p-6 rounded-lg w-80">
            <h3 className="text-lg font-bold mb-4 dark:text-white">削除の確認</h3>
            <p className="mb-6 dark:text-white">このメモを削除してもよろしいですか？</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsDeleteConfirmationOpen(false)}
                className="bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-black dark:text-white font-bold py-2 px-4 rounded"
              >
                キャンセル
              </button>
              <button
                onClick={confirmDelete}
                className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
              >
                削除
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {notes.map((note) => (
          <div 
            key={note['sticky-note_id']}
            className="aspect-square bg-gray-200 dark:bg-gray-800 rounded-lg shadow-md p-4 flex flex-col cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => handleNoteClick(note)}
          >
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              {new Date(note['sticky-note_updateat']).toLocaleString('ja-JP')}
            </div>
            <h3 className="font-bold text-lg mb-2 line-clamp-2 dark:text-white">
              {note['sticky-note_title']}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-4 whitespace-pre-line">
              {note['sticky-note_text']}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}