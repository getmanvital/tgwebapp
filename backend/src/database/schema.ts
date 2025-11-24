import { Pool, type QueryResult } from 'pg';
import path from 'path';
import fs from 'fs';

const PHOTOS_DIR = path.join(process.cwd(), 'data', 'photos');

// Создаем директорию для фото если её нет
if (!fs.existsSync(PHOTOS_DIR)) {
  fs.mkdirSync(PHOTOS_DIR, { recursive: true });
}

export { PHOTOS_DIR };

// Проверка, является ли IP адрес приватным
const isPrivateIP = (host: string): boolean => {
  if (!host || host === 'localhost') return true;
  
  // Проверка IPv4 приватных диапазонов
  const privateRanges = [
    /^192\.168\./,           // 192.168.0.0/16
    /^10\./,                 // 10.0.0.0/8
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12
    /^127\./,                // 127.0.0.0/8 (loopback)
  ];
  
  return privateRanges.some(range => range.test(host));
};

// Создаем Pool для подключения к PostgreSQL
const getDatabaseUrl = (): { url: string; host: string; source: string } => {
  // ПРИОРИТЕТ 1: Проверяем явно указанные переменные POSTGRESQL_* или DB_*
  const host = process.env.POSTGRESQL_HOST || process.env.DB_HOST;
  
  if (host) {
    // Используем явно указанный хост (приватный IP имеет приоритет)
    const port = process.env.POSTGRESQL_PORT || process.env.DB_PORT || '5432';
    const database = process.env.POSTGRESQL_DBNAME || process.env.DB_NAME || 'tgwebapp';
    const user = process.env.POSTGRESQL_USER || process.env.DB_USER || 'postgres';
    const password = process.env.POSTGRESQL_PASSWORD || process.env.DB_PASSWORD || '';
    
    const url = `postgresql://${user}:${password}@${host}:${port}/${database}`;
    const source = process.env.POSTGRESQL_HOST ? 'POSTGRESQL_HOST' : 'DB_HOST';
    
    return { url, host, source };
  }
  
  // ПРИОРИТЕТ 2: Используем DATABASE_URL если отдельные переменные не установлены
  if (process.env.DATABASE_URL) {
    // Парсим host из DATABASE_URL для определения приватности
    try {
      const urlObj = new URL(process.env.DATABASE_URL);
      return { 
        url: process.env.DATABASE_URL, 
        host: urlObj.hostname, 
        source: 'DATABASE_URL' 
      };
    } catch {
      return { 
        url: process.env.DATABASE_URL, 
        host: 'unknown', 
        source: 'DATABASE_URL' 
      };
    }
  }
  
  // ПРИОРИТЕТ 3: Fallback на localhost
  return { 
    url: 'postgresql://postgres@localhost:5432/tgwebapp', 
    host: 'localhost', 
    source: 'default' 
  };
};

// Получаем конфигурацию подключения
const dbConfig = getDatabaseUrl();

// Определяем настройки SSL
const getSSLConfig = (): boolean | object => {
  // ПРИОРИТЕТ 1: Явное указание через переменную DB_SSL
  if (process.env.DB_SSL !== undefined) {
    const dbSsl = process.env.DB_SSL.toLowerCase();
    if (dbSsl === 'true' || dbSsl === '1') {
      return { rejectUnauthorized: false };
    }
    if (dbSsl === 'false' || dbSsl === '0') {
      return false;
    }
  }
  
  // ПРИОРИТЕТ 2: Автоматическое отключение SSL для приватных IP
  if (isPrivateIP(dbConfig.host)) {
    return false;
  }
  
  // ПРИОРИТЕТ 3: SSL для публичных IP в production
  if (process.env.NODE_ENV === 'production') {
    return { rejectUnauthorized: false };
  }
  
  // По умолчанию SSL отключен
  return false;
};

// Логирование конфигурации подключения для отладки
console.log('[Database] Connection config:', {
  host: dbConfig.host,
  source: dbConfig.source,
  ssl: getSSLConfig() !== false ? 'enabled' : 'disabled',
  isPrivateIP: isPrivateIP(dbConfig.host),
  nodeEnv: process.env.NODE_ENV,
});

export const pool = new Pool({
  connectionString: dbConfig.url,
  ssl: getSSLConfig(),
});

