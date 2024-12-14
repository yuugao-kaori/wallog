import React from 'react';
import Card from './PostCard';
import { Post } from './PostFeed';

interface PostCardPopupProps {
  isOpen: boolean;
  onClose: () => void;
  post: Post;
  isLoggedIn: boolean;
  handleDeleteClick: (event: React.MouseEvent, postId: string) => void;
  formatDate: (date: string) => string;
  formatHashtags?: (text: string) => string;
  renderHashtagsContainer?: (text: string) => React.ReactNode;
  onDelete: (event: React.MouseEvent, post_id: string) => Promise<boolean>;
  onRepost?: (post: Post) => Promise<void>;
  onQuote?: (post: Post) => void;
  onReply?: (post: Post) => void;
}

const PostCardPopup: React.FC<PostCardPopupProps> = ({
  isOpen,
  onClose,
  post,
  onQuote,
  onReply,
  ...cardProps
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50"
      onClick={onClose}
      style={{ position: 'fixed', overflow: 'auto' }}
    >
      <div 
        className="w-full max-w-3xl mx-auto px-2 sm:px-4 md:ml-48 my-4"
        onClick={e => e.stopPropagation()}
      >
        <Card 
          post={post}
          {...cardProps}
          onQuote={onQuote}
          onReply={onReply}
          className="transform scale-100 transition-transform duration-200"
        />
      </div>
    </div>
  );
};

export default PostCardPopup;
