import axios from 'axios';

type FetchProductsParams = {
  albumId?: string;
  query?: string;
  size?: string;
  offset?: number;
  count?: number;
};

const API_VERSION = '5.199';
const BASE_URL = 'https://api.vk.com/method';

const token = process.env.VK_API_TOKEN;
const groupId = process.env.VK_GROUP_ID;

if (!token || !groupId) {
  throw new Error('VK_API_TOKEN and VK_GROUP_ID must be provided');
}

export const fetchCollections = async () => {
  const MAX_COUNT_PER_REQUEST = 100; // Максимальное количество подборок за один запрос в VK API
  const MAX_COLLECTIONS_LIMIT = Number(process.env.MAX_COLLECTIONS_LIMIT) || 10; // Лимит для тестирования
  const allItems: any[] = [];
  let offset = 0;
  let totalCount = 0;

  while (true) {
    // Задержка между запросами для избежания rate limiting (кроме первого запроса)
    if (offset > 0) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    const { data } = await axios.get(`${BASE_URL}/market.getAlbums`, {
      params: {
        owner_id: `-${groupId}`,
        v: API_VERSION,
        access_token: token,
        offset,
        count: MAX_COUNT_PER_REQUEST,
      },
      timeout: 10000,
    });

    const response = data.response ?? { count: 0, items: [] };

    if (response.items && response.items.length > 0) {
      allItems.push(...response.items);
      totalCount = response.count || allItems.length;

      // Ограничиваем количество подборок для тестирования
      if (allItems.length >= MAX_COLLECTIONS_LIMIT) {
        allItems.splice(MAX_COLLECTIONS_LIMIT);
        break;
      }

      // Если получили меньше подборок, чем запрашивали, значит это последняя страница
      if (response.items.length < MAX_COUNT_PER_REQUEST) {
        break;
      }

      offset += MAX_COUNT_PER_REQUEST;

      // Защита от бесконечного цикла
      if (offset >= totalCount) {
        break;
      }
    } else {
      break;
    }
  }

  const result = {
    count: Math.min(totalCount, MAX_COLLECTIONS_LIMIT),
    items: allItems,
  };

  if (allItems.length >= MAX_COLLECTIONS_LIMIT) {
    console.log(`⚠️ Collections limited to ${MAX_COLLECTIONS_LIMIT} for testing (total available: ${totalCount})`);
  }

  return result;
};

export const fetchProducts = async (params: FetchProductsParams) => {
  try {
    const { data } = await axios.get(`${BASE_URL}/market.get`, {
      params: {
        owner_id: `-${groupId}`,
        album_id: params.albumId,
        q: params.query,
        v: API_VERSION,
        access_token: token,
        offset: params.offset,
        count: params.count,
        extended: 1, // Получаем расширенную информацию, включая все фото
      },
      timeout: 30000, // 30 секунд таймаут
    });

    // Проверяем на ошибки VK API
    if (data.error) {
      const errorMsg = `VK API Error: ${data.error.error_code || 'Unknown'} - ${data.error.error_msg || 'Unknown error'}`;
      console.error(`   ❌ ${errorMsg}`);
      if (data.error.error_code === 15) {
        console.error(`   ℹ️  Ошибка 15: доступ к альбому запрещен. Проверьте права токена и ID альбома (${params.albumId})`);
      } else if (data.error.error_code === 100) {
        console.error(`   ℹ️  Ошибка 100: один из параметров указан неверно. Проверьте album_id: ${params.albumId}`);
      } else if (data.error.error_code === 10) {
        console.error(`   ℹ️  Ошибка 10: Internal server error - возможно коллекция слишком большая или проблемы на стороне VK API`);
        console.error(`   💡 Попробуйте запросить товары меньшими порциями или повторить запрос позже`);
      } else if (data.error.error_code === 6) {
        // Rate limit - выбрасываем специальную ошибку для retry
        throw { response: { data: { error: data.error } } };
      }
      throw new Error(errorMsg);
    }

    const response = data.response ?? { count: 0, items: [] };

    // Логируем структуру первого товара для отладки
    if (response.items && response.items.length > 0) {
      const firstItem = response.items[0];
      console.log('\n=== Product from market.get ===');
      console.log('Keys:', Object.keys(firstItem));
      console.log('Photos field:', JSON.stringify(firstItem.photos, null, 2));
      console.log('Thumb field:', JSON.stringify(firstItem.thumb, null, 2));
      console.log('Has photos array:', Array.isArray(firstItem.photos));
      console.log('Photos length:', Array.isArray(firstItem.photos) ? firstItem.photos.length : 'not array');
    }

    if (params.size) {
      response.items = response.items.filter((item: { description: string }) =>
        item.description.toLowerCase().includes(params.size!.toLowerCase()),
      );
    }

    return response;
  } catch (error: any) {
    // Обработка сетевых ошибок и таймаутов
    if (error.response && error.response.status === 504) {
      const errorMsg = `VK API Gateway Timeout (504) - возможно коллекция слишком большая или проблемы на стороне VK API`;
      console.error(`   ❌ ${errorMsg}`);
      console.error(`   💡 Попробуйте запросить товары меньшими порциями или повторить запрос позже`);
      throw new Error(errorMsg);
    }
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      const errorMsg = `Таймаут запроса к VK API - возможно коллекция слишком большая`;
      console.error(`   ❌ ${errorMsg}`);
      console.error(`   💡 Попробуйте запросить товары меньшими порциями`);
      throw new Error(errorMsg);
    }
    console.error('Error fetching products:', error);
    throw error;
  }
};

