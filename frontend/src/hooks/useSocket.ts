import { useEffect, useRef, useState, useCallback } from 'react';
import { io, type Socket } from 'socket.io-client';
import { getSocketUrl } from '../utils/backendUrl';
import { logger } from '../utils/logger';

type SocketStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface UseSocketOptions {
  adminUsername: string | null | undefined;
  enabled?: boolean;
}

interface UseSocketReturn {
  socket: Socket | null;
  status: SocketStatus;
  reconnect: () => void;
  disconnect: () => void;
}

export const useSocket = ({ adminUsername, enabled = true }: UseSocketOptions): UseSocketReturn => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [status, setStatus] = useState<SocketStatus>('disconnected');
  const socketRef = useRef<Socket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    // Проверяем условия для подключения
    if (!enabled) {
      logger.debug('[useSocket] Socket connection disabled');
      return;
    }

    if (!adminUsername) {
      logger.debug('[useSocket] No admin username, skipping connection');
      setStatus('disconnected');
      return;
    }

    // Отключаем предыдущее соединение если есть
    if (socketRef.current) {
      logger.debug('[useSocket] Disconnecting existing socket');
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    const socketUrl = getSocketUrl();
    logger.info('[useSocket] Connecting to Socket.io server', {
      socketUrl: socketUrl || 'current domain',
      adminUsername,
    });

    setStatus('connecting');

    // Создаем новое подключение
    const newSocket = io(socketUrl || undefined, {
      auth: {
        adminUsername,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: maxReconnectAttempts,
      timeout: 20000,
    });

    // Обработка подключения
    newSocket.on('connect', () => {
      logger.info('[useSocket] Socket connected', {
        socketId: newSocket.id,
        adminUsername,
      });
      setStatus('connected');
      reconnectAttemptsRef.current = 0;
    });

    // Обработка отключения
    newSocket.on('disconnect', (reason) => {
      logger.info('[useSocket] Socket disconnected', {
        reason,
        adminUsername,
      });
      if (reason === 'io server disconnect') {
        // Сервер принудительно отключил, не переподключаемся автоматически
        setStatus('disconnected');
      } else {
        // Ошибка соединения, попробуем переподключиться
        setStatus('connecting');
      }
    });

    // Обработка ошибок подключения
    newSocket.on('connect_error', (error) => {
      reconnectAttemptsRef.current += 1;
      logger.error('[useSocket] Socket connection error', {
        error: error.message,
        adminUsername,
        attempt: reconnectAttemptsRef.current,
        maxAttempts: maxReconnectAttempts,
      });

      if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
        logger.error('[useSocket] Max reconnection attempts reached', {
          adminUsername,
          attempts: reconnectAttemptsRef.current,
        });
        setStatus('error');
      } else {
        setStatus('connecting');
      }
    });

    // Обработка ошибок аутентификации
    newSocket.on('error', (error: any) => {
      logger.error('[useSocket] Socket error', {
        error: error?.message || error,
        adminUsername,
      });
      setStatus('error');
    });

    socketRef.current = newSocket;
    setSocket(newSocket);
  }, [adminUsername, enabled]);

  const reconnect = useCallback(() => {
    logger.info('[useSocket] Manual reconnect requested', { adminUsername });
    reconnectAttemptsRef.current = 0;
    connect();
  }, [connect, adminUsername]);

  const disconnect = useCallback(() => {
    logger.info('[useSocket] Manual disconnect requested', { adminUsername });
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setSocket(null);
      setStatus('disconnected');
    }
  }, [adminUsername]);

  // Подключение при монтировании и изменении зависимостей
  useEffect(() => {
    connect();

    // Очистка при размонтировании
    return () => {
      if (socketRef.current) {
        logger.debug('[useSocket] Cleaning up socket connection');
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setStatus('disconnected');
      }
    };
  }, [connect]);

  return {
    socket,
    status,
    reconnect,
    disconnect,
  };
};

