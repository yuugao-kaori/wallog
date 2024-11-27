import React from 'react';

interface ImageModalProps {
  isOpen: boolean;
  imageUrl: string | null;
  onClose: () => void;
  className?: string;  // classNameを追加
}

const ImageModal: React.FC<ImageModalProps> = ({ isOpen, imageUrl, onClose, className }) => {
  if (!isOpen || !imageUrl) return null;

  return (
    <div className={`fixed inset-0 flex items-center justify-center ${className || ''} bg-black bg-opacity-75 z-50`} onClick={onClose}>
      <img src={imageUrl} alt="Enlarged" className="max-w-3xl max-h-full rounded" onClick={(e) => e.stopPropagation()} />
    </div>
  );
};

export default ImageModal;