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

  const fetchChatHistory = useCallback(async (userId: number, silent = false) => {
    if (!isAdmin || !user?.username) {
      return;
    }

    if (!silent) {
      setLoading(true);
      setError(null);
    }

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
      if (!silent) {
        setError(`Ошибка загрузки истории: ${err?.message || 'Неизвестная ошибка'}`);
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [isAdmin, user?.username]);

  useEffect(() => {
    fetchChats();
    
    // Автообновление списка чатов каждые 3 секунды, если чат не открыт
    const chatsInterval = setInterval(() => {
      if (!selectedUserId) {
        fetchChats();
      }
    }, 3000);

    return () => clearInterval(chatsInterval);
  }, [fetchChats, selectedUserId]);

  useEffect(() => {
    if (selectedUserId) {
      fetchChatHistory(selectedUserId);
      
      // Автообновление истории каждые 2 секунды (тихое обновление без показа loading)
      const interval = setInterval(() => {
        fetchChatHistory(selectedUserId, true);
      }, 2000);

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
      fetchChats();
      
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
    <main className="h-full flex flex-col">
      <header className="flex flex-col gap-3">
        {selectedUserId ? (
          <>
            <div className="flex items-center">
              <button
                className="border-none bg-transparent text-tg-link cursor-pointer py-2 px-0 text-sm font-medium flex items-center gap-1 transition-opacity hover:opacity-70"
                onClick={handleBackToList}
              >
                ← Назад к чатам
              </button>
            </div>
            <h1>Чат</h1>
          </>
        ) : (
          <>
            <div className="flex items-center">
              <button
                className="border-none bg-transparent text-tg-link cursor-pointer py-2 px-0 text-sm font-medium flex items-center gap-1 transition-opacity hover:opacity-70"
                onClick={onBack}
              >
                ← Назад
              </button>
            </div>
            <h1>
              Чаты
              {chats.length > 0 && (
                <span className="text-[0.7em] font-normal text-tg-hint ml-2">
                  ({chats.length})
                </span>
              )}
            </h1>
          </>
        )}
      </header>

      {error && (
        <div className="error p-4 m-4">
          {error}
        </div>
      )}

      {selectedUserId ? (
        <div className="flex-1 flex flex-col min-h-0">
          <ChatView
            messages={messages}
            product={product}
            onSendMessage={handleSendMessage}
            loading={loading}
          />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
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

