import { Router, type Request, type Response } from 'express';
import { messagesQueries, usersQueries, productsQueries, pool } from '../database/schema.js';
import { sendMessage, sendPhoto } from '../services/telegramBot.js';
import { getPhotoPath } from '../services/photoService.js';
import pino from 'pino';

const router = Router();
const logger = pino();

const TELEGRAM_MANAGER_ID = process.env.TELEGRAM_MANAGER_ID;
const ADMIN_USERNAME = 'getmanvit';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000';

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

// Webhook для получения обновлений от Telegram
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const update = req.body;
    
    logger.debug({
      updateId: update.update_id,
      hasMessage: !!update.message,
      messageType: update.message?.text ? 'text' : update.message ? 'other' : 'none',
    }, 'Webhook received');
    
    // Обработка текстовых сообщений от клиентов
    if (update.message && update.message.text) {
      const message = update.message;
      const chat = message.chat;
      const user = message.from;

      logger.info({
        userId: user.id,
        username: user.username,
        firstName: user.first_name,
        messageText: message.text?.substring(0, 100),
        managerId: TELEGRAM_MANAGER_ID,
      }, 'Processing message from user');

      // Пропускаем сообщения от бота самого себя и от менеджера
      if (user.id.toString() === TELEGRAM_MANAGER_ID) {
        logger.debug('Message from manager, skipping');
        // Это сообщение от менеджера - обработаем его позже
        return res.status(200).json({ ok: true });
      }

      // Сохраняем/обновляем данные пользователя
      const now = Date.now();
      const existingUser = await usersQueries.getById(user.id);
      
      if (existingUser) {
        await usersQueries.update(
          user.first_name,
          user.last_name || null,
          user.username || null,
          user.language_code || null,
          user.is_premium ? 1 : 0,
          user.photo_url || null,
          now,
          user.id
        );
      } else {
        await usersQueries.insert(
          user.id,
          user.first_name,
          user.last_name || null,
          user.username || null,
          user.language_code || null,
          user.is_premium ? 1 : 0,
          user.photo_url || null,
          now,
          now
        );
      }

      // Проверяем, есть ли уже сообщения от этого пользователя
      const firstMessage = await messagesQueries.getFirstMessage(user.id);
      
      const userName = user.username ? `@${user.username}` : `${user.first_name}${user.last_name ? ` ${user.last_name}` : ''}`;
      
      let messageText = `👤 <b>${userName}</b> (ID: ${user.id})\n\n💬 ${message.text}`;
      
      let telegramMessageId: number | null = null;
      
      if (TELEGRAM_MANAGER_ID) {
        if (firstMessage && firstMessage.telegram_message_id) {
          // Есть первое сообщение - отправляем как reply
          telegramMessageId = await sendMessage(
            parseInt(TELEGRAM_MANAGER_ID),
            messageText,
            'HTML',
            firstMessage.telegram_message_id
          );
        } else {
          // Первое сообщение - отправляем новое с информацией о пользователе
          telegramMessageId = await sendMessage(
            parseInt(TELEGRAM_MANAGER_ID),
            `🔔 <b>Новое сообщение от пользователя</b>\n\n${messageText}`,
            'HTML'
          );
        }
      }

      // Сохраняем сообщение в БД с ID сообщения от Telegram
      const messageId = await messagesQueries.insert(
        user.id,
        null, // product_id для обычных сообщений
        'user_to_manager',
        telegramMessageId,
        message.text,
        now
      );

      logger.info({
        userId: user.id,
        telegramMessageId,
        messageId,
      }, 'Message saved to database');
    }

    res.status(200).json({ ok: true });
  } catch (error: any) {
    logger.error({
      error: error?.message,
      stack: error?.stack,
      update: req.body,
    }, 'Error processing webhook');
    res.status(200).json({ ok: true }); // Всегда возвращаем 200 для Telegram
  }
});

