import type { Server, Socket } from 'socket.io';
import pino from 'pino';

const logger = pino();
const ADMIN_USERNAME = 'getmanvit';

// Глобальная ссылка на io сервер
let ioInstance: Server | null = null;

// Функция нормализации username
const normalizeUsername = (username: string | undefined | null): string | null => {
  if (!username) return null;
  return username.startsWith('@') ? username.slice(1) : username;
};

// Функция проверки администратора
const isAdmin = (username: string | undefined | null): boolean => {
  const normalized = normalizeUsername(username);
  return normalized === ADMIN_USERNAME;
};

interface SocketWithAuth extends Socket {
  adminUsername?: string | null;
  userId?: number;
}

// Инициализация Socket.io сервиса
export const initializeSocketService = (io: Server) => {
  ioInstance = io;
  // Middleware для аутентификации
  io.use((socket: SocketWithAuth, next) => {
    const adminUsername = socket.handshake.auth?.adminUsername || socket.handshake.query?.adminUsername;
    
    logger.debug({
      socketId: socket.id,
      adminUsername,
      hasAuth: !!socket.handshake.auth?.adminUsername,
      hasQuery: !!socket.handshake.query?.adminUsername,
    }, 'Socket connection attempt');

    // Проверяем, что передан adminUsername
    if (!adminUsername) {
      logger.warn({ socketId: socket.id }, 'Socket connection rejected: no adminUsername provided');
      return next(new Error('Admin username required'));
    }

    // Проверяем права администратора
    if (!isAdmin(adminUsername)) {
      logger.warn({
        socketId: socket.id,
        adminUsername,
        normalized: normalizeUsername(adminUsername as string),
      }, 'Socket connection rejected: not an admin');
      return next(new Error('Admin access required'));
    }

    // Сохраняем adminUsername в сокете
    socket.adminUsername = normalizeUsername(adminUsername as string);
    logger.info({
      socketId: socket.id,
      adminUsername: socket.adminUsername,
    }, 'Socket connection authenticated as admin');

    next();
  });

  // Обработка подключений
  io.on('connection', (socket: SocketWithAuth) => {
    logger.info({
      socketId: socket.id,
      adminUsername: socket.adminUsername,
    }, 'Socket client connected');

    // Обработка присоединения к чату
    socket.on('chat:join', (userId: number) => {
      if (!userId || typeof userId !== 'number') {
        logger.warn({ socketId: socket.id, userId }, 'Invalid userId in chat:join');
        return;
      }

      const room = `chat:${userId}`;
      socket.join(room);
      socket.userId = userId;
      
      logger.info({
        socketId: socket.id,
        adminUsername: socket.adminUsername,
        userId,
        room,
      }, 'Admin joined chat room');
    });

    // Обработка выхода из чата
    socket.on('chat:leave', (userId: number) => {
      if (!userId || typeof userId !== 'number') {
        return;
      }

      const room = `chat:${userId}`;
      socket.leave(room);
      
      if (socket.userId === userId) {
        socket.userId = undefined;
      }

      logger.info({
        socketId: socket.id,
        adminUsername: socket.adminUsername,
        userId,
        room,
      }, 'Admin left chat room');
    });

    // Обработка отключения
    socket.on('disconnect', (reason) => {
      logger.info({
        socketId: socket.id,
        adminUsername: socket.adminUsername,
        reason,
      }, 'Socket client disconnected');
    });

    // Обработка ошибок
    socket.on('error', (error) => {
      logger.error({
        socketId: socket.id,
        adminUsername: socket.adminUsername,
        error: error?.message || error,
      }, 'Socket error');
    });
  });

  logger.info('Socket.io service initialized');
};

// Функция для отправки нового сообщения в чат
export const emitNewMessage = (userId: number, message: any) => {
  if (!ioInstance) {
    logger.warn('Socket.io instance not initialized, skipping emitNewMessage');
    return;
  }

  const room = `chat:${userId}`;
  
  logger.debug({
    userId,
    room,
    messageId: message.id,
    direction: message.direction,
  }, 'Emitting new message to chat room');

  ioInstance.to(room).emit('chat:new-message', {
    userId,
    message,
  });
};

// Функция для уведомления об обновлении списка чатов
export const emitChatsUpdated = (userId?: number) => {
  if (!ioInstance) {
    logger.warn('Socket.io instance not initialized, skipping emitChatsUpdated');
    return;
  }

  logger.debug({
    userId,
  }, 'Emitting chats updated event');

  // Отправляем всем подключенным администраторам
  ioInstance.emit('chats:updated', {
    userId, // Если указан userId, значит обновление связано с конкретным чатом
  });
};

