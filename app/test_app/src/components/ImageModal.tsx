import React from 'react';
import ReactDOM from 'react-dom';

interface ImageModalProps {
  isOpen: boolean;
  imageUrl: string | null;
  onClose: () => void;
  className?: string;
}

const ImageModal: React.FC<ImageModalProps> = ({ isOpen, imageUrl, onClose, className }) => {
  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center">
      <div className="absolute inset-0 bg-black bg-opacity-75" onClick={onClose} />
      <div className={`relative max-w-[90vw] max-h-[90vh] ${className}`}>
        {imageUrl && (
          <img
            src={imageUrl}
            alt="Modal"
            className="w-auto h-auto max-w-full max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        )}
      </div>
    </div>,
    document.body
  );
};

export default ImageModal;