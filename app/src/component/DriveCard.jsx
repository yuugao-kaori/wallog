// ../component/DriveCard.jsx

import React, { useState, useEffect, useRef } from 'react';

const DriveCard = ({ file, handleDeleteClick, handleEditClick, handleCopyUrl }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const toggleMenu = (event) => {
    if (event && event.stopPropagation) {
      event.stopPropagation();
    }
    setMenuOpen(!menuOpen);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="flex items-center justify-between p-4 bg-white shadow rounded dark:bg-gray-800 relative">
      <div className="flex-1">
        <p className="text-lg font-medium text-gray-800 dark:text-gray-100"><strong>File ID:</strong> {file.file_id}</p>
        <p className="text-gray-600"><strong>File Size:</strong> {file.file_size} bytes</p>
        <p className="text-gray-600"><strong>Created At:</strong> {new Date(file.file_createat).toLocaleString()}</p>
      </div>
      <div className="w-24 h-24 ml-4 bg-gray-200 flex items-center justify-center rounded relative">
        <img
          src={`${process.env.REACT_APP_SITE_DOMAIN}/api/drive/file/${file.file_id}`}
          alt={`File ${file.file_id}`}
          className="w-full h-full object-cover rounded absolute top-0 left-0"
          onError={(e) => { e.target.style.display = 'none'; }}
        />
      </div>

      <div className="absolute top-2 right-2">
        <button onClick={toggleMenu} className="p-2 text-gray-700 dark:text-gray-300" aria-haspopup="true" aria-expanded={menuOpen}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
          </svg>
        </button>
        {menuOpen && (
          <div ref={menuRef} className="absolute top-14 right-4 bg-white shadow-lg rounded-lg p-2 z-10 dark:bg-gray-900">
            <ul>
              <li
                className="text-sm py-2 px-4 whitespace-nowrap hover:bg-gray-100 hover:rounded-lg cursor-pointer dark:text-gray-100 dark:hover:bg-gray-800"
                onClick={(event) => { toggleMenu(event); handleDeleteClick(file.file_id); }}
              >
                削除
              </li>
              <li
                className="text-sm py-2 px-4 whitespace-nowrap hover:bg-gray-100 hover:rounded-lg cursor-pointer dark:text-gray-100 dark:hover:bg-gray-800"
                onClick={(event) => { toggleMenu(event); handleEditClick(file.file_id); }}
              >
                修正
              </li>
              <li
                className="text-sm py-2 px-4 whitespace-nowrap hover:bg-gray-100 hover:rounded-lg cursor-pointer dark:text-gray-100 dark:hover:bg-gray-800"
                onClick={(event) => { toggleMenu(event); handleCopyUrl(file.file_id); }}
              >
                URLコピー
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default DriveCard;
