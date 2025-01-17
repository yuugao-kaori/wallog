import React, { useState } from 'react';
import { Post } from './PostFeed';

interface PostFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: Post;
  type: 'quote' | 'reply';
  onSubmit: (text: string, type: 'quote' | 'reply', targetPostId: string) => Promise<void>;
}

const PostFormModal: React.FC<PostFormModalProps> = ({
  isOpen,
  onClose,
  post,
  type,
  onSubmit
}) => {
  const [postText, setPostText] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(postText, type, post.post_id);
    setPostText('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50"
      onClick={onClose}
      style={{ position: 'fixed', overflow: 'auto' }}
    >
      <div
        className="w-full max-w-3xl mx-auto p-4 bg-white dark:bg-gray-800 rounded-lg"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold mb-4">
          {type === 'quote' ? '引用投稿' : '返信投稿'}
        </h2>
        <div className="mb-4 p-4 bg-gray-100 dark:bg-gray-700 rounded">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {post.post_text}
          </p>
        </div>
        <form onSubmit={handleSubmit}>
          <textarea
            value={postText}
            onChange={(e) => setPostText(e.target.value)}
            className="w-full h-32 p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
            placeholder={type === 'quote' ? '引用コメントを入力...' : '返信を入力...'}
          />
          <div className="flex justify-end mt-4">
            <button
              type="button"
              onClick={onClose}
              className="mr-2 px-4 py-2 text-gray-600 bg-gray-200 rounded hover:bg-gray-300"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-white bg-blue-500 rounded hover:bg-blue-600"
            >
              投稿
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PostFormModal;
