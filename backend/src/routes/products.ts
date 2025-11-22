import { createHash } from 'crypto';
import { Router, type Request, type Response, type NextFunction } from 'express';
import type { ParsedQs } from 'qs';

import { fetchCollections, fetchProducts, fetchAllProducts, enrichProductsWithPhotos, fetchProductById } from '../services/vkClient.js';
import { parseSizes } from '../utils/sizeParser.js';
import { cache } from '../services/cache.js';
import { collectionsQueries, productsQueries } from '../database/schema.js';
import { getAllProductPhotos } from '../services/photoService.js';

const router = Router();
const useLocalDB = process.env.USE_LOCAL_DB === 'true';

// TTL для кэша (в миллисекундах)
const COLLECTIONS_CACHE_TTL = 60 * 60 * 1000; // 60 минут (коллекции меняются редко)
const PRODUCTS_CACHE_TTL = 30 * 60 * 1000; // 30 минут

/**
 * Вычисляет ETag для данных
 */
const computeETag = (data: any): string => {
  const json = JSON.stringify(data);
  return createHash('md5').update(json).digest('hex');
};

/**
 * Проверяет If-None-Match заголовок и отправляет 304, если данные не изменились
 */
const checkETag = (req: Request, res: Response, data: any): boolean => {
  const etag = computeETag(data);
  res.setHeader('ETag', `"${etag}"`);
  
  const ifNoneMatch = req.headers['if-none-match'];
  if (ifNoneMatch === `"${etag}"` || ifNoneMatch === etag) {
    res.status(304).end();
    return true; // Данные не изменились, ответ отправлен
  }
  
  return false; // Данные изменились, нужно отправить новые данные
};

router.get('/collections', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    // Если используется локальная БД, берем данные оттуда
    if (useLocalDB) {
      const collections = collectionsQueries.getAll.all();
      const result = {
        count: collections.length,
        items: collections.map((c: any) => ({
          id: c.id,
          title: c.title,
          // Преобразуем photo_url в формат, ожидаемый фронтендом
          photo: c.photo_url ? {
            sizes: [{
              type: 'x',
              // Если photo_url уже полный URL, используем его, иначе добавляем базовый URL
              url: c.photo_url.startsWith('http') ? c.photo_url : c.photo_url,
              width: 300,
              height: 200,
            }],
          } : undefined,
          count: c.count,
        })),
      };
      return res.json(result);
    }

    // Проверяем кэш
    const cacheKey = 'collections';
    let collections = cache.get(cacheKey);
    
    if (collections) {
      // Проверяем ETag - если данные не изменились, отправляем 304
      if (checkETag(_req, res, collections)) {
        return; // 304 уже отправлен
      }
      // Данные изменились, отправляем новые
      return res.json(collections);
    }

    // Загружаем коллекции из VK
    collections = await fetchCollections();
    
    // Сохраняем в кэш
    cache.set(cacheKey, collections, COLLECTIONS_CACHE_TTL);
    
    // Устанавливаем ETag и отправляем данные
    checkETag(_req, res, collections);
    res.json(collections);
  } catch (error) {
    next(error);
  }
});

/**
 * Получает все фото товара (полные фото, не только обложка)
 * ВАЖНО: Этот маршрут должен быть ПЕРЕД маршрутом '/', иначе он не будет работать
 */
