import { Router } from 'express';
import { syncCatalog, getSyncProgress, clearDatabase } from '@services/syncService.js';

const router = Router();

/**
 * Очищает базу данных
 * POST /sync/clear
 */
router.post('/clear', async (req, res, next) => {
  try {
    await clearDatabase();
    res.json({ success: true, message: 'База данных очищена' });
  } catch (error: any) {
    next(error);
  }
});

/**
 * Запускает синхронизацию каталога с VK
 * POST /sync/start
 */
router.post('/start', async (req, res, next) => {
  try {
    // Запускаем синхронизацию асинхронно (не блокируем ответ)
    syncCatalog().catch((error) => {
      console.error('Ошибка при синхронизации:', error);
    });

    res.json({
      success: true,
      message: 'Синхронизация запущена',
    });
  } catch (error: any) {
    if (error.message === 'Синхронизация уже выполняется') {
      return res.status(409).json({
        success: false,
        error: error.message,
      });
    }
    next(error);
  }
});

/**
 * Получает статус синхронизации
 * GET /sync/status
 */
router.get('/status', (req, res) => {
  const progress = getSyncProgress();
  res.json(progress);
});

export default router;

