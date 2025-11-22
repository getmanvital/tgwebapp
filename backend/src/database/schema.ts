import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'data', 'catalog.db');
const PHOTOS_DIR = path.join(process.cwd(), 'data', 'photos');

// Создаем директории если их нет
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
if (!fs.existsSync(PHOTOS_DIR)) {
  fs.mkdirSync(PHOTOS_DIR, { recursive: true });
}

export const db = new Database(DB_PATH);
export { PHOTOS_DIR };

// Включаем foreign keys
db.pragma('foreign_keys = ON');

// Создаем таблицы
db.exec(`
  CREATE TABLE IF NOT EXISTS collections (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    photo_url TEXT,
    count INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    updated_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY,
    collection_id INTEGER,
    title TEXT NOT NULL,
    description TEXT,
    price_amount INTEGER,
    price_currency TEXT,
    price_text TEXT,
    thumb_photo_url TEXT,
    photos_json TEXT,
    sizes_json TEXT,
    updated_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT,
    username TEXT,
    language_code TEXT,
    is_premium INTEGER DEFAULT 0,
    photo_url TEXT,
    first_seen_at INTEGER NOT NULL,
    last_seen_at INTEGER NOT NULL,
    visit_count INTEGER DEFAULT 1
  );

  CREATE INDEX IF NOT EXISTS idx_products_collection_id ON products(collection_id);
  CREATE INDEX IF NOT EXISTS idx_products_title ON products(title);
  CREATE INDEX IF NOT EXISTS idx_collections_updated_at ON collections(updated_at);
  CREATE INDEX IF NOT EXISTS idx_products_updated_at ON products(updated_at);
  CREATE INDEX IF NOT EXISTS idx_users_id ON users(id);
  CREATE INDEX IF NOT EXISTS idx_users_last_seen_at ON users(last_seen_at);
`);

// Миграция: добавляем поле sort_order если его нет (для существующих БД)
try {
  // Проверяем, существует ли колонка sort_order
  const tableInfo = db.prepare(`PRAGMA table_info(collections)`).all() as any[];
  const hasSortOrder = tableInfo.some((col: any) => col.name === 'sort_order');
  
  if (!hasSortOrder) {
    db.exec(`
      ALTER TABLE collections ADD COLUMN sort_order INTEGER DEFAULT 0;
    `);
    console.log('Migration: Added sort_order column to collections table');
    
    // Обновляем существующие записи, устанавливая sort_order = id (временное значение)
    db.exec(`
      UPDATE collections SET sort_order = id WHERE sort_order = 0;
    `);
  }
  
  // Создаем индекс для sort_order после миграции
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_collections_sort_order ON collections(sort_order);
  `);
} catch (error: any) {
  console.warn('Migration warning:', error.message);
}

// Подготовленные запросы для коллекций
export const collectionsQueries = {
  insert: db.prepare(`
    INSERT OR REPLACE INTO collections (id, title, photo_url, count, sort_order, updated_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `),
  
  getAll: db.prepare(`
    SELECT * FROM collections ORDER BY sort_order ASC, id ASC
  `),
  
  getById: db.prepare(`
    SELECT * FROM collections WHERE id = ?
  `),
  
  deleteAll: db.prepare(`
    DELETE FROM collections
  `),
  
  count: db.prepare(`
    SELECT COUNT(*) as count FROM collections
  `),
};

// Подготовленные запросы для товаров
export const productsQueries = {
  insert: db.prepare(`
    INSERT OR REPLACE INTO products (
      id, collection_id, title, description, price_amount, price_currency, price_text,
      thumb_photo_url, photos_json, sizes_json, updated_at, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),
  
  getByCollection: db.prepare(`
    SELECT * FROM products WHERE collection_id = ? ORDER BY id
  `),
  
  getAll: db.prepare(`
    SELECT * FROM products ORDER BY id
  `),
  
  getById: db.prepare(`
    SELECT * FROM products WHERE id = ?
  `),
  
  search: db.prepare(`
    SELECT * FROM products 
    WHERE title LIKE ? OR description LIKE ?
    ORDER BY id
  `),
  
  deleteByCollection: db.prepare(`
    DELETE FROM products WHERE collection_id = ?
  `),
  
  deleteAll: db.prepare(`
    DELETE FROM products
  `),
  
  count: db.prepare(`
    SELECT COUNT(*) as count FROM products
  `),
  
  countByCollection: db.prepare(`
    SELECT COUNT(*) as count FROM products WHERE collection_id = ?
  `),
};

// Подготовленные запросы для пользователей
export const usersQueries = {
  getById: db.prepare(`
    SELECT * FROM users WHERE id = ?
  `),
  
  insert: db.prepare(`
    INSERT INTO users (id, first_name, last_name, username, language_code, is_premium, photo_url, first_seen_at, last_seen_at, visit_count)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `),
  
  update: db.prepare(`
    UPDATE users SET
      first_name = ?,
      last_name = ?,
      username = ?,
      language_code = ?,
      is_premium = ?,
      photo_url = ?,
      last_seen_at = ?,
      visit_count = visit_count + 1
    WHERE id = ?
  `),
  
  getAll: db.prepare(`
    SELECT * FROM users ORDER BY last_seen_at DESC
  `),
  
  count: db.prepare(`
    SELECT COUNT(*) as count FROM users
  `),
};