router.get('/:id/photos', async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  try {
    const productId = Number(id);
    if (isNaN(productId)) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }

    // Если используется локальная БД, берем фото оттуда
    if (useLocalDB) {
      const localPhotos = getAllProductPhotos(productId);
      if (localPhotos.length > 0) {
        return res.json({ photos: localPhotos });
      }
      // Если локальных фото нет, возвращаем пустой массив
      return res.json({ photos: [] });
    }

    // Проверяем кэш
    const cacheKey = `product:${productId}:photos`;
    const cached = cache.get<string[]>(cacheKey);
    if (cached) {
      const photosResponse = { photos: cached };
      // Проверяем ETag - если данные не изменились, отправляем 304
      if (checkETag(req, res, photosResponse)) {
        return; // 304 уже отправлен
      }
      // Данные изменились, отправляем новые
      return res.json(photosResponse);
    }

    // Получаем полную информацию о товаре
    const fullProduct = await fetchProductById(productId);
    
    if (!fullProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Извлекаем все фото из товара
    const photos: string[] = [];

    // Обрабатываем photos поле
    if (fullProduct.photos) {
      if (Array.isArray(fullProduct.photos)) {
        fullProduct.photos.forEach((photo: any) => {
          if (typeof photo === 'object' && photo !== null) {
            // Проверяем массив sizes
            if (photo.sizes && Array.isArray(photo.sizes) && photo.sizes.length > 0) {
              // Берем самый большой размер
              const largestSize = photo.sizes.reduce((prev: any, curr: any) => {
                const prevSize = (prev.width || 0) * (prev.height || 0);
                const currSize = (curr.width || 0) * (curr.height || 0);
                return currSize > prevSize ? curr : prev;
              });
              
              if (largestSize.url) {
                // Убираем параметры crop и size
                try {
                  const urlObj = new URL(largestSize.url);
                  urlObj.searchParams.delete('crop');
                  urlObj.searchParams.delete('size');
                  photos.push(urlObj.toString());
                } catch (e) {
                  photos.push(largestSize.url);
                }
              }
            } else {
              // Используем прямые поля
              const photoUrl = photo.photo_2560 || photo.photo_1280 || photo.photo_604 || photo.url;
              if (photoUrl) {
                // Убираем параметры crop и size
                try {
                  const urlObj = new URL(photoUrl);
                  urlObj.searchParams.delete('crop');
                  urlObj.searchParams.delete('size');
                  photos.push(urlObj.toString());
                } catch (e) {
                  photos.push(photoUrl);
                }
              }
            }
          } else if (typeof photo === 'string') {
            photos.push(photo);
          }
        });
      } else if (typeof fullProduct.photos === 'object') {
        // Одно фото в виде объекта
        const photoUrl = fullProduct.photos.photo_2560 || fullProduct.photos.photo_1280 || fullProduct.photos.photo_604 || fullProduct.photos.url;
        if (photoUrl) {
          try {
            const urlObj = new URL(photoUrl);
            urlObj.searchParams.delete('crop');
            urlObj.searchParams.delete('size');
            photos.push(urlObj.toString());
          } catch (e) {
            photos.push(photoUrl);
          }
        }
      }
    }

    // Если нет фото, добавляем thumb_photo
    if (photos.length === 0 && fullProduct.thumb_photo) {
      try {
        const urlObj = new URL(fullProduct.thumb_photo);
        urlObj.searchParams.delete('crop');
        urlObj.searchParams.delete('size');
        photos.push(urlObj.toString());
      } catch (e) {
        photos.push(fullProduct.thumb_photo);
      }
    }

    // Сохраняем в кэш на 30 минут
    cache.set(cacheKey, photos, PRODUCTS_CACHE_TTL);

    // Устанавливаем ETag и отправляем данные
    const photosResponse = { photos };
    checkETag(req, res, photosResponse);
    res.json(photosResponse);
  } catch (error) {
    next(error);
  }
});

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  const { album_id: albumId, q, size, offset, count, _t } = req.query;

  try {
    // Если используется локальная БД, берем данные оттуда
    if (useLocalDB) {
      let products: any[];

      if (albumId) {
        products = productsQueries.getByCollection.all(Number(albumId));
      } else {
        products = productsQueries.getAll.all();
      }

      // Применяем фильтры
      if (q) {
        const queryLower = q.toString().toLowerCase();
        products = products.filter((p: any) =>
          p.title.toLowerCase().includes(queryLower) ||
          (p.description && p.description.toLowerCase().includes(queryLower))
        );
      }

      if (size) {
        const sizeLower = size.toString().toLowerCase();
        const sizes = products.map((p: any) => {
          try {
            return JSON.parse(p.sizes_json || '[]');
          } catch {
            return parseSizes(p.description || '');
          }
        });
        products = products.filter((p: any, i: number) => {
          const productSizes = sizes[i];
          return (
            (p.description && p.description.toLowerCase().includes(sizeLower)) ||
            productSizes.some((s: string) => s.toLowerCase() === sizeLower)
          );
        });
      }

      // Преобразуем в нужный формат
      const items = products.map((p: any) => {
        let sizes: string[] = [];
        try {
          sizes = JSON.parse(p.sizes_json || '[]');
        } catch {
          sizes = parseSizes(p.description || '');
        }

        // Получаем локальные фото (getAllProductPhotos уже исключает thumb.jpg из галереи)
        const localPhotos = getAllProductPhotos(p.id);
        // Используем локальное фото или fallback на URL из БД
        // Локальные фото имеют формат /photos/{productId}/photo_0.jpg, photo_1.jpg и т.д.
        // thumb.jpg исключается из галереи, так как используется только как обложка
        // Преобразуем относительные пути в полные URL для фронтенда
        const baseUrl = process.env.BACKEND_URL || 'http://localhost:4000';
        const localPhotosWithUrl = localPhotos.map((url: string) => {
          if (url.startsWith('/')) {
            return `${baseUrl}${url}`;
          }
          return url;
        });
        
        // thumb.jpg не должен быть в localPhotos, так как getAllProductPhotos его исключает
        // Но на всякий случай проверяем и исключаем, если он все же попал
        const galleryPhotos = localPhotosWithUrl.filter((url: string) => !url.includes('thumb.jpg'));
        
        // Получаем thumb_photo: сначала проверяем, есть ли он в БД, затем используем локальный файл
        let finalThumbPhoto: string | undefined = undefined;
        if (p.thumb_photo_url) {
          // Если это относительный путь, добавляем базовый URL бэкенда
          if (p.thumb_photo_url.startsWith('/')) {
            finalThumbPhoto = `${baseUrl}${p.thumb_photo_url}`;
          } else if (!p.thumb_photo_url.startsWith('http')) {
            finalThumbPhoto = `${baseUrl}/photos/${p.id}/thumb.jpg`;
          } else {
            finalThumbPhoto = p.thumb_photo_url;
          }
        } else {
          // Если в БД нет thumb_photo_url, но локальный файл существует, используем его
          const thumbPath = `${baseUrl}/photos/${p.id}/thumb.jpg`;
          // Проверяем существование файла через getAllProductPhotos не получится, так как он исключает thumb.jpg
          // Поэтому просто используем путь, если он есть в БД или если есть другие фото
          if (galleryPhotos.length > 0 || localPhotos.length > 0) {
            finalThumbPhoto = thumbPath;
          }
        }

        return {
          id: p.id,
          title: p.title,
          description: p.description,
          price: {
            amount: p.price_amount,
            currency_code: p.price_currency,
            text: p.price_text,
          },
          thumb_photo: finalThumbPhoto || undefined,
          // Возвращаем только уникальные локальные фото из галереи (без thumb.jpg)
          // photos поле используется только для определения наличия дополнительных фото
          // Реальные фото загружаются через /products/:id/photos endpoint
          // thumb.jpg исключается из галереи, так как используется только как обложка
          photos: galleryPhotos.length > 0 ? galleryPhotos.slice(0, 1) : (finalThumbPhoto && !finalThumbPhoto.includes('thumb.jpg') ? [finalThumbPhoto] : []),
          sizes,
        };
      });

      return res.json({
        count: items.length,
        items,
      });
    }

    // Создаем ключ кэша на основе параметров запроса
    const cacheKey = `products:${albumId || 'all'}:${q || ''}:${size || ''}:${offset || 0}:${count || 'all'}`;
    
    // Если нет параметра _t (timestamp для принудительной перезагрузки), проверяем кэш
    if (!_t) {
      const cached = cache.get(cacheKey);
      if (cached) {
        // Проверяем ETag - если данные не изменились, отправляем 304
        if (checkETag(req, res, cached)) {
          return; // 304 уже отправлен
        }
        // Данные изменились, отправляем новые
        return res.json(cached);
      }
    }

    // Если указан count, используем обычную загрузку с пагинацией
    // Если count не указан, загружаем все товары
    const shouldLoadAll = !count && !offset;
    
    const data = shouldLoadAll
      ? await fetchAllProducts({
          albumId: albumId?.toString(),
          query: q?.toString(),
        })
      : await fetchProducts({
          albumId: albumId?.toString(),
          query: q?.toString(),
          size: size?.toString(),
          offset: Number(offset) || 0,
          count: Number(count) || 50, // Дефолтный размер запроса (уменьшен для стабильности)
        });

    // Проверяем, что данные есть
    if (!data || !data.items || !Array.isArray(data.items)) {
      console.error('Invalid data structure from VK API:', data);
      return res.json({ count: 0, items: [] });
    }

    // Обогащаем товары полной информацией, включая все фото
    // Это может занять время, но даст нам все фото товаров
    // Делаем это опционально, чтобы не блокировать загрузку
    let enrichedItems = data.items;
    
    // Проверяем, нужно ли обогащать товары (можно отключить через env)
    // По умолчанию отключено для стабильности, включается через ENRICH_PRODUCTS=true
    const shouldEnrich = process.env.ENRICH_PRODUCTS === 'true';
    
    if (shouldEnrich && data.items.length > 0 && data.items.length <= 20) {
      // Обогащаем только если товаров не слишком много (до 20)
      try {
        console.log(`Enriching ${data.items.length} products with full photo data...`);
        enrichedItems = await enrichProductsWithPhotos(data.items);
        console.log('Products enriched successfully');
      } catch (error) {
        console.error('Error enriching products with photos:', error);
        // Продолжаем с оригинальными данными, если обогащение не удалось
        console.warn('Continuing with original product data (without full photos)');
        enrichedItems = data.items;
      }
    } else {
      if (!shouldEnrich) {
        console.log('Product enrichment is disabled (set ENRICH_PRODUCTS=true to enable)');
      } else if (data.items.length > 20) {
        console.log(`Skipping enrichment for ${data.items.length} products (too many, limit is 20)`);
      }
    }

    // Парсим размеры и применяем фильтр по размеру после получения всех данных
    let productsWithSizes = enrichedItems.map((item: any) => {
      // Если нет фото, но есть thumb_photo, создаем массив фото из него
      if ((!item.photos || (Array.isArray(item.photos) && item.photos.length === 0)) && item.thumb_photo) {
        item.photos = [{ photo_1280: item.thumb_photo, photo_604: item.thumb_photo }];
      }

      // Логируем структуру для отладки (только для первого товара)
      if (process.env.NODE_ENV === 'development' && enrichedItems.indexOf(item) === 0) {
        console.log('Sample product structure after enrichment:', {
          id: item.id,
          title: item.title,
          thumb_photo: item.thumb_photo,
          photos: item.photos,
          photosType: typeof item.photos,
          photosIsArray: Array.isArray(item.photos),
          photosLength: item.photos?.length,
          thumb: item.thumb,
          hasPhotos: !!item.photos && (Array.isArray(item.photos) ? item.photos.length > 0 : true),
        });
      }

      return {
        ...item,
        sizes: parseSizes(item.description || ''),
      };
    });

    // Применяем фильтр по размеру после загрузки всех товаров
    if (size) {
      // Правильно обрабатываем query параметр size
      const sizeValue = Array.isArray(size) ? size[0] : size;
      const sizeStr = typeof sizeValue === 'string' ? sizeValue : String(sizeValue);
      const sizeLower = sizeStr.toLowerCase();
      productsWithSizes = productsWithSizes.filter((item: any) =>
        item.description?.toLowerCase().includes(sizeLower) ||
        item.sizes?.some((s: string) => s.toLowerCase() === sizeLower),
      );
    }

    const response = { 
      count: shouldLoadAll ? productsWithSizes.length : data.count,
      items: productsWithSizes 
    };

    // Сохраняем в кэш (только если не было принудительной перезагрузки)
    if (!_t) {
      cache.set(cacheKey, response, PRODUCTS_CACHE_TTL);
    }

    // Устанавливаем ETag и отправляем данные
    checkETag(req, res, response);
    res.json(response);
  } catch (error) {
    next(error);
  }
});

export default router;


