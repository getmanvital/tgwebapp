import { useEffect, useRef, useState } from 'react';
import type { ChatMessage } from '../services/api';

type Props = {
  messages: ChatMessage[];
  product: { id: number; title: string; price?: string } | null;
  onSendMessage: (message: string) => Promise<void>;
  loading?: boolean;
};

const ChatView = ({ messages, product, onSendMessage, loading }: Props) => {
  const [inputValue, setInputValue] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Автопрокрутка к последнему сообщению
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleSend = async () => {
    if (!inputValue.trim() || sending) return;

    const messageText = inputValue.trim();
    setInputValue('');
    setSending(true);

    try {
      await onSendMessage(messageText);
    } catch (error) {
      // Ошибка обрабатывается в родительском компоненте
      setInputValue(messageText); // Возвращаем текст в поле ввода
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Информация о товаре, если есть */}
      {product && (
        <div
          style={{
            padding: '12px',
            backgroundColor: 'var(--tg-theme-secondary-bg-color, #f0f0f0)',
            borderBottom: '1px solid var(--tg-theme-hint-color, #ddd)',
          }}
        >
          <div style={{ fontSize: '12px', color: 'var(--tg-theme-hint-color, #999)', marginBottom: '4px' }}>
            Интересующий товар:
          </div>
          <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--tg-theme-text-color, #000)' }}>
            📦 {product.title}
          </div>
          {product.price && (
            <div style={{ fontSize: '12px', color: 'var(--tg-theme-hint-color, #666)', marginTop: '4px' }}>
              💰 {product.price}
            </div>
          )}
        </div>
      )}

      {/* История сообщений */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        {loading && messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--tg-theme-hint-color, #999)' }}>
            Загрузка сообщений...
          </div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--tg-theme-hint-color, #999)' }}>
            Нет сообщений
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              style={{
                display: 'flex',
                justifyContent: message.direction === 'user_to_manager' ? 'flex-start' : 'flex-end',
              }}
            >
              <div
                style={{
                  maxWidth: '75%',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  backgroundColor:
                    message.direction === 'user_to_manager'
                      ? 'var(--tg-theme-secondary-bg-color, #f5f5f5)'
                      : 'var(--tg-theme-button-color, #3390ec)',
                  color:
                    message.direction === 'user_to_manager'
                      ? 'var(--tg-theme-text-color, #000)'
                      : '#fff',
                  wordWrap: 'break-word',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                }}
              >
                {message.productTitle && (
                  <div
                    style={{
                      fontSize: '11px',
                      opacity: 0.8,
                      marginBottom: '4px',
                      paddingBottom: '4px',
                      borderBottom: `1px solid ${message.direction === 'user_to_manager' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.3)'}`,
                    }}
                  >
                    📦 {message.productTitle}
                  </div>
                )}
                <div style={{ whiteSpace: 'pre-wrap' }}>{message.content}</div>
                <div
                  style={{
                    fontSize: '10px',
                    opacity: 0.7,
                    marginTop: '4px',
                    textAlign: 'right',
                  }}
                >
                  {formatTime(message.sentAt)}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Форма отправки сообщения */}
      <div
        style={{
          padding: '12px',
          borderTop: '1px solid var(--tg-theme-hint-color, #ddd)',
          backgroundColor: 'var(--tg-theme-bg-color, #fff)',
        }}
      >
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Введите сообщение..."
            disabled={sending}
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: '20px',
              border: '1px solid var(--tg-theme-hint-color, #ddd)',
              fontSize: '14px',
              backgroundColor: 'var(--tg-theme-bg-color, #fff)',
              color: 'var(--tg-theme-text-color, #000)',
            }}
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || sending}
            style={{
              padding: '10px 20px',
              borderRadius: '20px',
              border: 'none',
              backgroundColor:
                !inputValue.trim() || sending
                  ? 'var(--tg-theme-hint-color, #ccc)'
                  : 'var(--tg-theme-button-color, #3390ec)',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: !inputValue.trim() || sending ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s',
            }}
          >
            {sending ? '...' : '→'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatView;

