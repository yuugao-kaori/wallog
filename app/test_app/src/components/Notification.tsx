import { createPortal } from 'react-dom';

export interface NotificationItem {
  id: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface NotificationProps {
  notifications: NotificationItem[];
  onClose: (id: string) => void;
}

const Notification: React.FC<NotificationProps> = ({ notifications, onClose }) => {
  if (notifications.length === 0) return null;

  return createPortal(
    <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-[10000]">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`bg-blue-500 text-white py-2 px-4 rounded shadow-lg text-sm flex items-center justify-between ${
            notification.id === 'connection-error' ? 'border-2 border-red-400' : ''
          }`}
        >
          <span>{notification.message}</span>
          {notification.action && (
            <button
              onClick={notification.action.onClick}
              className="ml-4 bg-white text-blue-500 px-2 py-1 rounded"
            >
              {notification.action.label}
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose(notification.id);
            }}
            className="ml-2 hover:text-gray-200 focus:outline-none"
          >
            ×
          </button>
        </div>
      ))}
    </div>,
    document.body
  );
};

export default Notification;

// 変更は不要の場合、このファイルはそのままで構いません。