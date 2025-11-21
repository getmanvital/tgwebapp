import { fetchCollections, fetchAllProducts, fetchProductById } from './vkClient.js';
import { collectionsQueries, productsQueries, PHOTOS_DIR } from '../database/schema.js';
import { downloadAndSavePhoto, getAllProductPhotos, getPhotoPath } from './photoService.js';
import { parseSizes } from '../utils/sizeParser.js';
import fs from 'fs';
import path from 'path';

interface SyncProgress {
  status: 'idle' | 'syncing' | 'completed' | 'error';
  progress: {
    collections: { current: number; total: number };
    products: { current: number; total: number };
    photos: { current: number; total: number };
  };
  message?: string;
  error?: string;
  startedAt?: number;
  completedAt?: number;
}

let syncProgress: SyncProgress = {
  status: 'idle',
  progress: {
    collections: { current: 0, total: 0 },
    products: { current: 0, total: 0 },
    photos: { current: 0, total: 0 },
  },
};

/**
 * Получает текущий прогресс синхронизации
 */
export const getSyncProgress = (): SyncProgress => {
  return { ...syncProgress };
};

/**
 * Очищает базу данных и удаляет все фото
 */
export const clearDatabase = async (): Promise<void> => {
  console.log('Очистка базы данных...');
  
  // Удаляем все товары (каскадно удалятся из-за foreign key)
  productsQueries.deleteAll.run();
  console.log('Товары удалены');
  
  // Удаляем все коллекции
  collectionsQueries.deleteAll.run();
  console.log('Коллекции удалены');
  
  // Удаляем все фото
  if (fs.existsSync(PHOTOS_DIR)) {
    const productDirs = fs.readdirSync(PHOTOS_DIR);
    for (const dir of productDirs) {
      const productDir = path.join(PHOTOS_DIR, dir);
      if (fs.statSync(productDir).isDirectory()) {
        fs.rmSync(productDir, { recursive: true, force: true });
      }
    }
    console.log(`Удалено ${productDirs.length} директорий с фото`);
  }
  
  console.log('База данных очищена');
};

/**
 * Синхронизирует каталог с VK
 */
