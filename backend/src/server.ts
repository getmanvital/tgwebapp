import 'dotenv/config';
import express, { type Request, type Response, type NextFunction } from 'express';
import pino from 'pino';

import productsRouter from './routes/products.js';
import syncRouter from './routes/sync.js';
import { PHOTOS_DIR, db } from './database/schema.js';

const app = express();
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
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  // Включаем кэширование на 5 минут для ускорения
  res.setHeader('Cache-Control', 'public, max-age=300');
  next();
});

// Статическая раздача фото
app.use('/photos', express.static(PHOTOS_DIR, {
  maxAge: '1y', // Кэшируем фото на год
}));

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.use('/products', productsRouter);
app.use('/sync', syncRouter);

app.listen(PORT, () => {
  logger.info({ PORT }, 'Backend service started');
  logger.info({ dbPath: db.name }, 'Database initialized');
  logger.info({ photosDir: PHOTOS_DIR }, 'Photos directory ready');
});


