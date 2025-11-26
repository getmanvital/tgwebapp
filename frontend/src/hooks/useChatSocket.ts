import { useEffect, useRef, useCallback } from 'react';
import { useSocket } from './useSocket';
import type { ChatMessage, Chat } from '../services/api';
import { logger } from '../utils/logger';

interface UseChatSocketOptions {
  adminUsername: string | null | undefined;
  enabled?: boolean;
  onNewMessage?: (userId: number, message: ChatMessage) => void;
  onChatsUpdated?: (userId?: number) => void;
  currentUserId?: number | null;
}

export const useChatSocket = ({
  adminUsername,
  enabled = true,
  onNewMessage,
  onChatsUpdated,
  currentUserId,
}: UseChatSocketOptions) => {
  const { socket, status } = useSocket({ adminUsername, enabled });
  const callbacksRef = useRef({ onNewMessage, onChatsUpdated });
  const currentUserIdRef = useRef(currentUserId);

  // Обновляем refs при изменении callbacks
  useEffect(() => {
    callbacksRef.current = { onNewMessage, onChatsUpdated };
  }, [onNewMessage, onChatsUpdated]);

  // Обновляем ref для currentUserId
  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

  // Подписка на события Socket.io
  useEffect(() => {
    if (!socket || !enabled) {
      return;
    }

    logger.debug('[useChatSocket] Setting up event listeners', {
      socketId: socket.id,
      currentUserId,
    });

    // Обработка нового сообщения в чате
    const handleNewMessage = (data: { userId: number; message: ChatMessage }) => {
      logger.debug('[useChatSocket] New message received', {
        userId: data.userId,
        messageId: data.message.id,
        direction: data.message.direction,
        currentUserId: currentUserIdRef.current,
      });

      // Вызываем callback только если это сообщение для текущего открытого чата
      // или если чат не открыт (для обновления списка чатов)
      if (callbacksRef.current.onNewMessage) {
        callbacksRef.current.onNewMessage(data.userId, data.message);
      }
    };

    // Обработка обновления списка чатов
    const handleChatsUpdated = (data: { userId?: number }) => {
      logger.debug('[useChatSocket] Chats updated', {
        userId: data.userId,
        currentUserId: currentUserIdRef.current,
      });

      if (callbacksRef.current.onChatsUpdated) {
        callbacksRef.current.onChatsUpdated(data.userId);
      }
    };

    // Подписываемся на события
    socket.on('chat:new-message', handleNewMessage);
    socket.on('chats:updated', handleChatsUpdated);

    // Очистка подписок
    return () => {
      logger.debug('[useChatSocket] Cleaning up event listeners');
      socket.off('chat:new-message', handleNewMessage);
      socket.off('chats:updated', handleChatsUpdated);
    };
  }, [socket, enabled, currentUserId]);

  // Функции для управления комнатами чатов
  const joinChat = useCallback(
    (userId: number) => {
      if (!socket || !enabled) {
        logger.warn('[useChatSocket] Cannot join chat: socket not connected', {
          hasSocket: !!socket,
          enabled,
        });
        return;
      }

      logger.info('[useChatSocket] Joining chat room', { userId, socketId: socket.id });
      socket.emit('chat:join', userId);
    },
    [socket, enabled]
  );

  const leaveChat = useCallback(
    (userId: number) => {
      if (!socket || !enabled) {
        return;
      }

      logger.info('[useChatSocket] Leaving chat room', { userId, socketId: socket.id });
      socket.emit('chat:leave', userId);
    },
    [socket, enabled]
  );

  // Автоматически присоединяемся/выходим из комнаты при изменении currentUserId
  useEffect(() => {
    if (!socket || !enabled) {
      return;
    }

    if (currentUserId) {
      joinChat(currentUserId);
    }

    return () => {
      if (currentUserId) {
        leaveChat(currentUserId);
      }
    };
  }, [socket, enabled, currentUserId, joinChat, leaveChat]);

  return {
    socket,
    status,
    joinChat,
    leaveChat,
  };
};

