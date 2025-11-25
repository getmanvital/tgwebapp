import clsx from 'clsx';
import type { Chat } from '../services/api';

type Props = {
  chats: Chat[];
  loading?: boolean;
  onChatSelect: (userId: number) => void;
};

const ChatsList = ({ chats, loading, onChatSelect }: Props) => {
  if (loading) {
    return (
      <div className="p-5 text-center">
        <p>Загрузка чатов...</p>
      </div>
    );
  }

  if (chats.length === 0) {
    return (
      <div className="p-5 text-center">
        <p>Активных чатов нет</p>
      </div>
    );
  }

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'только что';
    if (diffMins < 60) return `${diffMins} мин назад`;
    if (diffHours < 24) return `${diffHours} ч назад`;
    if (diffDays < 7) return `${diffDays} дн назад`;
    
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  const truncateMessage = (text: string, maxLength: number = 50): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <div className="p-4">
      {chats.map((chat) => (
        <div
          key={chat.userId}
          onClick={() => onChatSelect(chat.userId)}
          className={clsx(
            'flex items-center p-3 mb-2 bg-tg-secondary-bg rounded-xl cursor-pointer',
            'transition-colors duration-200 border-2',
            'hover:bg-tg-secondary-bg/80',
            chat.unreadCount > 0 
              ? 'border-tg-button' 
              : 'border-transparent'
          )}
        >
          {chat.photoUrl ? (
            <img
              src={chat.photoUrl}
              alt={chat.userName}
              className="w-[50px] h-[50px] rounded-full mr-3 object-cover"
            />
          ) : (
            <div className="w-[50px] h-[50px] rounded-full mr-3 bg-tg-button text-white flex items-center justify-center text-lg font-bold">
              {chat.firstName[0].toUpperCase()}
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center mb-1">
              <h3 className={clsx(
                'm-0 text-base text-tg-text overflow-hidden text-ellipsis whitespace-nowrap',
                chat.unreadCount > 0 ? 'font-bold' : 'font-normal'
              )}>
                {chat.userName}
              </h3>
              <span className="text-xs text-tg-hint ml-2 flex-shrink-0">
                {formatTime(chat.lastMessage.sentAt)}
              </span>
            </div>
            
            {chat.product && (
              <div className="text-xs text-tg-button mb-1 overflow-hidden text-ellipsis whitespace-nowrap">
                📦 {chat.product.title}
              </div>
            )}
            
            <div className="flex justify-between items-center">
              <p className="m-0 text-sm text-tg-hint overflow-hidden text-ellipsis whitespace-nowrap flex-1">
                {truncateMessage(chat.lastMessage.content)}
              </p>
              
              {chat.unreadCount > 0 && (
                <span className="bg-tg-button text-white rounded-xl px-2 py-0.5 text-xs font-bold ml-2 flex-shrink-0 min-w-[20px] text-center">
                  {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ChatsList;

