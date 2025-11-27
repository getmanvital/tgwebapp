import { Router, type Request, type Response } from 'express';
import type { Express } from 'express';
import multer from 'multer';
import pino from 'pino';
import { messagesQueries, usersQueries, productsQueries } from '../database/schema.js';
import { sendMessage, sendPhoto, getTelegramFileLink, downloadTelegramFile } from '../services/telegramBot.js';
import { getPhotoPath } from '../services/photoService.js';
import { emitNewMessage, emitChatsUpdated } from '../services/socketService.js';
import { uploadChatImage, type StoredFile } from '../services/storageService.js';

const router = Router();
const logger = pino();
type MulterRequest = Request & {
  file?: Express.Multer.File;
};

const TELEGRAM_MANAGER_ID = process.env.TELEGRAM_MANAGER_ID;
const ADMIN_USERNAME = 'getmanvit';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000';
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_IMAGE_SIZE,
  },
});

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

const stripHtmlTags = (value: string): string => value.replace(/<[^>]*>/g, '');

const formatUserName = (user: any): string => {
  return user.username ? `@${user.username}` : `${user.first_name}${user.last_name ? ` ${user.last_name}` : ''}`;
};

const toAbsoluteUrl = (url: string): string => {
  if (!url) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  const base = BACKEND_URL.replace(/\/$/, '');
  return `${base}${url}`;
};

const inferMimeTypeFromFilePath = (filePath?: string | null): string => {
  if (!filePath) return 'image/jpeg';
  const extension = filePath.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    default:
      return 'image/jpeg';
  }
};

const buildAttachmentMeta = (storedFile: StoredFile, extra: Record<string, unknown> = {}) => ({
  provider: storedFile.provider,
  key: storedFile.key,
  relativePath: storedFile.relativePath,
  mimeType: storedFile.mimeType,
  size: storedFile.size,
  width: storedFile.metadata?.width ?? null,
  height: storedFile.metadata?.height ?? null,
  format: storedFile.metadata?.format ?? null,
  ...extra,
});

const parseAttachmentMeta = (raw: any) => {
  if (!raw) return null;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return raw;
};