export const syncCatalog = async (): Promise<void> => {
  if (syncProgress.status === 'syncing') {
    throw new Error('Синхронизация уже выполняется');
  }

  syncProgress = {
    status: 'syncing',
    progress: {
      collections: { current: 0, total: 0 },
      products: { current: 0, total: 0 },
      photos: { current: 0, total: 0 },
    },
    startedAt: Date.now(),
  };

  try {
    console.log('Начало синхронизации каталога...');

    // Шаг 1: Синхронизация коллекций
    console.log('Загрузка коллекций из VK...');
    const collections = await fetchCollections();
    syncProgress.progress.collections.total = collections.items.length;
    syncProgress.message = `Загружено ${collections.items.length} коллекций`;

    const now = Date.now();

    // Сохраняем коллекции в БД
    for (let i = 0; i < collections.items.length; i++) {
      const collection = collections.items[i];
      const existing = collectionsQueries.getById.get(collection.id) as any;
      
      try {
        // Логируем структуру первой коллекции для отладки
        if (i === 0) {
          console.log('First collection structure:', JSON.stringify(collection, null, 2));
          console.log('Collection keys:', Object.keys(collection));
        }
        
        // Проверяем обязательные поля
        if (!collection.id) {
          console.error('Collection missing id:', collection);
          continue;
        }
        
        // Безопасно получаем created_at
        let createdAt = now;
        if (existing && existing.created_at) {
          createdAt = existing.created_at;
        }
        
        // Извлекаем URL фото (photo может быть объектом с sizes)
        let photoUrl: string | null = null;
        if (collection.photo) {
          if (typeof collection.photo === 'string') {
            photoUrl = collection.photo;
          } else if (collection.photo.sizes && Array.isArray(collection.photo.sizes)) {
            // Берем самый большой размер
            const largest = collection.photo.sizes.reduce((prev: any, curr: any) => {
              const prevSize = (prev.width || 0) * (prev.height || 0);
              const currSize = (curr.width || 0) * (curr.height || 0);
              return currSize > prevSize ? curr : prev;
            });
            photoUrl = largest.url || null;
          } else if (collection.photo.url) {
            photoUrl = collection.photo.url;
          }
        } else if (collection.photo_url) {
          photoUrl = collection.photo_url;
        }
        
        // Сохраняем порядок коллекций как в VK (индекс в массиве)
        // Убеждаемся, что все параметры определены (7 параметров для 7 полей)
        const params: any[] = [
          Number(collection.id),           // id
          String(collection.title || ''),  // title
          photoUrl,                        // photo_url
          Number(collection.count || 0),   // count
          Number(i),                       // sort_order - порядок как в VK API
          Number(now),                     // updated_at
          Number(createdAt)                // created_at
        ];
        
        if (params.length !== 7) {
          console.error(`Wrong number of params: ${params.length}, expected 7`);
          console.error('Params:', params);
          throw new Error(`Wrong number of params: ${params.length}`);
        }
        
        console.log(`Inserting collection ${collection.id} with ${params.length} params`);
        collectionsQueries.insert.run(...params);
      } catch (error: any) {
        console.error(`Error inserting collection ${collection.id}:`, error.message);
        console.error('Collection data:', JSON.stringify(collection, null, 2));
        throw error;
      }

      syncProgress.progress.collections.current = i + 1;
    }

    console.log(`Сохранено ${collections.items.length} коллекций`);

    // Шаг 2: Синхронизация товаров
    console.log('Загрузка товаров из VK...');
    let totalProducts = 0;
    const productIds: number[] = [];

    const MAX_PRODUCTS_LIMIT = Number(process.env.MAX_PRODUCTS_LIMIT) || 20;
    console.log(`\n📊 Лимиты синхронизации:`);
    console.log(`   - Коллекций: ${collections.items.length} (лимит: ${Number(process.env.MAX_COLLECTIONS_LIMIT) || 10})`);
    console.log(`   - Товаров из каждой коллекции: до ${MAX_PRODUCTS_LIMIT}`);
    console.log(`   - Ожидаемое количество товаров: до ${collections.items.length * MAX_PRODUCTS_LIMIT}\n`);

    for (const collection of collections.items) {
      try {
        console.log(`\n📦 Загрузка товаров из коллекции "${collection.title}" (ID: ${collection.id})...`);
        const products = await fetchAllProducts({
          albumId: collection.id.toString(),
        });

        syncProgress.message = `Загрузка товаров из коллекции "${collection.title}"...`;
        syncProgress.progress.products.total += products.items.length;

        if (products.items.length === 0) {
          console.log(`   ⚠️  Коллекция "${collection.title}" (ID: ${collection.id}) пуста - товары не найдены`);
          console.log(`   ℹ️  Возможные причины: коллекция пуста в VK, или товары недоступны для данного токена`);
          continue;
        }

        // Сохраняем товары в БД
        let savedCount = 0;
        for (const product of products.items) {
          try {
            const sizes = parseSizes(product.description || '');
            
            productsQueries.insert.run(
              product.id,
              collection.id,
              product.title,
              product.description || null,
              product.price?.amount || null,
              product.price?.currency_code || null,
              product.price?.text || null,
              product.thumb_photo || null,
              JSON.stringify(product.photos || []),
              JSON.stringify(sizes),
              now,
              now
            );

            productIds.push(product.id);
            totalProducts++;
            savedCount++;
            syncProgress.progress.products.current = totalProducts;
          } catch (dbError: any) {
            // Если товар уже существует (UNIQUE constraint), пропускаем его
            if (dbError.message && dbError.message.includes('UNIQUE constraint')) {
              console.log(`   ⚠️  Товар ${product.id} уже существует в БД, пропускаем`);
              continue;
            }
            console.error(`   ❌ Ошибка при сохранении товара ${product.id} в БД:`, dbError.message);
          }
        }

        const expectedCount = MAX_PRODUCTS_LIMIT;
        const actualCount = products.items.length;
        if (actualCount === 0) {
          console.log(`   ❌ Коллекция "${collection.title}" (ID: ${collection.id}) - товары не загружены`);
        } else if (actualCount < expectedCount) {
          console.log(`   ⚠️  В коллекции "${collection.title}" загружено ${actualCount} товаров (ожидалось до ${expectedCount}, возможно в коллекции меньше товаров)`);
        } else {
          console.log(`   ✓  Из коллекции "${collection.title}" загружено ${actualCount} товаров (лимит: ${expectedCount})`);
        }
        console.log(`   💾 Сохранено в БД: ${savedCount} товаров`);
      } catch (error: any) {
        console.error(`\n❌ Ошибка при загрузке товаров из коллекции "${collection.title}" (ID: ${collection.id}):`);
        console.error(`   Тип ошибки: ${error.name || 'Unknown'}`);
        console.error(`   Сообщение: ${error.message || error}`);
        if (error.response) {
          console.error(`   VK API Response:`, JSON.stringify(error.response.data, null, 2));
        }
        if (error.stack) {
          console.error(`   Stack trace:`, error.stack);
        }
        // Продолжаем обработку других коллекций даже при ошибке
      }
    }

    console.log(`Всего сохранено ${totalProducts} товаров`);

    // Шаг 3: Загрузка и сохранение фото
    console.log('Загрузка фото товаров...');
    syncProgress.message = 'Загрузка фото товаров...';
    syncProgress.progress.photos.total = productIds.length;

    let photosDownloaded = 0;
    let photosFailed = 0;
    let productsWithoutPhotos = 0;
    const BATCH_SIZE = 10; // Обрабатываем по 10 товаров параллельно
    const DELAY_BETWEEN_BATCHES = 200; // Задержка между батчами (мс) для избежания rate limiting
    const allResults: any[] = []; // Сохраняем все результаты для финальной статистики

    for (let i = 0; i < productIds.length; i += BATCH_SIZE) {
      const batch = productIds.slice(i, i + BATCH_SIZE);
      
      // Задержка перед обработкой батча (кроме первого)
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
      }
      
      const results = await Promise.allSettled(
        batch.map(async (productId) => {
          // Проверяем, есть ли уже загруженные фото для этого товара
          const thumbPath = getPhotoPath(productId, 'thumb');
          const galleryPhotos = getAllProductPhotos(productId);
          
          // Если есть обложка и хотя бы одно фото в галерее, пропускаем товар
          if (thumbPath && galleryPhotos.length > 0) {
            console.log(`Товар ${productId}: фото уже загружены (обложка + ${galleryPhotos.length} фото в галерее), пропускаем`);
            photosDownloaded++;
            syncProgress.progress.photos.current = photosDownloaded;
            return { productId, success: true, skipped: true, reason: 'already_processed' };
          }
          
          let hasPhotos = false;
          try {
            // Получаем полную информацию о товаре с фото
            const fullProduct = await fetchProductById(productId);
            
            if (!fullProduct) {
              console.warn(`Товар ${productId}: не удалось получить полную информацию через getById`);
              // Пытаемся использовать данные из БД (которые уже сохранены)
              const dbProduct = productsQueries.getById.get(productId) as any;
              if (dbProduct && dbProduct.thumb_photo_url) {
                // Если есть хотя бы обложка в БД, загружаем её
                try {
                  await downloadAndSavePhoto(dbProduct.thumb_photo_url, productId, 'thumb');
                  photosDownloaded++;
                  syncProgress.progress.photos.current = photosDownloaded;
                  return { productId, success: true, downloadedCount: 1 };
                } catch (error: any) {
                  console.error(`Товар ${productId}: ошибка загрузки обложки из БД:`, error.message);
                }
              }
              return { productId, success: false, reason: 'no_product_data' };
            }

            let downloadedCount = 0;

            // Шаг 1: Загружаем обложку из поля thumb_photo (которое уже является URL)
            if (fullProduct.thumb_photo) {
              try {
                await downloadAndSavePhoto(fullProduct.thumb_photo, productId, 'thumb');
                downloadedCount++;
                hasPhotos = true;
                console.log(`Товар ${productId}: обложка загружена из thumb_photo`);
              } catch (error: any) {
                console.error(`Товар ${productId}: ошибка загрузки обложки из thumb_photo:`, error.message);
              }
            }

            // Шаг 2: Извлекаем все уникальные фото из массива photos (получены через photos.getById)
            // Эти фото используются для галереи товара
            const galleryPhotos = extractPhotos(fullProduct);
            
            // Логируем для первых нескольких товаров для отладки
            if (photosDownloaded < 3) {
              console.log(`\n=== Товар ${productId} (syncService) ===`);
              console.log(`thumb_photo: ${fullProduct.thumb_photo || 'нет'}`);
              if (Array.isArray(fullProduct.photos)) {
                const photoIds = fullProduct.photos.map((p: any) => p?.id).filter((id: any) => id != null);
                console.log(`В product.photos: ${fullProduct.photos.length} фото, из них с ID: ${photoIds.length}`);
              }
              console.log(`Извлечено ${galleryPhotos.length} фото для галереи`);
              if (galleryPhotos.length > 0) {
                console.log(`Все фото галереи (${galleryPhotos.length}):`, galleryPhotos.map((url, i) => `${i}: ${url.substring(0, 80)}...`));
              } else if (Array.isArray(fullProduct.photos) && fullProduct.photos.length > 0) {
                console.warn(`⚠️  В product.photos есть ${fullProduct.photos.length} фото, но в галерею ничего не извлечено!`);
              }
            }
            
            // Загружаем ВСЕ фото из галереи (photo_0, photo_1, и т.д.)
            // Все фото из массива product.photos должны быть загружены в галерею
            // (кроме тех, которые совпадают с thumb_photo)
            console.log(`Товар ${productId}: загружаем ${galleryPhotos.length} фото в галерею...`);
            for (let j = 0; j < galleryPhotos.length; j++) {
              try {
                await downloadAndSavePhoto(galleryPhotos[j], productId, j);
                downloadedCount++;
                hasPhotos = true;
                if (photosDownloaded < 3) {
                  console.log(`  ✓ Фото ${j} загружено: photo_${j}.jpg`);
                }
              } catch (error: any) {
                console.error(`Товар ${productId}: ошибка загрузки фото галереи ${j}:`, error.message);
              }
            }
            if (galleryPhotos.length > 0) {
              console.log(`Товар ${productId}: загружено ${downloadedCount} фото (${galleryPhotos.length} в галерею)`);
            }

            // Если не было ни thumb_photo, ни фото в галерее, но есть фото в массиве thumb
            if (!hasPhotos && fullProduct.thumb && Array.isArray(fullProduct.thumb) && fullProduct.thumb.length > 0) {
              // Используем первое фото из thumb как обложку
              const thumbUrl = fullProduct.thumb[0]?.url;
              if (thumbUrl) {
                try {
                  await downloadAndSavePhoto(thumbUrl, productId, 'thumb');
                  downloadedCount++;
                  hasPhotos = true;
                  console.log(`Товар ${productId}: обложка загружена из thumb массива`);
                } catch (error: any) {
                  console.error(`Товар ${productId}: ошибка загрузки обложки из thumb:`, error.message);
                }
              }
            }

            if (hasPhotos) {
              photosDownloaded++;
              syncProgress.progress.photos.current = photosDownloaded;
              return { productId, success: true, downloadedCount };
            } else {
              productsWithoutPhotos++;
              console.warn(`Товар ${productId}: нет фото для загрузки`);
              return { productId, success: false, reason: 'no_photos' };
            }
          } catch (error: any) {
            console.error(`Товар ${productId}: критическая ошибка:`, error.message);
            photosFailed++;
            return { productId, success: false, reason: 'error', error: error.message };
          }
        })
      );

      // Сохраняем результаты для финальной статистики
      allResults.push(...results);

      // Логируем результаты батча
      const successful = results.filter(r => r.status === 'fulfilled' && r.value?.success).length;
      const skipped = results.filter(r => r.status === 'fulfilled' && r.value?.skipped).length;
      const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value?.success)).length;
      const processed = successful - skipped;
      if (skipped > 0) {
        console.log(`Батч ${Math.floor(i / BATCH_SIZE) + 1}: обработано ${processed}, пропущено ${skipped}, ошибок ${failed}`);
      } else {
        console.log(`Батч ${Math.floor(i / BATCH_SIZE) + 1}: успешно ${successful}, ошибок ${failed}`);
      }

      // Небольшая задержка между батчами
      if (i + BATCH_SIZE < productIds.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Подсчитываем финальную статистику
    const productsSkipped = allResults.filter(r => r.status === 'fulfilled' && r.value?.skipped).length;
    const processedCount = photosDownloaded - productsSkipped;
    console.log(`Загружено фото для ${processedCount} товаров`);
    if (productsSkipped > 0) {
      console.log(`Пропущено товаров (уже обработаны): ${productsSkipped}`);
    }
    if (productsWithoutPhotos > 0) {
      console.log(`Товаров без фото: ${productsWithoutPhotos}`);
    }
    if (photosFailed > 0) {
      console.log(`Товаров с ошибками загрузки: ${photosFailed}`);
    }

    syncProgress.status = 'completed';
    syncProgress.completedAt = Date.now();
    syncProgress.message = `Синхронизация завершена: ${collections.items.length} коллекций, ${totalProducts} товаров`;

    console.log('Синхронизация каталога завершена успешно');
  } catch (error: any) {
    console.error('Ошибка при синхронизации каталога:', error);
    syncProgress.status = 'error';
    syncProgress.error = error.message || 'Неизвестная ошибка';
    throw error;
  }
};

