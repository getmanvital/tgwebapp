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

    // Валидация обязательных полей
    if (!userData.id || !userData.first_name) {
      logger.warn({ userData }, 'Invalid user data: missing id or first_name');
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
    } else {
      // Создаем нового пользователя
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
      logger.info({ userId: userData.id, username: userData.username }, 'New user created');
    }

    res.json({ success: true });
  } catch (error: any) {
    logger.error({ error }, 'Error saving user data');
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/users', async (req: Request, res: Response) => {
  try {
    // Проверка прав администратора
    // Express автоматически приводит заголовки к lowercase
    const adminUsername = req.headers['x-admin-username'] as string | undefined;
    
    if (!isAdmin(adminUsername)) {
      logger.warn({ adminUsername, ip: req.ip }, 'Unauthorized access attempt to /auth/users');
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
      userIds: users.map(u => u.id)
    }, 'Fetching all users from database');
    
    // Преобразуем timestamp в читаемые даты и форматируем данные
    const formattedUsers = users.map(user => ({
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name || null,
      username: user.username || null,
      language_code: user.language_code || null,
      is_premium: Boolean(user.is_premium),
      photo_url: user.photo_url || null,
      first_seen_at: new Date(user.first_seen_at).toISOString(),
      last_seen_at: new Date(user.last_seen_at).toISOString(),
      visit_count: user.visit_count,
      // Добавляем человекочитаемые даты для удобства
      first_seen_readable: new Date(user.first_seen_at).toLocaleString('ru-RU'),
      last_seen_readable: new Date(user.last_seen_at).toLocaleString('ru-RU'),
    }));
    
    res.json({
      count: users.length,
      users: formattedUsers
    });
  } catch (error: any) {
    logger.error({ error }, 'Error fetching users');
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
    const formattedUser = {
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name || null,
      username: user.username || null,
      language_code: user.language_code || null,
      is_premium: Boolean(user.is_premium),
      photo_url: user.photo_url || null,
      first_seen_at: new Date(user.first_seen_at).toISOString(),
      last_seen_at: new Date(user.last_seen_at).toISOString(),
      visit_count: user.visit_count,
      first_seen_readable: new Date(user.first_seen_at).toLocaleString('ru-RU'),
      last_seen_readable: new Date(user.last_seen_at).toLocaleString('ru-RU'),
    };
    
    res.json(formattedUser);
  } catch (error: any) {
    logger.error({ error }, 'Error fetching user');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

