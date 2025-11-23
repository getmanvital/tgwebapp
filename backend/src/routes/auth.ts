import { Router, type Request, type Response } from 'express';
import { usersQueries } from '../database/schema.js';
import pino from 'pino';

const router = Router();
const logger = pino();

const ADMIN_USERNAME = 'getmanvit';

// Функция нормализации username (убирает @ если есть)
const normalizeUsername = (username: string | undefined | null): string | null => {
  if (!username) return null;
  return username.startsWith('@') ? username.slice(1) : username;
};

// Функция проверки администратора
const isAdmin = (username: string | undefined | null): boolean => {
  const normalized = normalizeUsername(username);
  return normalized === ADMIN_USERNAME;
};

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}

router.post('/user', async (req: Request, res: Response) => {
  try {
    const userData = req.body as TelegramUser;
    
    logger.info({ 
      userId: userData.id,
      username: userData.username,
      firstName: userData.first_name,
      hasLastName: !!userData.last_name,
      hasPhoto: !!userData.photo_url,
      ip: req.ip
    }, 'Received user data save request');

    // Валидация обязательных полей
    if (!userData.id || !userData.first_name) {
      logger.warn({ 
        userData,
        hasId: !!userData.id,
        hasFirstName: !!userData.first_name,
        ip: req.ip
      }, 'Invalid user data: missing id or first_name');
      return res.status(400).json({ 
        error: 'Invalid user data: id and first_name are required' 
      });
    }

    const now = Date.now();
    
    // Проверяем, существует ли пользователь
    const existingUser = await usersQueries.getById(userData.id);

    if (existingUser) {
      // Обновляем существующего пользователя
      await usersQueries.update(
        userData.first_name,
        userData.last_name || null,
        userData.username || null,
        userData.language_code || null,
        userData.is_premium ? 1 : 0,
        userData.photo_url || null,
        now,
        userData.id
      );
      logger.info({ 
        userId: userData.id, 
        username: userData.username,
        visitCount: Number(existingUser.visit_count) + 1
      }, 'User updated');
    } else {
      // Создаем нового пользователя
      try {
        await usersQueries.insert(
          userData.id,
          userData.first_name,
          userData.last_name || null,
          userData.username || null,
          userData.language_code || null,
          userData.is_premium ? 1 : 0,
          userData.photo_url || null,
          now, // first_seen_at
          now  // last_seen_at
        );
        logger.info({ 
          userId: userData.id, 
          username: userData.username,
          firstName: userData.first_name,
          isPremium: userData.is_premium
        }, 'New user created successfully');
      } catch (insertError: any) {
        logger.error({
          error: insertError?.message,
          stack: insertError?.stack,
          code: insertError?.code,
          name: insertError?.name,
          userId: userData.id,
          username: userData.username,
        }, 'Failed to insert user into database');
        throw insertError;
      }
    }

    res.json({ success: true });
  } catch (error: any) {
    logger.error({ 
      error: error?.message,
      stack: error?.stack,
      code: error?.code,
      name: error?.name,
      userId: req.body?.id,
      username: req.body?.username
    }, 'Error saving user data');
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/users', async (req: Request, res: Response) => {
  try {
    // Проверка прав администратора
    // Express автоматически приводит заголовки к lowercase
    const adminUsername = req.headers['x-admin-username'] as string | undefined;
    
    logger.debug({
      adminUsername,
      ip: req.ip,
    }, 'GET /auth/users request');
    
    if (!isAdmin(adminUsername)) {
      logger.warn({ 
        adminUsername, 
        normalized: normalizeUsername(adminUsername),
        expected: ADMIN_USERNAME,
        ip: req.ip 
      }, 'Unauthorized access attempt to /auth/users');
      return res.status(403).json({ 
        error: 'Forbidden: Admin access required' 
      });
    }
    
    // Получаем общее количество пользователей для проверки
    const totalCount = await usersQueries.count();
    const users = await usersQueries.getAll();
    
    logger.info({ 
      totalCount, 
      fetchedCount: users.length,
      userIds: users.map(u => typeof u.id === 'string' ? parseInt(u.id, 10) : Number(u.id)),
      adminUsername,
    }, 'Fetching all users from database');
    
    // Преобразуем timestamp в читаемые даты и форматируем данные
    const formattedUsers = users.map(user => {
      // PostgreSQL возвращает BIGINT как строку, нужно преобразовать в число
      const firstSeenAt = typeof user.first_seen_at === 'string' 
        ? parseInt(user.first_seen_at, 10) 
        : Number(user.first_seen_at);
      const lastSeenAt = typeof user.last_seen_at === 'string' 
        ? parseInt(user.last_seen_at, 10) 
        : Number(user.last_seen_at);
      
      return {
        id: typeof user.id === 'string' ? parseInt(user.id, 10) : Number(user.id),
        first_name: user.first_name,
        last_name: user.last_name || null,
        username: user.username || null,
        language_code: user.language_code || null,
        is_premium: Boolean(user.is_premium),
        photo_url: user.photo_url || null,
        first_seen_at: new Date(firstSeenAt).toISOString(),
        last_seen_at: new Date(lastSeenAt).toISOString(),
        visit_count: typeof user.visit_count === 'string' ? parseInt(user.visit_count, 10) : Number(user.visit_count),
        // Добавляем человекочитаемые даты для удобства
        first_seen_readable: new Date(firstSeenAt).toLocaleString('ru-RU'),
        last_seen_readable: new Date(lastSeenAt).toLocaleString('ru-RU'),
      };
    });
    
    res.json({
      count: users.length,
      totalCount: totalCount, // Общее количество пользователей в базе
      users: formattedUsers
    });
  } catch (error: any) {
    logger.error({ 
      error: error?.message,
      stack: error?.stack,
      code: error?.code,
      name: error?.name
    }, 'Error fetching users');
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/user/:id', async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id, 10);
    
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    const user = await usersQueries.getById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Форматируем данные пользователя
    const firstSeenAt = typeof user.first_seen_at === 'string' 
      ? parseInt(user.first_seen_at, 10) 
      : Number(user.first_seen_at);
    const lastSeenAt = typeof user.last_seen_at === 'string' 
      ? parseInt(user.last_seen_at, 10) 
      : Number(user.last_seen_at);
    
    const formattedUser = {
      id: typeof user.id === 'string' ? parseInt(user.id, 10) : Number(user.id),
      first_name: user.first_name,
      last_name: user.last_name || null,
      username: user.username || null,
      language_code: user.language_code || null,
      is_premium: Boolean(user.is_premium),
      photo_url: user.photo_url || null,
      first_seen_at: new Date(firstSeenAt).toISOString(),
      last_seen_at: new Date(lastSeenAt).toISOString(),
      visit_count: typeof user.visit_count === 'string' ? parseInt(user.visit_count, 10) : Number(user.visit_count),
      first_seen_readable: new Date(firstSeenAt).toLocaleString('ru-RU'),
      last_seen_readable: new Date(lastSeenAt).toLocaleString('ru-RU'),
    };
    
    res.json(formattedUser);
  } catch (error: any) {
    logger.error({ 
      error: error?.message,
      stack: error?.stack,
      code: error?.code,
      name: error?.name,
      userId: req.params.id
    }, 'Error fetching user by ID');
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/users/count', async (req: Request, res: Response) => {
  try {
    // Проверка прав администратора
    const adminUsername = req.headers['x-admin-username'] as string | undefined;
    
    if (!isAdmin(adminUsername)) {
      logger.warn({ adminUsername, ip: req.ip }, 'Unauthorized access attempt to /auth/users/count');
      return res.status(403).json({ 
        error: 'Forbidden: Admin access required' 
      });
    }
    
    const totalCount = await usersQueries.count();
    
    logger.info({ totalCount }, 'User count requested');
    
    res.json({ count: totalCount });
  } catch (error: any) {
    logger.error({ 
      error: error?.message,
      stack: error?.stack,
      code: error?.code,
      name: error?.name
    }, 'Error fetching user count');
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/users/:id', async (req: Request, res: Response) => {
  try {
    // Проверка прав администратора
    const adminUsername = req.headers['x-admin-username'] as string | undefined;
    
    if (!isAdmin(adminUsername)) {
      logger.warn({ adminUsername, ip: req.ip }, 'Unauthorized access attempt to /auth/users/:id');
      return res.status(403).json({ 
        error: 'Forbidden: Admin access required' 
      });
    }
    
    const userId = parseInt(req.params.id, 10);
    
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    const user = await usersQueries.getById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Форматируем данные пользователя
    // PostgreSQL возвращает BIGINT как строку, нужно преобразовать в число
    const firstSeenAt = typeof user.first_seen_at === 'string' 
      ? parseInt(user.first_seen_at, 10) 
      : Number(user.first_seen_at);
    const lastSeenAt = typeof user.last_seen_at === 'string' 
      ? parseInt(user.last_seen_at, 10) 
      : Number(user.last_seen_at);
    
    const formattedUser = {
      id: typeof user.id === 'string' ? parseInt(user.id, 10) : Number(user.id),
      first_name: user.first_name,
      last_name: user.last_name || null,
      username: user.username || null,
      language_code: user.language_code || null,
      is_premium: Boolean(user.is_premium),
      photo_url: user.photo_url || null,
      first_seen_at: new Date(firstSeenAt).toISOString(),
      last_seen_at: new Date(lastSeenAt).toISOString(),
      visit_count: typeof user.visit_count === 'string' ? parseInt(user.visit_count, 10) : Number(user.visit_count),
      first_seen_readable: new Date(firstSeenAt).toLocaleString('ru-RU'),
      last_seen_readable: new Date(lastSeenAt).toLocaleString('ru-RU'),
    };
    
    res.json(formattedUser);
  } catch (error: any) {
    logger.error({ error }, 'Error fetching user');
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/users', async (req: Request, res: Response) => {
  try {
    // Проверка прав администратора
    const adminUsername = req.headers['x-admin-username'] as string | undefined;
    
    if (!isAdmin(adminUsername)) {
      logger.warn({ adminUsername, ip: req.ip }, 'Unauthorized attempt to delete all users');
      return res.status(403).json({ 
        error: 'Forbidden: Admin access required' 
      });
    }
    
    // Получаем количество пользователей перед удалением для логирования
    const countBefore = await usersQueries.count();
    
    // Удаляем всех пользователей
    await usersQueries.deleteAll();
    
    logger.warn({ 
      adminUsername,
      countBefore,
      ip: req.ip
    }, 'All users deleted from database');
    
    res.json({ 
      success: true, 
      message: `Deleted ${countBefore} users from database`,
      deletedCount: countBefore
    });
  } catch (error: any) {
    logger.error({ 
      error: error?.message,
      stack: error?.stack,
      code: error?.code,
      name: error?.name,
      adminUsername: req.headers['x-admin-username']
    }, 'Error deleting all users');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