/**
 * Нормализует URL фото для сравнения (убирает только параметры размера)
 * Используется только как дополнительная проверка для фото без ID
 * Основной критерий дедупликации - ID фото
 */
function normalizePhotoUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    // Убираем только параметры, связанные с размером изображения
    urlObj.searchParams.delete('size');
    urlObj.searchParams.delete('crop');
    // Сохраняем все остальные параметры и путь - они могут различать фото
    return urlObj.toString();
  } catch {
    // Если не удалось распарсить URL, убираем только параметры размера вручную
    return url.replace(/[?&](size|crop)=[^&]*/gi, '');
  }
}

/**
 * Получает URL фото нужного размера из массива sizes
 * @param photo - Объект фото с массивом sizes
 * @param preferredSize - Предпочтительный размер: 'original', 'high', 'medium', 'low'
 * @returns URL фото нужного размера или null
 */
function getPhotoUrlBySize(photo: any, preferredSize: string = 'original'): string | null {
  if (!photo.sizes || !Array.isArray(photo.sizes) || photo.sizes.length === 0) {
    return null;
  }

  // Приоритет размеров в VK API (от большего к меньшему):
  // orig_photo > base > y > x > r > q > p > o > m > s
  
  if (preferredSize === 'original' && photo.orig_photo && photo.orig_photo.url) {
    return photo.orig_photo.url;
  }

  // Определяем приоритет размеров в зависимости от выбранного качества
  let sizePriority: string[] = [];
  switch (preferredSize) {
    case 'original':
    case 'max':
      // Максимальное качество: orig_photo > base > y > x
      sizePriority = ['base', 'y', 'x', 'r', 'q', 'p', 'o', 'm', 's'];
      break;
    case 'high':
      // Высокое качество: y > x > r
      sizePriority = ['y', 'x', 'r', 'q', 'p', 'o', 'm', 's'];
      break;
    case 'medium':
      // Среднее качество: p > o > m
      sizePriority = ['p', 'o', 'm', 'q', 'r', 'x', 'y', 's'];
      break;
    case 'low':
      // Низкое качество: m > s
      sizePriority = ['m', 's', 'o', 'p', 'q', 'r', 'x', 'y'];
      break;
    default:
      // По умолчанию - максимальное качество
      sizePriority = ['base', 'y', 'x', 'r', 'q', 'p', 'o', 'm', 's'];
  }

  // Ищем фото нужного размера по приоритету
  for (const sizeType of sizePriority) {
    const size = photo.sizes.find((s: any) => s.type === sizeType);
    if (size && size.url) {
      return size.url;
    }
  }

  // Если не нашли нужный размер, берем самый большой доступный
  const largest = photo.sizes.reduce((prev: any, curr: any) => {
    const prevSize = (prev.width || 0) * (prev.height || 0);
    const currSize = (curr.width || 0) * (curr.height || 0);
    return currSize > prevSize ? curr : prev;
  });
  return largest?.url || null;
}

