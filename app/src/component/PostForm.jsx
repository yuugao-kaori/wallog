// NewPostForm.jsx
import React, { useRef } from 'react';

function NewPostForm({ postText, setPostText, handleSubmit, files, handleFiles, handleDelete }) {
  const fileInputRef = useRef(null);
  const dropRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    dropRef.current.classList.add('drag-over');
  };

  const handleDragLeave = () => {
    dropRef.current.classList.remove('drag-over');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    dropRef.current.classList.remove('drag-over');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
      e.dataTransfer.clearData();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-2">
      <textarea
        className="w-full p-2 border rounded dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700"
        value={postText}
        onChange={(e) => setPostText(e.target.value)}
        placeholder="ここに投稿内容を入力してください"
        rows="4"
      />
      <div
        ref={dropRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className="mt-2 p-4 border-dashed border-2 border-gray-400 rounded text-center cursor-pointer"
        onClick={() => fileInputRef.current.click()}
      >
        ファイルをドラッグ＆ドロップするか、クリックして選択
        <input
          type="file"
          multiple
          ref={fileInputRef}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
      {files.length > 0 && (
        <div className="mt-4 grid grid-cols-3 gap-2">
          {files.map((file) => (
            <div key={file.id} className="relative w-24 h-24 bg-gray-200">
              {file.isImage ? (
                <img src={file.url} alt="preview" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gray-400 flex items-center justify-center">
                  <span>ファイル</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => handleDelete(file.id)}
                className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      <button
        type="submit"
        className={`mt-2 p-2 text-white rounded ${
          postText.trim() === '' && files.length === 0
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-blue-500 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-800'
        }`}
        disabled={postText.trim() === '' && files.length === 0}
      >
        投稿
      </button>
    </form>
  );
}

export default React.memo(NewPostForm);
