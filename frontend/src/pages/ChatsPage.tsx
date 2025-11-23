import { useEffect, useState, useCallback } from 'react';
import ChatsList from '../components/ChatsList';
import ChatView from '../components/ChatView';
import { getChats, getChatHistory, sendMessageToClient } from '../services/api';
import { useTelegramUser } from '../hooks/useTelegramUser';
import { useIsAdmin } from '../hooks/useIsAdmin';
import type { Chat, ChatMessage } from '../services/api';
import { logger } from '../utils/logger';

const ChatsPage = ({ onBack }: { onBack: () => void }) => {
  const user = useTelegramUser();
  const isAdmin = useIsAdmin();
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [product, setProduct] = useState<{ id: number; title: string; price?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchChats = useCallback(async () => {
    if (!isAdmin || !user?.username) {
      setError('Доступ запрещен. Только администратор может просматривать чаты.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await getChats(user.username!);
      setChats(response.chats || []);
    } catch (err: any) {
      logger.error('[ChatsPage] Error loading chats:', err);
      if (err?.response?.status === 403) {
        setError('Доступ запрещен. У вас нет прав администратора.');
      } else {
        setError(`Ошибка загрузки чатов: ${err?.message || 'Неизвестная ошибка'}`);
      }
    } finally {
      setLoading(false);
    }
  }, [isAdmin, user?.username]);

  const fetchChatHistory = useCallback(async (userId: number) => {
    if (!isAdmin || !user?.username) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await getChatHistory(user.username!, userId);
      setMessages(response.messages || []);
      
      // Находим товар из первого сообщения с productId
      const firstProductMessage = response.messages.find(
        (msg: ChatMessage) => msg.productId !== null
      );
      
      if (firstProductMessage) {
        setProduct({
          id: firstProductMessage.productId!,
          title: firstProductMessage.productTitle || 'Товар',
          price: firstProductMessage.productPrice || undefined,
        });
      } else {
        setProduct(null);
      }
    } catch (err: any) {
      logger.error('[ChatsPage] Error loading chat history:', err);
      setError(`Ошибка загрузки истории: ${err?.message || 'Неизвестная ошибка'}`);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, user?.username]);

  useEffect(() => {
    fetchChats();
  }, [fetchChats, refreshKey]);

  useEffect(() => {
    if (selectedUserId) {
      fetchChatHistory(selectedUserId);
      
      // Автообновление истории каждые 5 секунд
      const interval = setInterval(() => {
        fetchChatHistory(selectedUserId);
      }, 5000);

      return () => clearInterval(interval);
    } else {
      setMessages([]);
      setProduct(null);
    }
  }, [selectedUserId, fetchChatHistory]);

  const handleChatSelect = (userId: number) => {
    setSelectedUserId(userId);
  };

  const handleSendMessage = async (messageText: string) => {
    if (!selectedUserId || !user?.username) {
      throw new Error('User ID or admin username not available');
    }

    try {
      await sendMessageToClient(user.username, selectedUserId, messageText);
      
      // Добавляем сообщение в локальное состояние
      const newMessage: ChatMessage = {
        id: Date.now(), // Временный ID
        direction: 'manager_to_user',
        content: messageText,
        productId: null,
        productTitle: null,
        productPrice: null,
        sentAt: new Date().toISOString(),
        readAt: null,
      };
      
      setMessages((prev) => [...prev, newMessage]);
      
      // Обновляем список чатов
      setRefreshKey((prev) => prev + 1);
      
      // Обновляем историю для получения реального ID сообщения
      setTimeout(() => {
        fetchChatHistory(selectedUserId);
      }, 500);
    } catch (error) {
      logger.error('[ChatsPage] Error sending message:', error);
      throw error;
    }
  };

  const handleBackToList = () => {
    setSelectedUserId(null);
    setMessages([]);
    setProduct(null);
    fetchChats();
  };

  return (
    <main style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <header>
        {selectedUserId ? (
          <>
            <div className="header-actions">
              <button
                className="back-button"
                onClick={handleBackToList}
              >
                ← Назад к чатам
              </button>
            </div>
            <h1>Чат</h1>
          </>
        ) : (
          <>
            <div className="header-actions">
              <button
                className="back-button"
                onClick={onBack}
              >
                ← Назад
              </button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <h1>
                Чаты
                {chats.length > 0 && (
                  <span style={{
                    fontSize: '0.7em',
                    fontWeight: 'normal',
                    color: 'var(--tg-theme-hint-color, #999)',
                    marginLeft: '8px',
                  }}>
                    ({chats.length})
                  </span>
                )}
              </h1>
              <button
                onClick={() => {
                  setRefreshKey((prev) => prev + 1);
                  fetchChats();
                }}
                disabled={loading}
                style={{
                  padding: '8px 16px',
                  background: 'var(--tg-theme-button-color, #0f62fe)',
                  color: 'var(--tg-theme-button-text-color, #fff)',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  opacity: loading ? 0.6 : 1,
                  transition: 'opacity 0.2s',
                }}
              >
                🔄 Обновить
              </button>
            </div>
          </>
        )}
      </header>

      {error && (
        <div className="error" style={{ padding: '16px', margin: '16px' }}>
          {error}
        </div>
      )}

      {selectedUserId ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <ChatView
            messages={messages}
            product={product}
            onSendMessage={handleSendMessage}
            loading={loading}
          />
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <ChatsList
            chats={chats}
            loading={loading}
            onChatSelect={handleChatSelect}
          />
        </div>
      )}
    </main>
  );
};

export default ChatsPage;

