import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import type { ChatMessage } from '../services/api';

type Props = {
  messages: ChatMessage[];
  product: { id: number; title: string; price?: string } | null;
  onSendMessage: (message: string) => Promise<void>;
  loading?: boolean;
  managerUsername: string | null;
  chatUserUsername: string | null;
};

const ChatView = ({ messages, product, onSendMessage, loading, managerUsername, chatUserUsername }: Props) => {
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

  const getSenderName = (direction: 'user_to_manager' | 'manager_to_user'): string => {
    if (direction === 'user_to_manager') {
      // Логин пользователя
      return chatUserUsername ? `@${chatUserUsername}` : 'Пользователь';
    }
    // Логин менеджера
    return managerUsername ? `@${managerUsername}` : 'Менеджер';
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
    <div className="flex flex-col h-full">
      {/* Информация о товаре, если есть */}
      {product && (
        <div className="p-3 bg-tg-secondary-bg border-b border-tg-hint">
          <div className="text-xs text-tg-hint mb-1">
            Интересующий товар:
          </div>
          <div className="text-sm font-bold text-tg-text">
            📦 {product.title}
          </div>
          {product.price && (
            <div className="text-xs text-tg-hint mt-1">
              💰 {product.price}
            </div>
          )}
        </div>
      )}

      {/* История сообщений */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {loading && messages.length === 0 ? (
          <div className="text-center text-tg-hint">
            Загрузка сообщений...
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-tg-hint">
            Нет сообщений
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={clsx(
                'flex flex-col gap-1',
                message.direction === 'user_to_manager' ? 'items-start' : 'items-end'
              )}
            >
              {/* Подпись отправителя с логином */}
              <div className={clsx(
                'text-[11px] text-tg-hint px-1',
                message.direction === 'user_to_manager' ? 'self-start' : 'self-end'
              )}>
                {getSenderName(message.direction)}
              </div>
              
              <div
                className={clsx(
                  'flex w-full',
                  message.direction === 'user_to_manager' ? 'justify-start' : 'justify-end'
                )}
              >
                <div
                  className={clsx(
                    'max-w-[75%] min-w-0 px-3.5 py-2.5 rounded-xl shadow-sm overflow-hidden',
                    message.direction === 'user_to_manager'
                      ? 'bg-tg-secondary-bg text-tg-text'
                      : 'bg-tg-button text-white'
                  )}
                >
                  {message.productTitle && (
                    <div
                      className={clsx(
                        'text-[11px] opacity-80 mb-1 pb-1',
                        message.direction === 'user_to_manager'
                          ? 'border-b border-black/10'
                          : 'border-b border-white/30'
                      )}
                    >
                      📦 {message.productTitle}
                    </div>
                  )}
                  <div className="whitespace-normal break-words">
                    {message.content}
                  </div>
                  <div className="text-[10px] opacity-70 mt-1 text-right">
                    {formatTime(message.sentAt)}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Форма отправки сообщения */}
      <div className="p-3 border-t border-tg-hint bg-tg-bg">
        <div className="flex gap-2 items-center">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Введите сообщение..."
            disabled={sending}
            className="flex-1 px-3.5 py-2.5 rounded-[20px] border border-tg-hint text-sm bg-tg-bg text-tg-text"
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || sending}
            className={clsx(
              'px-5 py-2.5 rounded-[20px] border-none text-sm font-bold text-white transition-colors',
              !inputValue.trim() || sending
                ? 'bg-tg-hint cursor-not-allowed'
                : 'bg-tg-button cursor-pointer hover:opacity-90'
            )}
          >
            {sending ? '...' : '→'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatView;