// Отправка уведомления о товаре менеджеру
router.post('/contact', async (req: Request, res: Response) => {
  try {
    logger.debug({ body: req.body }, 'Contact request received');
    
    const { userId, productId, productTitle, productPrice } = req.body;

    if (!userId || !productId || !productTitle) {
      logger.warn({
        hasUserId: !!userId,
        hasProductId: !!productId,
        hasProductTitle: !!productTitle,
        body: req.body,
      }, 'Missing required fields in contact request');
      return res.status(400).json({
        error: 'Missing required fields: userId, productId, productTitle',
      });
    }

    if (!TELEGRAM_MANAGER_ID) {
      logger.error('TELEGRAM_MANAGER_ID is not configured');
      return res.status(500).json({ error: 'Manager ID not configured' });
    }

    logger.info({
      userId,
      productId,
      productTitle,
      productPrice,
    }, 'Processing contact request');

    // Получаем данные пользователя
    const user = await usersQueries.getById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Получаем информацию о товаре
    const product = await productsQueries.getById(productId);
    
    // Проверяем существование товара в БД
    const productExists = !!product;
    if (!productExists) {
      logger.warn({
        userId,
        productId,
        productTitle,
      }, 'Product not found in database, will save message without product_id');
    }
    
    // Получаем фото товара
    let photoUrl: string | null = null;
    const localPhotoPath = getPhotoPath(productId, 'thumb');
    
    if (localPhotoPath) {
      // Локальное фото - формируем полный URL
      photoUrl = `${BACKEND_URL}${localPhotoPath}`;
    } else if (product?.thumb_photo_url) {
      // Используем URL из БД
      if (product.thumb_photo_url.startsWith('/')) {
        photoUrl = `${BACKEND_URL}${product.thumb_photo_url}`;
      } else if (product.thumb_photo_url.startsWith('http')) {
        photoUrl = product.thumb_photo_url;
      }
    }

    // Формируем сообщение
    const userName = user.username ? `@${user.username}` : `${user.first_name}${user.last_name ? ` ${user.last_name}` : ''}`;
    const priceText = productPrice || product?.price_text || 'Не указана';
    
    const caption = `🔔 <b>Новый запрос от пользователя</b>

👤 <b>Пользователь:</b> ${userName}
🆔 <b>User ID:</b> ${userId}
📦 <b>Товар:</b> ${productTitle} (ID: ${productId})
💰 <b>Цена:</b> ${priceText}

💬 Клиент заинтересован в этом товаре`;

    // Проверяем, есть ли уже переписка с пользователем
    const firstMessage = await messagesQueries.getFirstMessage(userId);
    const managerId = parseInt(TELEGRAM_MANAGER_ID);

    let telegramMessageId: number;

    if (photoUrl) {
      // Отправляем с фото
      if (firstMessage?.telegram_message_id) {
        // Отправляем как reply к первому сообщению
        telegramMessageId = await sendPhoto(
          managerId,
          photoUrl,
          caption,
          'HTML',
          firstMessage.telegram_message_id
        );
      } else {
        // Первое сообщение
        telegramMessageId = await sendPhoto(
          managerId,
          photoUrl,
          caption,
          'HTML'
        );
      }
    } else {
      // Отправляем без фото
      if (firstMessage?.telegram_message_id) {
        telegramMessageId = await sendMessage(
          managerId,
          caption,
          'HTML',
          firstMessage.telegram_message_id
        );
      } else {
        telegramMessageId = await sendMessage(
          managerId,
          caption,
          'HTML'
        );
      }
    }

    // Сохраняем сообщение в БД
    // Используем product_id только если товар существует в БД, иначе null
    const now = Date.now();
    const messageId = await messagesQueries.insert(
      userId,
      productExists ? productId : null, // Сохраняем product_id только если товар существует
      'user_to_manager',
      telegramMessageId,
      caption.replace(/<[^>]*>/g, ''), // Убираем HTML теги для хранения
      now
    );

    logger.info({
      userId,
      productId,
      messageId,
      telegramMessageId,
    }, 'Contact message saved to database');

    res.json({
      success: true,
      messageId: telegramMessageId,
      sentAt: new Date(now).toISOString(),
    });
  } catch (error: any) {
    logger.error({
      error: error?.message,
      stack: error?.stack,
      userId: req.body?.userId,
      productId: req.body?.productId,
    }, 'Error sending contact message');
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Получение списка активных чатов (только для администратора)
router.get('/chats', async (req: Request, res: Response) => {
  try {
    const adminUsername = req.headers['x-admin-username'] as string | undefined;

    logger.debug({
      adminUsername,
      ip: req.ip,
      headers: req.headers,
    }, 'GET /chats request');

    if (!isAdmin(adminUsername)) {
      logger.warn({ adminUsername, ip: req.ip }, 'Unauthorized access attempt to /messages/chats');
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }

    logger.info('Fetching active chats');
    const chats = await messagesQueries.getActiveChats();
    logger.info({ 
      count: chats?.length || 0,
      chats: chats?.slice(0, 3), // Логируем первые 3 чата для отладки
    }, 'Active chats fetched');

    // Форматируем данные
    const formattedChats = chats.map((chat: any) => ({
      userId: chat.user_id,
      userName: chat.username ? `@${chat.username}` : chat.first_name,
      firstName: chat.first_name,
      lastName: chat.last_name || null,
      username: chat.username || null,
      photoUrl: chat.photo_url || null,
      unreadCount: parseInt(chat.unread_count || '0', 10),
      lastMessage: {
        id: chat.last_message_id,
        content: chat.last_message_content,
        direction: chat.last_message_direction,
        sentAt: new Date(parseInt(chat.last_message_time, 10)).toISOString(),
      },
      product: chat.product_id ? {
        id: chat.product_id,
        title: chat.product_title,
      } : null,
    }));

    res.json({ chats: formattedChats });
  } catch (error: any) {
    logger.error({
      error: error?.message,
      stack: error?.stack,
    }, 'Error fetching chats');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Получение истории чата с пользователем (только для администратора)
router.get('/chats/:userId', async (req: Request, res: Response) => {
  try {
    const adminUsername = req.headers['x-admin-username'] as string | undefined;
    const userId = parseInt(req.params.userId, 10);

    if (!isAdmin(adminUsername)) {
      logger.warn({ adminUsername, ip: req.ip }, 'Unauthorized access attempt to /messages/chats/:userId');
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }

    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Получаем историю сообщений
    const messages = await messagesQueries.getByUserId(userId);

    // Форматируем сообщения
    const formattedMessages = messages.map((msg: any) => ({
      id: msg.id,
      direction: msg.direction,
      content: msg.content,
      productId: msg.product_id ? parseInt(msg.product_id, 10) : null,
      productTitle: msg.product_title || null,
      productPrice: msg.product_price || null,
      sentAt: new Date(parseInt(msg.sent_at, 10)).toISOString(),
      readAt: msg.read_at ? new Date(parseInt(msg.read_at, 10)).toISOString() : null,
    }));

    // Отмечаем сообщения как прочитанные
    const unreadMessageIds = messages
      .filter((m: any) => m.direction === 'user_to_manager' && !m.read_at)
      .map((m: any) => m.id);

    if (unreadMessageIds.length > 0) {
      await messagesQueries.markAsRead(unreadMessageIds);
    }

    // Получаем данные пользователя
    const user = await usersQueries.getById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name || null,
        username: user.username || null,
        photoUrl: user.photo_url || null,
      },
      messages: formattedMessages,
    });
  } catch (error: any) {
    logger.error({
      error: error?.message,
      stack: error?.stack,
      userId: req.params.userId,
    }, 'Error fetching chat history');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Отправка сообщения клиенту от менеджера (только для администратора)
router.post('/chats/:userId/send', async (req: Request, res: Response) => {
  try {
    const adminUsername = req.headers['x-admin-username'] as string | undefined;
    const userId = parseInt(req.params.userId, 10);
    const { message } = req.body;

    if (!isAdmin(adminUsername)) {
      logger.warn({ adminUsername, ip: req.ip }, 'Unauthorized access attempt to /messages/chats/:userId/send');
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }

    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required and cannot be empty' });
    }

    // Проверяем существование пользователя
    const user = await usersQueries.getById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Отправляем сообщение клиенту через Telegram Bot API
    const telegramMessageId = await sendMessage(
      userId,
      message.trim(),
      'HTML'
    );

    // Сохраняем сообщение в БД
    const now = Date.now();
    await messagesQueries.insert(
      userId,
      null,
      'manager_to_user',
      telegramMessageId,
      message.trim(),
      now
    );

    res.json({
      success: true,
      messageId: telegramMessageId,
      sentAt: new Date(now).toISOString(),
    });
  } catch (error: any) {
    logger.error({
      error: error?.message,
      stack: error?.stack,
      userId: req.params.userId,
      response: error?.response?.data,
    }, 'Error sending message to client');
    res.status(500).json({
      error: 'Failed to send message',
      details: error?.response?.data?.description || error?.message,
    });
  }
});

export default router;

