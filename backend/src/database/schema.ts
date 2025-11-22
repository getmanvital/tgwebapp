import { Pool, type QueryResult } from 'pg';
import path from 'path';
import fs from 'fs';

const PHOTOS_DIR = path.join(process.cwd(), 'data', 'photos');

// Создаем директорию для фото если её нет
if (!fs.existsSync(PHOTOS_DIR)) {
  fs.mkdirSync(PHOTOS_DIR, { recursive: true });
}

export { PHOTOS_DIR };

// Создаем Pool для подключения к PostgreSQL
const getDatabaseUrl = (): string => {
  // Используем DATABASE_URL если есть, иначе собираем из отдельных переменных
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  
  const host = process.env.DB_HOST || 'localhost';
  const port = process.env.DB_PORT || '5432';
  const database = process.env.DB_NAME || 'tgwebapp';
  const user = process.env.DB_USER || 'postgres';
  const password = process.env.DB_PASSWORD || '';
  
  return `postgresql://${user}:${password}@${host}:${port}/${database}`;
};

export const pool = new Pool({
  connectionString: getDatabaseUrl(),
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
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

      CREATE INDEX IF NOT EXISTS idx_products_collection_id ON products(collection_id);
      CREATE INDEX IF NOT EXISTS idx_products_title ON products(title);
      CREATE INDEX IF NOT EXISTS idx_collections_updated_at ON collections(updated_at);
      CREATE INDEX IF NOT EXISTS idx_products_updated_at ON products(updated_at);
      CREATE INDEX IF NOT EXISTS idx_users_id ON users(id);
      CREATE INDEX IF NOT EXISTS idx_users_last_seen_at ON users(last_seen_at);
      CREATE INDEX IF NOT EXISTS idx_collections_sort_order ON collections(sort_order);
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
    await pool.query(`
      INSERT INTO users (id, first_name, last_name, username, language_code, is_premium, photo_url, first_seen_at, last_seen_at, visit_count)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 1)
    `, [id, firstName, lastName, username, languageCode, isPremium, photoUrl, firstSeenAt, lastSeenAt]);
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
};