/**
 * Загружает все товары из альбома через несколько запросов (пагинация)
 * VK API ограничивает количество товаров за один запрос (максимум 200)
 * При ошибке 504 автоматически уменьшает размер запроса
 */
export const fetchAllProducts = async (params: Omit<FetchProductsParams, 'offset' | 'count' | 'size'>) => {
  const MAX_COUNT_PER_REQUEST = 50; // Максимальное количество товаров за один запрос в VK API (уменьшено для стабильности)
  const MIN_COUNT_PER_REQUEST = 10; // Минимальный размер запроса при ошибках
  const MAX_PRODUCTS_LIMIT = Number(process.env.MAX_PRODUCTS_LIMIT) || 20; // Лимит товаров для тестирования
  const allItems: any[] = [];
  let offset = 0;
  let totalCount = 0;
  let requestCount = 0;
  let currentCountPerRequest = MAX_COUNT_PER_REQUEST; // Текущий размер запроса (может уменьшаться при ошибках)

  while (true) {
    requestCount++;
    let retryCount = 0;
    const maxRetries = 3;
    let response: any = null;
    let lastError: any = null;

    // Пытаемся выполнить запрос с возможностью уменьшения размера при ошибке 504 и обработкой rate limiting
    while (retryCount < maxRetries && !response) {
      try {
        // Задержка перед запросом (кроме первого) для избежания rate limiting
        if (retryCount > 0) {
          const delay = 1000 * Math.pow(2, retryCount - 1); // Экспоненциальная задержка: 1s, 2s, 4s
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        // Загружаем без фильтра по размеру, фильтрация будет применена позже
        response = await fetchProducts({
          albumId: params.albumId,
          query: params.query,
          offset,
          count: currentCountPerRequest,
        });
        lastError = null;
        break; // Успешный запрос
      } catch (error: any) {
        lastError = error;
        
        // Обработка rate limiting (ошибка 6)
        if (error.response?.data?.error?.error_code === 6 || 
            error.message?.includes('Too many requests') ||
            error.response?.data?.error?.error_msg?.toLowerCase().includes('too many requests')) {
          const delay = 2000 * Math.pow(2, retryCount); // Экспоненциальная задержка: 2s, 4s, 8s, 16s, 32s
          console.log(`   ⚠️  Rate limit (error 6) на попытке ${retryCount + 1}/${maxRetries}, ждем ${delay}ms...`);
          retryCount++;
          await new Promise(resolve => setTimeout(resolve, delay));
          continue; // Повторяем попытку
        }
        
        // Обработка ошибок сервера (502, 503, 504) - временные ошибки, можно повторить
        const statusCode = error.response?.status;
        if (statusCode === 502 || statusCode === 503 || statusCode === 504 ||
            error.message?.includes('502') || error.message?.includes('503') || error.message?.includes('504') ||
            error.message?.includes('Bad Gateway') || error.message?.includes('Service Unavailable') || 
            error.message?.includes('Gateway Timeout')) {
          const delay = 2000 * Math.pow(2, retryCount); // Экспоненциальная задержка: 2s, 4s, 8s
          console.log(`   ⚠️  Ошибка сервера (${statusCode || 'network'}) на попытке ${retryCount + 1}/${maxRetries}, ждем ${delay}ms...`);
          retryCount++;
          await new Promise(resolve => setTimeout(resolve, delay));
          continue; // Повторяем попытку
        }
        
        // Если ошибка 504 или таймаут, уменьшаем размер запроса
        if ((error.response?.status === 504 || error.code === 'ECONNABORTED' || error.message?.includes('timeout') || error.message?.includes('504')) 
            && currentCountPerRequest > MIN_COUNT_PER_REQUEST) {
          const newCount = Math.max(MIN_COUNT_PER_REQUEST, Math.floor(currentCountPerRequest / 2));
          console.log(`   ⚠️  Ошибка при запросе (count=${currentCountPerRequest}), уменьшаем до ${newCount} и повторяем...`);
          currentCountPerRequest = newCount;
          retryCount++;
          // Небольшая задержка перед повтором
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          // Другая ошибка или уже минимальный размер - выбрасываем ошибку
          throw error;
        }
      }
    }

    if (!response && lastError) {
      // Не удалось получить ответ после всех попыток
      throw lastError;
    }

    // Логируем первый запрос для отладки
    if (requestCount === 1) {
      console.log(`   🔍 Запрос к VK API: album_id=${params.albumId}, offset=${offset}, count=${currentCountPerRequest}`);
      console.log(`   📊 Ответ VK API: count=${response.count || 0}, items.length=${response.items?.length || 0}`);
    }

    if (response.items && response.items.length > 0) {
      allItems.push(...response.items);
      totalCount = response.count || allItems.length;

      // Ограничиваем количество товаров для тестирования
      if (allItems.length >= MAX_PRODUCTS_LIMIT) {
        allItems.splice(MAX_PRODUCTS_LIMIT);
        break;
      }

      // Если получили меньше товаров, чем запрашивали, значит это последняя страница
      if (response.items.length < currentCountPerRequest) {
        break;
      }

      offset += response.items.length; // Используем фактическое количество полученных товаров

      // Защита от бесконечного цикла
      if (offset >= totalCount) {
        break;
      }
    } else {
      // Если items пустой, но count > 0, это может быть ошибка
      if (response.count && response.count > 0 && allItems.length === 0) {
        console.log(`   ⚠️  VK API вернул count=${response.count}, но items пуст - возможно проблема с правами доступа или коллекция пуста`);
      }
      break;
    }
  }

  const result = {
    count: Math.min(totalCount, MAX_PRODUCTS_LIMIT),
    items: allItems,
  };

  if (allItems.length >= MAX_PRODUCTS_LIMIT) {
    console.log(`   ⚠️ Products limited to ${MAX_PRODUCTS_LIMIT} for testing (total available: ${totalCount})`);
  } else if (allItems.length === 0 && totalCount > 0) {
    console.log(`   ⚠️  Товары не загружены, хотя VK API сообщает о ${totalCount} товарах в коллекции`);
  }

  return result;
};

/**
 * Получает все фото по их ID через photos.getById
 * @param photoIds - Массив ID фото в формате "owner_id_photo_id"
 * @returns Массив фото с полной информацией
 */
export const fetchPhotosById = async (photoIds: string[]) => {
  if (!token || photoIds.length === 0) {
    return [];
  }

  const result = await executeWithRateLimit(async () => {
    const { data } = await axios.get(`${BASE_URL}/photos.getById`, {
      params: {
        photos: photoIds.join(','),
        v: API_VERSION,
        access_token: token,
      },
      timeout: 10000,
    });

    if (data.error) {
      // Если это не rate limit, выбрасываем ошибку
      if (data.error.error_code !== 6) {
        console.error('VK API Error in photos.getById:', data.error);
        throw new Error(`VK API Error: ${data.error.error_code} - ${data.error.error_msg}`);
      }
      // Для rate limit выбрасываем специальную ошибку для retry
      throw { response: { data: { error: data.error } } };
    }

    return data.response || [];
  }, 5, 1000); // Увеличиваем до 5 попыток

  return result || [];
};

/**
 * Получает полную информацию о товаре, включая все фото, через market.getById
 * @param itemId - ID товара
 * @returns Полная информация о товаре или null
 */
/**
 * Выполняет запрос к VK API с обработкой rate limiting, ошибок сервера (502, 503, 504) и автоматическим retry
 * @param requestFn - Функция, выполняющая запрос
 * @param maxRetries - Максимальное количество попыток
 * @param baseDelay - Базовая задержка между попытками (мс)
 * @returns Результат запроса или null при ошибке
 */
async function executeWithRateLimit<T>(
  requestFn: () => Promise<T>,
  maxRetries: number = 5, // Увеличиваем до 5 попыток для rate limit
  baseDelay: number = 1000
): Promise<T | null> {
  let lastError: any = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await requestFn();
      return result;
    } catch (error: any) {
      lastError = error;
      
      // Проверяем на ошибку rate limiting (код 6)
      if (error.response?.data?.error?.error_code === 6 || 
          (error.response?.data?.error?.error_msg?.toLowerCase().includes('too many requests'))) {
        // Экспоненциальная задержка: 2s, 4s, 8s, 16s, 32s (увеличиваем задержки для rate limit)
        const delay = baseDelay * 2 * Math.pow(2, attempt);
        console.warn(`⚠️  Rate limit (error 6) на попытке ${attempt + 1}/${maxRetries}, ждем ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue; // Повторяем попытку
      }
      
      // Обработка ошибок сервера (502, 503, 504) - временные ошибки, можно повторить
      const statusCode = error.response?.status || error.code;
      if (statusCode === 502 || statusCode === 503 || statusCode === 504 || 
          error.message?.includes('502') || error.message?.includes('503') || error.message?.includes('504') ||
          error.message?.includes('Bad Gateway') || error.message?.includes('Service Unavailable') || 
          error.message?.includes('Gateway Timeout')) {
        // Экспоненциальная задержка: 1s, 2s, 4s, 8s, 16s
        const delay = baseDelay * Math.pow(2, attempt);
        console.warn(`⚠️  Ошибка сервера (${statusCode || 'network'}) на попытке ${attempt + 1}/${maxRetries}, ждем ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue; // Повторяем попытку
      }
      
      // Для других ошибок выбрасываем исключение
      throw error;
    }
  }
  
  // Если все попытки исчерпаны
  if (lastError) {
    const errorType = lastError.response?.data?.error?.error_code === 6 ? 'rate limit' : 
                     (lastError.response?.status ? `HTTP ${lastError.response.status}` : 'network');
    console.error(`❌ Не удалось выполнить запрос после ${maxRetries} попыток (${errorType}):`, lastError.message || lastError);
  }
  
  return null;
}

export const fetchProductById = async (itemId: number) => {
  if (!token || !groupId) {
    throw new Error('VK_API_TOKEN and VK_GROUP_ID must be provided');
  }

  const result = await executeWithRateLimit(async () => {
    const { data } = await axios.get(`${BASE_URL}/market.getById`, {
      params: {
        item_ids: `-${groupId}_${itemId}`,
        v: API_VERSION,
        access_token: token,
        extended: 1, // Получаем расширенную информацию, включая все фото в массиве photos
      },
      timeout: 10000, // Увеличиваем таймаут до 10 секунд для надежности
    });

    if (data.error) {
      // Если это не rate limit, выбрасываем ошибку
      if (data.error.error_code !== 6) {
        console.error(`VK API Error in getById for product ${itemId}:`, data.error);
        throw new Error(`VK API Error: ${data.error.error_code} - ${data.error.error_msg}`);
      }
      // Для rate limit выбрасываем специальную ошибку для retry
      throw { response: { data: { error: data.error } } };
    }
    
    return data;
  }, 5, 1000); // Увеличиваем до 5 попыток

  if (!result) {
    return null;
  }

  const data = result;

  try {
    if (data.response && data.response.items && data.response.items.length > 0) {
      const product = data.response.items[0];
      
      // Логируем структуру товара для отладки (для первых нескольких товаров)
      const shouldLog = itemId === data.response.items[0]?.id || 
                       (typeof process.env.LOG_PRODUCT_ID !== 'undefined' && itemId === Number(process.env.LOG_PRODUCT_ID));
      
      if (shouldLog) {
        console.log(`\n=== Product ${itemId} from getById ===`);
        console.log('Product keys:', Object.keys(product));
        console.log('Photos type:', typeof product.photos, 'Is array:', Array.isArray(product.photos));
        if (Array.isArray(product.photos)) {
          console.log('Photos count:', product.photos.length);
          if (product.photos.length > 0) {
            console.log('First photo type:', typeof product.photos[0]);
            if (typeof product.photos[0] === 'number') {
              console.log('Photos are IDs (numbers):', product.photos.slice(0, 5));
            } else if (typeof product.photos[0] === 'object') {
              console.log('First photo keys:', Object.keys(product.photos[0]));
              console.log('First photo ID:', product.photos[0]?.id);
              console.log('First photo has sizes:', !!product.photos[0]?.sizes);
            }
          }
        }
        console.log('Thumb type:', typeof product.thumb, 'Is array:', Array.isArray(product.thumb));
        if (Array.isArray(product.thumb)) {
          console.log('Thumb count:', product.thumb.length);
        }
      }
      
      // С extended=1 фото уже приходят в полном формате с orig_photo и sizes
      // Проверяем все возможные поля с фото:
      // 1. product.photos - массив объектов с полной информацией о фото (с extended=1)
      // 2. product.thumb - массив миниатюр
      // 3. product.attachments - вложения с фото
      
      // С extended=1 photos уже содержит полную информацию, не нужно делать дополнительный запрос
      // Но если photos - массив ID (числа), то нужно получить их через photos.getById
      if (product.photos && Array.isArray(product.photos) && product.photos.length > 0) {
        const firstPhoto = product.photos[0];
        
        // Если это массив ID (числа), получаем полную информацию через photos.getById
        if (typeof firstPhoto === 'number') {
          const photoIds = product.photos.map((id: number) => `-${groupId}_${id}`);
          console.log(`Fetching ${photoIds.length} photos by ID for product ${itemId}...`);
          const fullPhotos = await fetchPhotosById(photoIds);
          
          if (fullPhotos.length > 0) {
            product.photos = fullPhotos;
            console.log(`Got ${fullPhotos.length} full photos for product ${itemId}`);
          }
        }
        // Если это уже массив объектов с полной информацией (с extended=1), оставляем как есть
        // product.photos уже содержит все необходимое
      }
      
      // НЕ добавляем фото из массива thumb к photos, так как:
      // 1. thumb содержит миниатюры тех же фото, что уже есть в photos (или thumb_photo)
      // 2. Это вызывает дублирование - одно и то же фото загружается дважды в разных размерах
      // 3. thumb_photo уже используется отдельно как обложка
      // Если photos пустой, используем thumb только как fallback
      if ((!product.photos || (Array.isArray(product.photos) && product.photos.length === 0)) 
          && product.thumb && Array.isArray(product.thumb) && product.thumb.length > 0) {
        // Используем thumb только если photos полностью пустой (fallback)
        product.photos = product.thumb;
      }
      
      return product;
    }

    return null;
  } catch (error: any) {
    if (error.code === 'ECONNABORTED') {
      console.warn(`Timeout fetching product ${itemId} by ID`);
    } else {
      console.error(`Error fetching product ${itemId} by ID:`, error.message || error);
    }
    return null;
  }
};

/**
 * Обогащает товары полной информацией, включая все фото
 * @param items - Массив товаров из market.get
 * @returns Массив товаров с полной информацией
 */
export const enrichProductsWithPhotos = async (items: any[]) => {
  // Обрабатываем товары батчами, чтобы не перегружать API
  // Увеличиваем размер батча для ускорения загрузки
  const BATCH_SIZE = 15; // Увеличено с 5 до 15 для параллельной обработки
  const enrichedItems = [];

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    
    try {
      // Обрабатываем батч параллельно
      const enrichedBatch = await Promise.allSettled(
        batch.map(async (item) => {
          try {
            const fullProduct = await fetchProductById(item.id);
            
            // Если получили полную информацию, используем её, особенно фото
            if (fullProduct) {
              // Объединяем фото из getById и оригинального товара
              // getById может вернуть больше фото, но если их нет, используем оригинальные
              let finalPhotos = fullProduct.photos;
              
              // Если getById не вернул фото или вернул пустой массив, используем оригинальные
              if (!finalPhotos || (Array.isArray(finalPhotos) && finalPhotos.length === 0)) {
                finalPhotos = item.photos;
              }
              
              // Если все еще нет фото, но есть thumb_photo, создаем массив из него
              if ((!finalPhotos || (Array.isArray(finalPhotos) && finalPhotos.length === 0)) && item.thumb_photo) {
                finalPhotos = [{ photo_1280: item.thumb_photo, photo_604: item.thumb_photo }];
              }

              return {
                ...item,
                photos: finalPhotos || [],
                thumb_photo: fullProduct.thumb_photo || item.thumb_photo,
                thumb: fullProduct.thumb || item.thumb,
              };
            }
            
            // Если не получили, возвращаем оригинальный товар
            return item;
          } catch (error) {
            console.error(`Error enriching product ${item.id}:`, error);
            // Возвращаем оригинальный товар при ошибке
            return item;
          }
        })
      );

      // Обрабатываем результаты Promise.allSettled
      enrichedBatch.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          enrichedItems.push(result.value);
        } else {
          console.error('Error in batch enrichment:', result.reason);
          // Используем оригинальный товар при ошибке
          enrichedItems.push(batch[index]);
        }
      });

      // Уменьшаем задержку между батчами для ускорения (было 200ms, стало 50ms)
      if (i + BATCH_SIZE < items.length) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    } catch (error) {
      console.error(`Error processing batch starting at index ${i}:`, error);
      // В случае ошибки батча, добавляем оригинальные товары
      enrichedItems.push(...batch);
    }
  }

  return enrichedItems;
};

/**
 * Получает ID группы по её короткому имени (screen_name)
 * @param screenName - короткое имя группы (например, "street.football.club")
 * @returns ID группы или null, если не найдено
 */
export const resolveGroupId = async (screenName: string): Promise<number | null> => {
  if (!token) {
    throw new Error('VK_API_TOKEN must be provided');
  }

  // Убираем префикс vk.com/ если есть
  const cleanScreenName = screenName.replace(/^(https?:\/\/)?(www\.)?vk\.com\//, '');

  try {
    const { data } = await axios.get(`${BASE_URL}/utils.resolveScreenName`, {
      params: {
        screen_name: cleanScreenName,
        v: API_VERSION,
        access_token: token,
      },
    });

    if (data.response && data.response.type === 'group') {
      return Math.abs(data.response.object_id); // Возвращаем положительный ID
    }

    return null;
  } catch (error) {
    console.error('Error resolving group ID:', error);
    return null;
  }
};









