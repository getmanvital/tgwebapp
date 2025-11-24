import 'dotenv/config';
import compression from 'compression';
import express, { type Request, type Response, type NextFunction } from 'express';
import pino from 'pino';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import productsRouter from './routes/products.js';
import syncRouter from './routes/sync.js';
import authRouter from './routes/auth.js';
import messagesRouter from './routes/messages.js';
import { PHOTOS_DIR } from './database/schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Компрессия ответов (gzip/brotli) для уменьшения размера передаваемых данных
app.use(compression({
  filter: (req: Request, res: Response) => {
    // Сжимаем все ответы кроме изображений и других бинарных файлов
    if (req.headers['x-no-compression']) {
      return false;
    }
    // Используем compression filter по умолчанию
    return compression.filter(req, res);
  },
  level: 6, // Уровень сжатия (1-9, 6 - оптимальный баланс)
  threshold: 1024, // Минимальный размер для сжатия (1KB)
}));
const logger = pino({
  level: 'info',
  ...(process.env.NODE_ENV === 'development' ? {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss',
        ignore: 'pid,hostname',
      },
    },
  } : {}),
});
const PORT = Number(process.env.PORT) || 4000;


app.use(express.json());
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Admin-Username');
  // Включаем кэширование на 5 минут для ускорения
  res.setHeader('Cache-Control', 'public, max-age=300');
  
  // Обработка preflight запросов
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

// Статическая раздача фото с оптимизированными заголовками кэширования
app.use('/photos', express.static(PHOTOS_DIR, {
  maxAge: '1y', // Кэшируем фото на год
  etag: true, // Включаем ETag для условных запросов
  lastModified: true, // Включаем Last-Modified заголовок
  immutable: true, // Помечаем как неизменяемые ресурсы
}));

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.use('/auth', authRouter);
app.use('/products', productsRouter);
app.use('/sync', syncRouter);
app.use('/messages', messagesRouter);

// Раздача статики фронтенда (после всех API маршрутов)
const frontendDistPath = path.join(__dirname, '../../frontend/dist');

if (fs.existsSync(frontendDistPath)) {
  // Статические файлы фронтенда (JS, CSS, изображения и т.д.)
  app.use(express.static(frontendDistPath, {
    maxAge: '1y', // Кэшируем статику на год
    etag: true,
    lastModified: true,
    immutable: true,
  }));

  // Catch-all для фронтенда: все остальные GET запросы возвращают index.html
  // Это нужно для поддержки React Router и других SPA маршрутов
  // Express обработает API маршруты раньше, так что catch-all сработает только для неизвестных путей
  app.get('*', (req: Request, res: Response) => {
    // Проверяем, что это не статический файл (с расширением)
    if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|json|xml|txt)$/)) {
      return res.status(404).json({ error: 'Not found' });
    }

    const indexPath = path.join(frontendDistPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).json({ error: 'Frontend not found' });
    }
  });

  logger.info({ frontendPath: frontendDistPath }, 'Frontend static files enabled');
} else {
  // Если фронтенд не собран, показываем информационное сообщение
  app.get('/', (_req: Request, res: Response) => {
    res.json({
      message: 'Backend API is running',
      health: '/health',
      endpoints: ['/auth', '/products', '/sync', '/messages', '/photos'],
      note: 'Frontend is not built. Run "npm run build" in frontend directory.',
    });
  });
  logger.warn({ frontendPath: frontendDistPath }, 'Frontend not found, serving API info on root');
}

app.listen(PORT, () => {
  logger.info({ PORT }, 'Backend service started');
  logger.info('Database initialized');
  logger.info({ photosDir: PHOTOS_DIR }, 'Photos directory ready');
});


