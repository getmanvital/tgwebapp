import { Router, type Request, type Response } from 'express';
import { usersQueries } from '../database/schema.js';
import pino from 'pino';

const router = Router();
const logger = pino();

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}

router.post('/user', (req: Request, res: Response) => {
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
    const existingUser = usersQueries.getById.get(userData.id) as any;

    if (existingUser) {
      // Обновляем существующего пользователя
      usersQueries.update.run(
        userData.first_name,
        userData.last_name || null,
        userData.username || null,
        userData.language_code || null,
        userData.is_premium ? 1 : 0,
        userData.photo_url || null,
        now,
        userData.id
      );
      logger.info({ userId: userData.id }, 'User updated');
    } else {
      // Создаем нового пользователя
      usersQueries.insert.run(
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
      logger.info({ userId: userData.id }, 'New user created');
    }

    res.json({ success: true });
  } catch (error: any) {
    logger.error({ error }, 'Error saving user data');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