// Инициализация базы данных
const initDatabase = async (): Promise<void> => {
  const client = await pool.connect();
  try {
    // Создаем таблицы
    await client.query(`
      CREATE TABLE IF NOT EXISTS collections (
        id BIGINT PRIMARY KEY,
        title TEXT NOT NULL,
        photo_url TEXT,
        count INTEGER DEFAULT 0,
        sort_order INTEGER DEFAULT 0,
        updated_at BIGINT NOT NULL,
        created_at BIGINT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS products (
        id BIGINT PRIMARY KEY,
        collection_id BIGINT,
        title TEXT NOT NULL,
        description TEXT,
        price_amount INTEGER,
        price_currency TEXT,
        price_text TEXT,
        thumb_photo_url TEXT,
        photos_json TEXT,
        sizes_json TEXT,
        updated_at BIGINT NOT NULL,
        created_at BIGINT NOT NULL,
        FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS users (
        id BIGINT PRIMARY KEY,
        first_name TEXT NOT NULL,
        last_name TEXT,
        username TEXT,
        language_code TEXT,
        is_premium INTEGER DEFAULT 0,
        photo_url TEXT,
        first_seen_at BIGINT NOT NULL,
        last_seen_at BIGINT NOT NULL,
        visit_count INTEGER DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL,
        product_id BIGINT,
        direction TEXT NOT NULL CHECK (direction IN ('user_to_manager', 'manager_to_user')),
        telegram_message_id BIGINT,
        content TEXT NOT NULL,
        sent_at BIGINT NOT NULL,
        read_at BIGINT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
      );

      CREATE INDEX IF NOT EXISTS idx_products_collection_id ON products(collection_id);
      CREATE INDEX IF NOT EXISTS idx_products_title ON products(title);
      CREATE INDEX IF NOT EXISTS idx_collections_updated_at ON collections(updated_at);
      CREATE INDEX IF NOT EXISTS idx_products_updated_at ON products(updated_at);
      CREATE INDEX IF NOT EXISTS idx_users_id ON users(id);
      CREATE INDEX IF NOT EXISTS idx_users_last_seen_at ON users(last_seen_at);
      CREATE INDEX IF NOT EXISTS idx_collections_sort_order ON collections(sort_order);
      CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
      CREATE INDEX IF NOT EXISTS idx_messages_product_id ON messages(product_id);
      CREATE INDEX IF NOT EXISTS idx_messages_sent_at ON messages(sent_at DESC);
      CREATE INDEX IF NOT EXISTS idx_messages_read_at ON messages(read_at) WHERE read_at IS NULL;
    `);

    // Миграция: проверяем наличие колонки sort_order
    const columnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'collections' AND column_name = 'sort_order'
    `);
    
    if (columnCheck.rows.length === 0) {
      await client.query(`
        ALTER TABLE collections ADD COLUMN sort_order INTEGER DEFAULT 0;
      `);
      console.log('Migration: Added sort_order column to collections table');
      
      await client.query(`
        UPDATE collections SET sort_order = id WHERE sort_order = 0;
      `);
    }
  } finally {
    client.release();
  }
};

// Инициализируем базу данных при загрузке модуля
initDatabase().catch((error) => {
  console.error('Error initializing database:', error);
});

// Подготовленные запросы для коллекций
export const collectionsQueries = {
  insert: async (id: number, title: string, photoUrl: string | null, count: number, sortOrder: number, updatedAt: number, createdAt: number): Promise<void> => {
    await pool.query(`
      INSERT INTO collections (id, title, photo_url, count, sort_order, updated_at, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        photo_url = EXCLUDED.photo_url,
        count = EXCLUDED.count,
        sort_order = EXCLUDED.sort_order,
        updated_at = EXCLUDED.updated_at
    `, [id, title, photoUrl, count, sortOrder, updatedAt, createdAt]);
  },
  
  getAll: async (): Promise<any[]> => {
    const result = await pool.query(`
      SELECT * FROM collections ORDER BY sort_order ASC, id ASC
    `);
    return result.rows;
  },
  
  getById: async (id: number): Promise<any | null> => {
    const result = await pool.query(`
      SELECT * FROM collections WHERE id = $1
    `, [id]);
    return result.rows[0] || null;
  },
  
  deleteAll: async (): Promise<void> => {
    await pool.query(`DELETE FROM collections`);
  },
  
  count: async (): Promise<number> => {
    const result = await pool.query(`SELECT COUNT(*) as count FROM collections`);
    return parseInt(result.rows[0].count, 10);
  },
};

// Подготовленные запросы для товаров
export const productsQueries = {
  insert: async (
    id: number,
    collectionId: number | null,
    title: string,
    description: string | null,
    priceAmount: number | null,
    priceCurrency: string | null,
    priceText: string | null,
    thumbPhotoUrl: string | null,
    photosJson: string | null,
    sizesJson: string | null,
    updatedAt: number,
    createdAt: number
  ): Promise<void> => {
    await pool.query(`
      INSERT INTO products (
        id, collection_id, title, description, price_amount, price_currency, price_text,
        thumb_photo_url, photos_json, sizes_json, updated_at, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (id) DO UPDATE SET
        collection_id = EXCLUDED.collection_id,
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        price_amount = EXCLUDED.price_amount,
        price_currency = EXCLUDED.price_currency,
        price_text = EXCLUDED.price_text,
        thumb_photo_url = EXCLUDED.thumb_photo_url,
        photos_json = EXCLUDED.photos_json,
        sizes_json = EXCLUDED.sizes_json,
        updated_at = EXCLUDED.updated_at
    `, [id, collectionId, title, description, priceAmount, priceCurrency, priceText, thumbPhotoUrl, photosJson, sizesJson, updatedAt, createdAt]);
  },
  
  getByCollection: async (collectionId: number): Promise<any[]> => {
    const result = await pool.query(`
      SELECT * FROM products WHERE collection_id = $1 ORDER BY id
    `, [collectionId]);
    return result.rows;
  },
  
  getAll: async (): Promise<any[]> => {
    const result = await pool.query(`SELECT * FROM products ORDER BY id`);
    return result.rows;
  },
  
  getById: async (id: number): Promise<any | null> => {
    const result = await pool.query(`SELECT * FROM products WHERE id = $1`, [id]);
    return result.rows[0] || null;
  },
  
  search: async (query: string): Promise<any[]> => {
    const searchPattern = `%${query}%`;
    const result = await pool.query(`
      SELECT * FROM products 
      WHERE title LIKE $1 OR description LIKE $2
      ORDER BY id
    `, [searchPattern, searchPattern]);
    return result.rows;
  },
  
  deleteByCollection: async (collectionId: number): Promise<void> => {
    await pool.query(`DELETE FROM products WHERE collection_id = $1`, [collectionId]);
  },
  
  deleteAll: async (): Promise<void> => {
    await pool.query(`DELETE FROM products`);
  },
  
  count: async (): Promise<number> => {
    const result = await pool.query(`SELECT COUNT(*) as count FROM products`);
    return parseInt(result.rows[0].count, 10);
  },
  
  countByCollection: async (collectionId: number): Promise<number> => {
    const result = await pool.query(`SELECT COUNT(*) as count FROM products WHERE collection_id = $1`, [collectionId]);
    return parseInt(result.rows[0].count, 10);
  },
};

// Подготовленные запросы для пользователей
export const usersQueries = {
  getById: async (id: number): Promise<any | null> => {
    const result = await pool.query(`SELECT * FROM users WHERE id = $1`, [id]);
    return result.rows[0] || null;
  },
  
  insert: async (
    id: number,
    firstName: string,
    lastName: string | null,
    username: string | null,
    languageCode: string | null,
    isPremium: number,
    photoUrl: string | null,
    firstSeenAt: number,
    lastSeenAt: number
  ): Promise<void> => {
    const result = await pool.query(`
      INSERT INTO users (id, first_name, last_name, username, language_code, is_premium, photo_url, first_seen_at, last_seen_at, visit_count)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 1)
      RETURNING id
    `, [id, firstName, lastName, username, languageCode, isPremium, photoUrl, firstSeenAt, lastSeenAt]);
    
    // Проверяем, что запись действительно создана
    if (!result.rows || result.rows.length === 0) {
      throw new Error(`Failed to insert user ${id}: no rows returned`);
    }
  },
  
  update: async (
    firstName: string,
    lastName: string | null,
    username: string | null,
    languageCode: string | null,
    isPremium: number,
    photoUrl: string | null,
    lastSeenAt: number,
    id: number
  ): Promise<void> => {
    await pool.query(`
      UPDATE users SET
        first_name = $1,
        last_name = $2,
        username = $3,
        language_code = $4,
        is_premium = $5,
        photo_url = $6,
        last_seen_at = $7,
        visit_count = visit_count + 1
      WHERE id = $8
    `, [firstName, lastName, username, languageCode, isPremium, photoUrl, lastSeenAt, id]);
  },
  
  getAll: async (): Promise<any[]> => {
    const result = await pool.query(`SELECT * FROM users ORDER BY last_seen_at DESC`);
    return result.rows;
  },
  
  count: async (): Promise<number> => {
    const result = await pool.query(`SELECT COUNT(*) as count FROM users`);
    return parseInt(result.rows[0].count, 10);
  },
  
  deleteAll: async (): Promise<void> => {
    await pool.query(`DELETE FROM users`);
  },
};

// Подготовленные запросы для сообщений
export const messagesQueries = {
  insert: async (
    userId: number,
    productId: number | null,
    direction: 'user_to_manager' | 'manager_to_user',
    telegramMessageId: number | null,
    content: string,
    sentAt: number
  ): Promise<number> => {
    const result = await pool.query(`
      INSERT INTO messages (user_id, product_id, direction, telegram_message_id, content, sent_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `, [userId, productId, direction, telegramMessageId, content, sentAt]);
    return result.rows[0].id;
  },

  getByUserId: async (userId: number): Promise<any[]> => {
    const result = await pool.query(`
      SELECT m.*, p.title as product_title, p.price_text as product_price
      FROM messages m
      LEFT JOIN products p ON m.product_id = p.id
      WHERE m.user_id = $1
      ORDER BY m.sent_at ASC
    `, [userId]);
    return result.rows;
  },

  getFirstMessage: async (userId: number): Promise<any | null> => {
    const result = await pool.query(`
      SELECT * FROM messages 
      WHERE user_id = $1 
      ORDER BY sent_at ASC 
      LIMIT 1
    `, [userId]);
    return result.rows[0] || null;
  },

  getUnreadCount: async (userId: number): Promise<number> => {
    const result = await pool.query(`
      SELECT COUNT(*) as count 
      FROM messages 
      WHERE user_id = $1 
        AND direction = 'user_to_manager' 
        AND read_at IS NULL
    `, [userId]);
    return parseInt(result.rows[0].count, 10);
  },

  markAsRead: async (messageIds: number[]): Promise<void> => {
    if (messageIds.length === 0) return;
    const now = Date.now();
    await pool.query(`
      UPDATE messages 
      SET read_at = $1 
      WHERE id = ANY($2::int[])
    `, [now, messageIds]);
  },

  getActiveChats: async (): Promise<any[]> => {
    const result = await pool.query(`
      WITH last_messages AS (
        SELECT DISTINCT ON (user_id) 
          id,
          user_id,
          content,
          direction,
          sent_at,
          product_id
        FROM messages
        ORDER BY user_id, sent_at DESC
      )
      SELECT 
        u.id as user_id,
        u.first_name,
        u.last_name,
        u.username,
        u.photo_url,
        lm.id as last_message_id,
        lm.content as last_message_content,
        lm.direction as last_message_direction,
        lm.sent_at as last_message_time,
        lm.product_id,
        p.title as product_title,
        (SELECT COUNT(*) FROM messages WHERE user_id = u.id AND direction = 'user_to_manager' AND read_at IS NULL) as unread_count
      FROM last_messages lm
      INNER JOIN users u ON lm.user_id = u.id
      LEFT JOIN products p ON lm.product_id = p.id
      ORDER BY lm.sent_at DESC
    `);
    return result.rows;
  },

  getLastMessage: async (userId: number): Promise<any | null> => {
    const result = await pool.query(`
      SELECT * FROM messages 
      WHERE user_id = $1 
      ORDER BY sent_at DESC 
      LIMIT 1
    `, [userId]);
    return result.rows[0] || null;
  },

  updateTelegramMessageId: async (messageId: number, telegramMessageId: number): Promise<void> => {
    await pool.query(`
      UPDATE messages 
      SET telegram_message_id = $1 
      WHERE id = $2
    `, [telegramMessageId, messageId]);
  },
};
