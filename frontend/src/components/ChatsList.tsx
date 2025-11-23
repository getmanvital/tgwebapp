import type { Chat } from '../services/api';

type Props = {
  chats: Chat[];
  loading?: boolean;
  onChatSelect: (userId: number) => void;
};

const ChatsList = ({ chats, loading, onChatSelect }: Props) => {
  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>Загрузка чатов...</p>
      </div>
    );
  }

  if (chats.length === 0) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
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
    <div className="chats-list" style={{ padding: '16px' }}>
      {chats.map((chat) => (
        <div
          key={chat.userId}
          className="chat-item"
          onClick={() => onChatSelect(chat.userId)}
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '12px',
            marginBottom: '8px',
            backgroundColor: 'var(--tg-theme-secondary-bg-color, #f5f5f5)',
            borderRadius: '12px',
            cursor: 'pointer',
            transition: 'background-color 0.2s',
            border: chat.unreadCount > 0 ? '2px solid var(--tg-theme-button-color, #3390ec)' : '2px solid transparent',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--tg-theme-secondary-bg-color, #e0e0e0)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--tg-theme-secondary-bg-color, #f5f5f5)';
          }}
        >
          {chat.photoUrl ? (
            <img
              src={chat.photoUrl}
              alt={chat.userName}
              style={{
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                marginRight: '12px',
                objectFit: 'cover',
              }}
            />
          ) : (
            <div
              style={{
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                marginRight: '12px',
                backgroundColor: 'var(--tg-theme-button-color, #3390ec)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                fontWeight: 'bold',
              }}
            >
              {chat.firstName[0].toUpperCase()}
            </div>
          )}
          
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <h3
                style={{
                  margin: 0,
                  fontSize: '16px',
                  fontWeight: chat.unreadCount > 0 ? 'bold' : 'normal',
                  color: 'var(--tg-theme-text-color, #000)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {chat.userName}
              </h3>
              <span
                style={{
                  fontSize: '12px',
                  color: 'var(--tg-theme-hint-color, #999)',
                  marginLeft: '8px',
                  flexShrink: 0,
                }}
              >
                {formatTime(chat.lastMessage.sentAt)}
              </span>
            </div>
            
            {chat.product && (
              <div
                style={{
                  fontSize: '12px',
                  color: 'var(--tg-theme-button-color, #3390ec)',
                  marginBottom: '4px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                📦 {chat.product.title}
              </div>
            )}
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p
                style={{
                  margin: 0,
                  fontSize: '14px',
                  color: 'var(--tg-theme-hint-color, #666)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flex: 1,
                }}
              >
                {truncateMessage(chat.lastMessage.content)}
              </p>
              
              {chat.unreadCount > 0 && (
                <span
                  style={{
                    backgroundColor: 'var(--tg-theme-button-color, #3390ec)',
                    color: '#fff',
                    borderRadius: '12px',
                    padding: '2px 8px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    marginLeft: '8px',
                    flexShrink: 0,
                    minWidth: '20px',
                    textAlign: 'center',
                  }}
                >
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

