import { createPortal } from 'react-dom';

interface NotificationItem {
  id: string;
  message: string;
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
          className="bg-blue-500 text-white py-2 px-4 rounded shadow-lg text-sm flex items-center justify-between"
        >
          <span>{notification.message}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose(notification.id);
            }}
            className="ml-4 hover:text-gray-200 focus:outline-none"
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