// Webhook для получения обновлений от Telegram
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const update = req.body;
    
    logger.debug({
      updateId: update.update_id,
      hasMessage: !!update.message,
      messageType: update.message?.text
        ? 'text'
        : update.message?.photo?.length
          ? 'photo'
          : update.message
            ? 'other'
            : 'none',
    }, 'Webhook received');
    
    if (update.message) {
      const message = update.message;
      const user = message.from;

      if (!user) {
        return res.status(200).json({ ok: true });
      }

      logger.info({
        userId: user.id,
        username: user.username,
        firstName: user.first_name,
        hasText: !!message.text,
        hasPhoto: Array.isArray(message.photo) && message.photo.length > 0,
        managerId: TELEGRAM_MANAGER_ID,
      }, 'Processing Telegram update');

      if (user.id.toString() === TELEGRAM_MANAGER_ID) {
        logger.debug('Message from manager, skipping');
        return res.status(200).json({ ok: true });
      }

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

      const firstMessage = await messagesQueries.getFirstMessage(user.id);
      const userName = formatUserName(user);
      let telegramMessageId: number | null = null;

      if (message.text) {
        let messageText = `👤 <b>${userName}</b> (ID: ${user.id})\n\n💬 ${message.text}`;

        if (TELEGRAM_MANAGER_ID) {
          try {
            if (firstMessage?.telegram_message_id) {
              telegramMessageId = await sendMessage(
                parseInt(TELEGRAM_MANAGER_ID),
                messageText,
                'HTML',
                firstMessage.telegram_message_id
              );
            } else {
              telegramMessageId = await sendMessage(
                parseInt(TELEGRAM_MANAGER_ID),
                `🔔 <b>Новое сообщение от пользователя</b>\n\n${messageText}`,
                'HTML'
              );
            }
          } catch (forwardError: any) {
            logger.error(
              {
                error: forwardError?.message,
                status: forwardError?.response?.status,
                responseData: forwardError?.response?.data,
                userId: user.id,
                managerId: TELEGRAM_MANAGER_ID,
              },
              'Failed to forward user text message to Telegram manager',
            );
          }
        }

        const messageId = await messagesQueries.insert({
          userId: user.id,
          productId: null,
          direction: 'user_to_manager',
          telegramMessageId,
          content: message.text,
          sentAt: now,
        });

        const messageData = {
          id: messageId,
          direction: 'user_to_manager' as const,
          content: message.text,
          productId: null,
          productTitle: null,
          productPrice: null,
          sentAt: new Date(now).toISOString(),
          readAt: null,
          attachmentType: null,
          attachmentUrl: null,
          attachmentMeta: null,
        };

        emitNewMessage(user.id, messageData);
        emitChatsUpdated(user.id);
      } else if (Array.isArray(message.photo) && message.photo.length > 0) {
        const largestPhoto = message.photo.reduce((prev: any, curr: any) => {
          if (!prev) return curr;
          if ((curr.file_size || 0) > (prev.file_size || 0)) {
            return curr;
          }
          return prev;
        }, null);

        if (!largestPhoto) {
          logger.warn({ userId: user.id }, 'Photo array is empty, skipping');
          return res.status(200).json({ ok: true });
        }

        try {
          const fileInfo = await getTelegramFileLink(largestPhoto.file_id);
          const fileBuffer = await downloadTelegramFile(fileInfo.fileUrl);
          const mimeType = inferMimeTypeFromFilePath(fileInfo.filePath);

          const storedFile = await uploadChatImage({
            buffer: fileBuffer,
            mimeType,
            originalName: fileInfo.filePath,
            userId: user.id,
          });

          const caption = message.caption?.trim() || '';
          const managerCaption = caption
            ? `👤 <b>${userName}</b> (ID: ${user.id})\n\n💬 ${caption}`
            : `👤 <b>${userName}</b> (ID: ${user.id})\n\n🖼 Пользователь отправил фото`;

          if (TELEGRAM_MANAGER_ID) {
            try {
              if (firstMessage?.telegram_message_id) {
                telegramMessageId = await sendPhoto(
                  parseInt(TELEGRAM_MANAGER_ID),
                  largestPhoto.file_id,
                  managerCaption,
                  'HTML',
                  firstMessage.telegram_message_id
                );
              } else {
                telegramMessageId = await sendPhoto(
                  parseInt(TELEGRAM_MANAGER_ID),
                  largestPhoto.file_id,
                  `🔔 <b>Новое сообщение от пользователя</b>\n\n${managerCaption}`,
                  'HTML'
                );
              }
            } catch (forwardError: any) {
              logger.error(
                {
                  error: forwardError?.message,
                  status: forwardError?.response?.status,
                  responseData: forwardError?.response?.data,
                  userId: user.id,
                  managerId: TELEGRAM_MANAGER_ID,
                },
                'Failed to forward user photo to Telegram manager',
              );
            }
          }

          const attachmentMeta = buildAttachmentMeta(storedFile, {
            telegramFileId: largestPhoto.file_id,
            telegramFileUniqueId: largestPhoto.file_unique_id,
            telegramFileSize: largestPhoto.file_size,
          });

          const messageId = await messagesQueries.insert({
            userId: user.id,
            productId: null,
            direction: 'user_to_manager',
            telegramMessageId,
            content: caption || '[image]',
            sentAt: now,
            attachmentType: 'image',
            attachmentUrl: storedFile.url,
            attachmentMeta,
          });

          const messageData = {
            id: messageId,
            direction: 'user_to_manager' as const,
            content: caption || '[image]',
            productId: null,
            productTitle: null,
            productPrice: null,
            sentAt: new Date(now).toISOString(),
            readAt: null,
            attachmentType: 'image' as const,
            attachmentUrl: storedFile.url,
            attachmentMeta,
          };

          emitNewMessage(user.id, messageData);
          emitChatsUpdated(user.id);
        } catch (photoError: any) {
          logger.error(
            {
              error: photoError?.message,
              stack: photoError?.stack,
              userId: user.id,
            },
            'Failed to process incoming photo message',
          );
        }
      }
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
    const plainCaption = stripHtmlTags(caption);

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
    const messageId = await messagesQueries.insert({
      userId,
      productId: productExists ? productId : null, // Сохраняем product_id только если товар существует
      direction: 'user_to_manager',
      telegramMessageId,
      content: plainCaption,
      sentAt: now,
    });

    logger.info({
      userId,
      productId,
      messageId,
      telegramMessageId,
    }, 'Contact message saved to database');

    // Отправляем Socket.io событие для обновления чата в реальном времени
    const messageData = {
      id: messageId,
      direction: 'user_to_manager' as const,
      content: plainCaption,
      productId: productExists ? productId : null,
      productTitle: productTitle || null,
      productPrice: priceText || null,
      sentAt: new Date(now).toISOString(),
      readAt: null,
      attachmentType: null,
      attachmentUrl: null,
      attachmentMeta: null,
    };

    emitNewMessage(userId, messageData);
    emitChatsUpdated(userId);

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

    // ОТКЛЮЧАЕМ КЭШИРОВАНИЕ для API чатов - данные должны быть актуальными
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

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
        attachmentType: chat.attachment_type || null,
        attachmentUrl: chat.attachment_url || null,
        attachmentMeta: parseAttachmentMeta(chat.attachment_meta),
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

    // ОТКЛЮЧАЕМ КЭШИРОВАНИЕ для API истории чата - данные должны быть актуальными
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

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
      attachmentType: msg.attachment_type || null,
      attachmentUrl: msg.attachment_url || null,
      attachmentMeta: parseAttachmentMeta(msg.attachment_meta),
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

// Отправка изображения клиенту от менеджера (только для администратора)
router.post('/chats/:userId/send-image', upload.single('file'), async (req: MulterRequest, res: Response) => {
  try {
    const adminUsername = req.headers['x-admin-username'] as string | undefined;
    const userId = parseInt(req.params.userId, 10);

    if (!isAdmin(adminUsername)) {
      logger.warn({ adminUsername, ip: req.ip }, 'Unauthorized access attempt to /messages/chats/:userId/send-image');
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }

    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const uploadedFile = req.file;

    if (!uploadedFile) {
      return res.status(400).json({ error: 'Image file is required' });
    }

    if (!ALLOWED_IMAGE_TYPES.has(uploadedFile.mimetype)) {
      return res.status(400).json({ error: 'Unsupported image type. Use JPEG, PNG или WEBP' });
    }

    if (uploadedFile.size > MAX_IMAGE_SIZE) {
      return res.status(400).json({ error: 'Image is too large. Maximum 5MB' });
    }

    const caption = typeof req.body?.caption === 'string' ? req.body.caption.trim() : '';

    const user = await usersQueries.getById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const storedFile = await uploadChatImage({
      buffer: uploadedFile.buffer,
      mimeType: uploadedFile.mimetype,
      originalName: uploadedFile.originalname,
      userId,
    });

    const telegramMessageId = await sendPhoto(
      userId,
      toAbsoluteUrl(storedFile.url),
      caption || undefined,
      'HTML'
    );

    const now = Date.now();
    const attachmentMeta = buildAttachmentMeta(storedFile, { uploadedBy: 'manager' });

    const messageId = await messagesQueries.insert({
      userId,
      productId: null,
      direction: 'manager_to_user',
      telegramMessageId,
      content: caption || '[image]',
      sentAt: now,
      attachmentType: 'image',
      attachmentUrl: storedFile.url,
      attachmentMeta,
    });

    const messageData = {
      id: messageId,
      direction: 'manager_to_user' as const,
      content: caption || '[image]',
      productId: null,
      productTitle: null,
      productPrice: null,
      sentAt: new Date(now).toISOString(),
      readAt: null,
      attachmentType: 'image' as const,
      attachmentUrl: storedFile.url,
      attachmentMeta,
    };

    emitNewMessage(userId, messageData);
    emitChatsUpdated(userId);

    res.json({
      success: true,
      messageId: telegramMessageId,
      sentAt: new Date(now).toISOString(),
      attachmentUrl: storedFile.url,
    });
  } catch (error: any) {
    logger.error({
      error: error?.message,
      stack: error?.stack,
      userId: req.params.userId,
    }, 'Error sending image to client');
    res.status(500).json({
      error: 'Failed to send image',
      details: error?.response?.data?.description || error?.message,
    });
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
    const messageId = await messagesQueries.insert({
      userId,
      productId: null,
      direction: 'manager_to_user',
      telegramMessageId,
      content: message.trim(),
      sentAt: now,
    });

    // Отправляем Socket.io событие для обновления чата в реальном времени
    const messageData = {
      id: messageId,
      direction: 'manager_to_user' as const,
      content: message.trim(),
      productId: null,
      productTitle: null,
      productPrice: null,
      sentAt: new Date(now).toISOString(),
      readAt: null,
      attachmentType: null,
      attachmentUrl: null,
      attachmentMeta: null,
    };

    emitNewMessage(userId, messageData);
    emitChatsUpdated(userId);

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

