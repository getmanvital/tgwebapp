import { useEffect, useState, useCallback, useRef } from 'react';
import ChatsList from '../components/ChatsList';
import ChatView from '../components/ChatView';
import { getChats, getChatHistory, sendMessageToClient, sendImageToClient } from '../services/api';
import { useTelegramUser } from '../hooks/useTelegramUser';
import { useIsAdmin } from '../hooks/useIsAdmin';
import { useChatSocket } from '../hooks/useChatSocket';
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
  const [socketError, setSocketError] = useState(false);
  const pollingFallbackRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [chatUserUsername, setChatUserUsername] = useState<string | null>(null);
  const selectedUserIdRef = useRef<number | null>(null);

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
      // Сохраняем username пользователя
      setChatUserUsername(response.user?.username || null);
      
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

  // Обновляем ref при изменении selectedUserId
  useEffect(() => {
    selectedUserIdRef.current = selectedUserId;
  }, [selectedUserId]);

  // Обработчик нового сообщения через Socket.io
  const handleNewMessage = useCallback(
    (userId: number, message: ChatMessage) => {
      const currentSelectedUserId = selectedUserIdRef.current;
      
      logger.debug('[ChatsPage] New message received via Socket.io', {
        userId,
        messageId: message.id,
        direction: message.direction,
        selectedUserId: currentSelectedUserId,
        userIdType: typeof userId,
        selectedUserIdType: typeof currentSelectedUserId,
      });

      // Если это сообщение для открытого чата, добавляем его в список
      // Сравниваем как числа, на случай если один из них строка
      if (currentSelectedUserId !== null && Number(currentSelectedUserId) === Number(userId)) {
        logger.debug('[ChatsPage] Adding message to open chat', {
          userId,
          messageId: message.id,
        });
        
        setMessages((prev) => {
          // Проверяем, нет ли уже этого сообщения (по ID)
          const existingIndex = prev.findIndex((m) => m.id === message.id);
          if (existingIndex !== -1) {
            // Обновляем существующее сообщение
            const updated = [...prev];
            updated[existingIndex] = message;
            return updated;
          }
          
          // Удаляем все оптимистичные сообщения с временным ID (больше текущего времени минус 10 секунд)
          // и с таким же контентом, если это сообщение от менеджера
          const tenSecondsAgo = Date.now() - 10000;
          const filtered = prev.filter((m) => {
            // Если это временное сообщение (ID больше чем 10 секунд назад) 
            // и совпадает контент и направление (от менеджера)
            if (m.id > tenSecondsAgo && 
                m.direction === 'manager_to_user' && 
                message.direction === 'manager_to_user' &&
                m.content === message.content) {
              logger.debug('[ChatsPage] Removing optimistic message', {
                optimisticId: m.id,
                realId: message.id,
                content: m.content,
              });
              return false; // Удаляем оптимистичное сообщение
            }
            return true;
          });
          
          // Добавляем новое сообщение
          return [...filtered, message];
        });

        // Обновляем товар если он есть в сообщении
        if (message.productId) {
          setProduct({
            id: message.productId,
            title: message.productTitle || 'Товар',
            price: message.productPrice || undefined,
          });
        }
      } else {
        logger.debug('[ChatsPage] Message not for open chat, skipping display', {
          userId,
          selectedUserId: currentSelectedUserId,
        });
      }

      // Всегда обновляем список чатов при новом сообщении (но не показываем loading)
      fetchChats();
    },
    [fetchChats]
  );

  // Обработчик обновления списка чатов через Socket.io
  const handleChatsUpdated = useCallback(
    (userId?: number) => {
      logger.debug('[ChatsPage] Chats updated via Socket.io', { userId });
      fetchChats();
    },
    [fetchChats]
  );

  // Инициализация Socket.io
  const { status: socketStatus } = useChatSocket({
    adminUsername: user?.username,
    enabled: isAdmin && !!user?.username,
    onNewMessage: handleNewMessage,
    onChatsUpdated: handleChatsUpdated,
    currentUserId: selectedUserId,
  });

  // Начальная загрузка списка чатов
  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  // Fallback polling при ошибке Socket.io
  useEffect(() => {
    const isSocketError = socketStatus === 'error';
    setSocketError(isSocketError);

    // Очищаем предыдущий polling fallback
    if (pollingFallbackRef.current) {
      clearInterval(pollingFallbackRef.current);
      pollingFallbackRef.current = null;
    }

    // Запускаем редкий polling fallback при ошибке Socket.io
    if (isSocketError) {
      logger.warn('[ChatsPage] Socket.io error, using polling fallback');
      pollingFallbackRef.current = setInterval(() => {
        if (!selectedUserId) {
          fetchChats();
        } else {
          fetchChatHistory(selectedUserId, true);
        }
      }, 30000); // Каждые 30 секунд вместо 2-3
    }

    return () => {
      if (pollingFallbackRef.current) {
        clearInterval(pollingFallbackRef.current);
        pollingFallbackRef.current = null;
      }
    };
  }, [socketStatus, selectedUserId, fetchChats, fetchChatHistory]);

  // Загрузка истории чата при выборе
  useEffect(() => {
    if (selectedUserId) {
      fetchChatHistory(selectedUserId);
    } else {
      setMessages([]);
      setProduct(null);
    }
  }, [selectedUserId, fetchChatHistory]);

  const handleChatSelect = (userId: number) => {
    setSelectedUserId(userId);
    setMessages([]);
    setProduct(null);
    setChatUserUsername(null);
  };

  const handleSendMessage = async (messageText: string) => {
    if (!selectedUserId || !user?.username) {
      throw new Error('User ID or admin username not available');
    }

    // Создаем временный ID для оптимистичного сообщения
    const optimisticMessageId = Date.now();
    
    // Оптимистичное сообщение для мгновенного отображения
    const optimisticMessage: ChatMessage = {
      id: optimisticMessageId, // Временный ID
      direction: 'manager_to_user',
      content: messageText,
      productId: null,
      productTitle: null,
      productPrice: null,
      sentAt: new Date().toISOString(),
      readAt: null,
      attachmentType: null,
      attachmentUrl: null,
      attachmentMeta: null,
    };
    
    // Добавляем оптимистичное сообщение сразу
    setMessages((prev) => [...prev, optimisticMessage]);

    try {
      await sendMessageToClient(user.username, selectedUserId, messageText);
      
      // Обновляем список чатов
      fetchChats();
      
      // Сообщение будет получено через Socket.io событие, которое заменит оптимистичное
      // Убираем таймаут с fetchChatHistory, так как Socket.io должен прийти быстрее
    } catch (error) {
      // При ошибке удаляем оптимистичное сообщение
      setMessages((prev) => prev.filter(msg => msg.id !== optimisticMessageId));
      logger.error('[ChatsPage] Error sending message:', error);
      throw error;
    }
  };

  const handleSendImage = async (file: File, caption?: string) => {
    if (!selectedUserId || !user?.username) {
      throw new Error('User ID or admin username not available');
    }

    try {
      await sendImageToClient(user.username, selectedUserId, file, caption);
      fetchChats();
    } catch (error) {
      logger.error('[ChatsPage] Error sending image:', error);
      throw error;
    }
  };

  const handleBackToList = () => {
    setSelectedUserId(null);
    setMessages([]);
    setProduct(null);
    setChatUserUsername(null);
    fetchChats();
  };

  return (
    <main className="h-full flex flex-col">
      <header className="flex flex-col gap-3 sticky top-0 z-50 bg-tg-bg pb-2">
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

      {socketError && (
        <div className="bg-tg-secondary-bg border border-tg-hint rounded-lg p-3 m-4 text-sm text-tg-hint">
          <span className="inline-block mr-2">⚠️</span>
          Реальное время недоступно. Используется обновление каждые 30 секунд.
        </div>
      )}

      {selectedUserId ? (
        <div className="flex-1 flex flex-col min-h-0 pb-[calc(72px+max(16px,env(safe-area-inset-bottom)))]">
          <ChatView
            messages={messages}
            product={product}
            onSendMessage={handleSendMessage}
            onSendImage={handleSendImage}
            loading={loading}
            managerUsername={user?.username || null}
            chatUserUsername={chatUserUsername}
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