/**
 * Извлекает ВСЕ уникальные фото из массива product.photos для галереи
 * Исключает только thumb_photo и его варианты, чтобы избежать дублирования
 * Поддерживает выбор размера фото через переменную окружения PHOTO_QUALITY
 * 
 * @param product - Объект товара с полями photos (массив фото) и thumb_photo (обложка)
 * @returns Массив URL всех фото для галереи (кроме thumb_photo)
 */
export function extractPhotos(product: any): string[] {
  // Получаем предпочтительный размер фото из переменной окружения
  // Варианты: 'original'/'max' (максимальное), 'high' (высокое), 'medium' (среднее), 'low' (низкое)
  const photoQuality = (process.env.PHOTO_QUALITY || 'original').toLowerCase();
  const photos: string[] = [];
  const photoIds = new Set<number>(); // Для дедупликации по ID
  const photoBaseUrls = new Set<string>(); // Для дедупликации по базовому URL
  
  // Нормализуем thumb_photo для исключения из галереи
  // thumb_photo НЕ должен попадать в галерею - он используется только как обложка
  let thumbPhotoUrl: string | null = null;
  let thumbPhotoBasePath: string | null = null;
  let thumbPhotoFileName: string | null = null; // Имя файла без расширения для более точного сравнения
  let thumbPhotoPathWithoutQuery: string | null = null; // Полный путь к файлу без query параметров
  
  if (product.thumb_photo) {
    thumbPhotoUrl = normalizePhotoUrl(product.thumb_photo);
    // Извлекаем базовый путь к файлу для более точного сравнения
    try {
      const thumbUrlObj = new URL(product.thumb_photo);
      // Берем путь к файлу без параметров
      thumbPhotoBasePath = thumbUrlObj.pathname.split('/').pop()?.split('?')[0] || null;
      // Извлекаем имя файла без расширения
      thumbPhotoFileName = thumbPhotoBasePath?.split('.')[0] || null;
      // Полный путь без query (для более точного сравнения)
      thumbPhotoPathWithoutQuery = thumbUrlObj.pathname;
    } catch {
      // Если не удалось распарсить, берем последнюю часть пути
      thumbPhotoBasePath = product.thumb_photo.split('/').pop()?.split('?')[0]?.split('&')[0] || null;
      thumbPhotoFileName = thumbPhotoBasePath?.split('.')[0] || null;
      // Пытаемся извлечь путь без query
      const urlParts = product.thumb_photo.split('?');
      if (urlParts.length > 0) {
        const pathParts = urlParts[0].split('/');
        thumbPhotoPathWithoutQuery = '/' + pathParts.slice(-2).join('/'); // Последние 2 части пути
      }
    }
  }
  
  // Также собираем все URL из массива thumb для исключения (они тоже являются вариантами thumb_photo)
  const thumbUrls = new Set<string>();
  const thumbFileNames = new Set<string>();
  if (product.thumb && Array.isArray(product.thumb)) {
    product.thumb.forEach((thumb: any) => {
      if (thumb.url) {
        thumbUrls.add(thumb.url);
        try {
          const thumbUrlObj = new URL(thumb.url);
          const thumbBasePath = thumbUrlObj.pathname.split('/').pop()?.split('?')[0];
          const thumbFileName = thumbBasePath?.split('.')[0];
          if (thumbFileName) {
            thumbFileNames.add(thumbFileName);
          }
        } catch {
          const thumbBasePath = thumb.url.split('/').pop()?.split('?')[0]?.split('&')[0];
          const thumbFileName = thumbBasePath?.split('.')[0];
          if (thumbFileName) {
            thumbFileNames.add(thumbFileName);
          }
        }
      }
    });
  }

  /**
   * Добавляет фото в список, если оно уникально
   * Приоритет дедупликации: по ID фото (самый надежный), затем по полному URL (без query параметров размера)
   * Исключает thumb_photo и все варианты из массива thumb, так как они используются только как обложка
   */
  const addUniquePhoto = (url: string, photoId?: number) => {
    if (!url) return;
    
    // Проверка 1: Прямое сравнение с thumb_photo
    if (url === product.thumb_photo) {
      return; // Это thumb_photo, пропускаем
    }
    
    // Проверка 2: Проверка на совпадение с любым URL из массива thumb
    if (thumbUrls.has(url)) {
      return; // Это фото из массива thumb (вариант thumb_photo), пропускаем
    }
    
    // Проверка 3: Сравнение нормализованных URL
    const normalizedUrl = normalizePhotoUrl(url);
    if (thumbPhotoUrl && normalizedUrl === thumbPhotoUrl) {
      return; // Это thumb_photo (нормализованный), пропускаем
    }
    
    // Проверка 4: Сравнение имен файлов (без расширения) - самый надежный способ
    let photoFileName: string | null = null;
    try {
      const urlObj = new URL(url);
      const photoBasePath = urlObj.pathname.split('/').pop()?.split('?')[0];
      photoFileName = photoBasePath?.split('.')[0] || null;
    } catch {
      const photoBasePath = url.split('/').pop()?.split('?')[0]?.split('&')[0];
      photoFileName = photoBasePath?.split('.')[0] || null;
    }
    
    // Сравниваем с именем файла thumb_photo
    if (thumbPhotoFileName && photoFileName && thumbPhotoFileName === photoFileName) {
      return; // Это то же фото, что и thumb_photo (в другом размере), пропускаем
    }
    
    // Сравниваем с именами файлов из массива thumb
    if (photoFileName && thumbFileNames.has(photoFileName)) {
      return; // Это фото из массива thumb (вариант thumb_photo), пропускаем
    }
    
    // Проверка 5: Сравнение полных путей без query параметров (более надежно)
    if (thumbPhotoPathWithoutQuery) {
      try {
        const urlObj = new URL(url);
        const photoPathWithoutQuery = urlObj.pathname;
        // Сравниваем последние части пути (обычно это имя файла и родительская директория)
        const thumbPathParts = thumbPhotoPathWithoutQuery.split('/').filter(p => p);
        const photoPathParts = photoPathWithoutQuery.split('/').filter(p => p);
        if (thumbPathParts.length >= 2 && photoPathParts.length >= 2) {
          // Сравниваем последние 2 части пути (директория + файл)
          const thumbLast2 = thumbPathParts.slice(-2).join('/');
          const photoLast2 = photoPathParts.slice(-2).join('/');
          if (thumbLast2 === photoLast2) {
            return; // Это то же самое фото, что и thumb_photo, пропускаем
          }
        }
      } catch {
        // Fallback: сравнение базовых путей
        const photoBasePath = url.split('/').pop()?.split('?')[0]?.split('&')[0];
        if (photoBasePath && thumbPhotoBasePath === photoBasePath) {
          return; // Это то же самое фото, что и thumb_photo, пропускаем
        }
      }
    }
    
    // Проверка 6: Сравнение базовых путей к файлу (fallback)
    if (thumbPhotoBasePath) {
      try {
        const urlObj = new URL(url);
        const photoBasePath = urlObj.pathname.split('/').pop()?.split('?')[0];
        if (photoBasePath && thumbPhotoBasePath === photoBasePath) {
          return; // Это то же самое фото, что и thumb_photo, пропускаем
        }
      } catch {
        const photoBasePath = url.split('/').pop()?.split('?')[0]?.split('&')[0];
        if (photoBasePath && thumbPhotoBasePath === photoBasePath) {
          return; // Это то же самое фото, что и thumb_photo, пропускаем
        }
      }
    }
    
    // Если есть ID фото - используем его для дедупликации (самый надежный способ)
    // Это гарантирует, что одно и то же фото (даже в разных размерах) не будет добавлено дважды
    if (photoId && photoId > 0) {
      if (photoIds.has(photoId)) {
        // Фото с таким ID уже добавлено - это дубликат (даже если URL разные)
        return;
      }
      // Добавляем фото с ID
      photos.push(url);
      photoIds.add(photoId);
      // Также добавляем нормализованный URL для дополнительной проверки
      photoBaseUrls.add(normalizedUrl);
      return;
    }
    
    // Если ID нет, используем более строгую проверку URL
    // Убираем только параметры размера, но сохраняем путь к файлу
    if (photoBaseUrls.has(normalizedUrl)) {
      // Фото с таким базовым URL уже добавлено
      return;
    }
    
    // Также проверяем по полному URL без query параметров (на случай, если normalizePhotoUrl не сработала)
    const urlWithoutQuery = url.split('?')[0].split('#')[0];
    if (photoBaseUrls.has(urlWithoutQuery)) {
      return;
    }
    
    // Добавляем фото без ID
    photos.push(url);
    photoBaseUrls.add(normalizedUrl);
    photoBaseUrls.add(urlWithoutQuery);
  };

  if (product.photos) {
    if (Array.isArray(product.photos)) {
      product.photos.forEach((photo: any, index: number) => {
        if (typeof photo === 'object' && photo !== null) {
          const photoId = photo.id;
          
          // С extended=1 фото приходят с полной информацией, включая orig_photo и sizes
          // Используем функцию getPhotoUrlBySize для выбора нужного размера
          // addUniquePhoto автоматически исключит thumb_photo и все его варианты
          let photoUrl: string | null = null;
          
          if (photo.sizes && Array.isArray(photo.sizes) && photo.sizes.length > 0) {
            // Используем функцию для выбора размера в зависимости от PHOTO_QUALITY
            photoUrl = getPhotoUrlBySize(photo, photoQuality);
          } else if (photo.orig_photo && photo.orig_photo.url) {
            // Если есть только orig_photo, используем его (только для original/max качества)
            if (photoQuality === 'original' || photoQuality === 'max') {
              photoUrl = photo.orig_photo.url;
            }
          } else {
            // Используем прямые поля - выбираем размер в зависимости от качества
            if (photoQuality === 'original' || photoQuality === 'max' || photoQuality === 'high') {
              photoUrl = photo.photo_2560 || photo.photo_1280 || photo.photo_604 || photo.url;
            } else if (photoQuality === 'medium') {
              photoUrl = photo.photo_1280 || photo.photo_604 || photo.url;
            } else {
              photoUrl = photo.photo_604 || photo.url;
            }
          }
          
          // Дополнительная проверка: если это первое фото и оно совпадает с thumb_photo, пропускаем
          // Но только если это действительно то же самое фото (не просто первое в списке)
          if (photoUrl && index === 0 && product.thumb_photo) {
            // Проверяем, не является ли это фото тем же, что и thumb_photo
            const normalizedPhotoUrl = normalizePhotoUrl(photoUrl);
            if (thumbPhotoUrl && normalizedPhotoUrl === thumbPhotoUrl) {
              // Это первое фото совпадает с thumb_photo - пропускаем его
              return;
            }
            // Также проверяем по имени файла
            try {
              const urlObj = new URL(photoUrl);
              const photoBasePath = urlObj.pathname.split('/').pop()?.split('?')[0];
              const photoFileName = photoBasePath?.split('.')[0];
              if (thumbPhotoFileName && photoFileName && thumbPhotoFileName === photoFileName) {
                // Это первое фото совпадает с thumb_photo по имени файла - пропускаем
                return;
              }
            } catch {
              // Если не удалось распарсить, пропускаем проверку
            }
          }
          
          // Добавляем все фото из массива photos в галерею (кроме совпадающих с thumb_photo)
          if (photoUrl) {
            addUniquePhoto(photoUrl, photoId);
          } else {
            // Если не удалось извлечь URL, логируем для отладки
            if (process.env.NODE_ENV === 'development') {
              console.warn(`Не удалось извлечь URL для фото ${photoId || index} в товаре`);
            }
          }
        } else if (typeof photo === 'string') {
          // Если фото - строка (URL), проверяем, не является ли оно thumb_photo
          if (photo === product.thumb_photo || (thumbPhotoUrl && normalizePhotoUrl(photo) === thumbPhotoUrl)) {
            return; // Это thumb_photo, пропускаем
          }
          addUniquePhoto(photo);
        }
      });
    } else if (typeof product.photos === 'object') {
      // Одно фото в виде объекта
      const photoId = product.photos.id;
      
      // Используем функцию для выбора размера
      let photoUrl: string | null = null;
      
      if (product.photos.sizes && Array.isArray(product.photos.sizes)) {
        photoUrl = getPhotoUrlBySize(product.photos, photoQuality);
      } else if (product.photos.orig_photo && product.photos.orig_photo.url) {
        if (photoQuality === 'original' || photoQuality === 'max') {
          photoUrl = product.photos.orig_photo.url;
        }
      } else {
        if (photoQuality === 'original' || photoQuality === 'max' || photoQuality === 'high') {
          photoUrl = product.photos.photo_2560 || product.photos.photo_1280 || product.photos.photo_604 || product.photos.url;
        } else if (photoQuality === 'medium') {
          photoUrl = product.photos.photo_1280 || product.photos.photo_604 || product.photos.url;
        } else {
          photoUrl = product.photos.photo_604 || product.photos.url;
        }
      }
      
      if (photoUrl) {
        addUniquePhoto(photoUrl, photoId);
      }
    }
  }
  
  // НЕ добавляем фото из массива thumb в галерею, так как:
  // 1. thumb обычно содержит миниатюры тех же фото, что уже есть в photos
  // 2. thumb_photo уже используется как обложка
  // 3. Это предотвращает дублирование миниатюр в галерее

  // Не добавляем thumb_photo в массив photos, так как он уже загружается отдельно как обложка
  // Это позволяет избежать дублирования

  return photos;
}


