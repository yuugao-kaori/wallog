import React, { useEffect, useState } from 'react';

interface Note {
  'sticky-note_id': string;
  'sticky-note_title': string;
  'sticky-note_text': string;
  'sticky-note_hashtag': string;
  'sticky-note_createat': string;  // created_at から sticky-note_createat に変更
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
      }
    } catch (error) {
      console.error('Error creating note:', error);
    }
  };

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
      }
    } catch (error) {
      console.error('Error updating note:', error);
    }
  };

  const handleDelete = async () => {
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
        const response = await fetch('/api/sticky_note/sticky_note_read');
        const data = await response.json();
        setNotes(data.sticky_notes);
      }
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  return (
    <div className="p-4">
      <div className="mb-4">
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          新規作成
        </button>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 md:ml-64 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-96">
            <h2 className="text-xl font-bold mb-4 dark:text-white">新規メモ作成</h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="タイトル"
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
                  required
                />
              </div>
              <div className="mb-4">
                <textarea
                  placeholder="本文"
                  value={formData.text}
                  onChange={e => setFormData({...formData, text: e.target.value})}
                  className="w-full p-2 border rounded h-32 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                />
              </div>
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="タグ（スペース区切り）"
                  value={formData.hashtags}
                  onChange={e => setFormData({...formData, hashtags: e.target.value})}
                  className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
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
        <div className="fixed inset-0 md:ml-64 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-96 dark:bg-gray-800 dark:text-white">
            <form onSubmit={handleEditSubmit}>
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="タイトル"
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  className="w-full p-1 border rounded dark:bg-gray-800 dark:text-white"
                  required
                />
              </div>
              <div className="mb-4">
                <textarea
                  placeholder="本文"
                  value={formData.text}
                  onChange={e => setFormData({...formData, text: e.target.value})}
                  className="w-full p-1 border rounded h-48 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="タグ（スペース区切り）"
                  value={formData.hashtags}
                  onChange={e => setFormData({...formData, hashtags: e.target.value})}
                  className="w-full p-1 border rounded dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div className="flex justify-between gap-2">
                <button
                  type="button"
                  onClick={handleDelete}
                  className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
                >
                  削除
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsViewModalOpen(false)}
                    className="bg-gray-300 hover:bg-gray-400 text-black font-bold py-2 px-4 rounded"
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                  >
                    更新
                  </button>
                </div>
              </div>
            </form>
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
              {new Date(note['sticky-note_createat']).toLocaleString('ja-JP')}
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