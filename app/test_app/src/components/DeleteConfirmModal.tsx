import React from 'react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDelete: (event: React.MouseEvent) => void;
  title?: string;        // 追加
  message?: string;      // 追加
  confirmText?: string;  // 追加
}

const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({ 
  isOpen, 
  onClose, 
  onDelete,
  title = "削除の確認",              // デフォルト値を設定
  message = "本当に削除しますか？",  // デフォルト値を設定
  confirmText = "削除"               // デフォルト値を設定
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-sm w-full m-4" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4 dark:text-white">{title}</h2>
        <p className="text-gray-700 dark:text-gray-300 mb-6">{message}</p>
        <div className="flex justify-end space-x-4">
          <button
            className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            onClick={onClose}
          >
            キャンセル
          </button>
          <button
            className="px-4 py-2 bg-red-500 text-white hover:bg-red-600 rounded"
            onClick={onDelete}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmModal;