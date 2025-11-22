import axios from 'axios';
import type { Collection, Product, User } from '../types';
import { getBackendUrl } from '../utils/backendUrl';
import { logger } from '../utils/logger';

// Создаем функцию для получения клиента с актуальным baseURL
const getClient = () => {
  const baseURL = getBackendUrl();
  logger.debug('[API] Creating axios client with baseURL:', baseURL);
  logger.debug('[API] VITE_BACKEND_URL from env:', import.meta.env.VITE_BACKEND_URL);
  logger.debug('[API] import.meta.env:', {
    MODE: import.meta.env.MODE,
    DEV: import.meta.env.DEV,
    PROD: import.meta.env.PROD,
    VITE_BACKEND_URL: import.meta.env.VITE_BACKEND_URL,
  });
  
  return axios.create({
    baseURL,
    timeout: 30000, // 30 секунд - достаточный таймаут для большинства запросов
  });
};


export const getCollections = async (forceReload = false): Promise<Collection[]> => {
  const params = forceReload ? { _t: Date.now() } : {};
  
  try {
    const client = getClient();
    const backendUrl = getBackendUrl();
    const fullUrl = `${backendUrl}/products/collections`;
    logger.debug('[API] Fetching collections from:', fullUrl);
    logger.debug('[API] Request params:', params);
    
    const { data } = await client.get('/products/collections', { params });
    
    logger.debug('Collections response:', data);
    
    if (!data || !Array.isArray(data.items)) {
      logger.warn('Unexpected response format:', data);
      return [];
    }
    
    logger.debug('[API] Collections response received:', {
      count: data?.count,
      itemsLength: data?.items?.length,
      data,
    });
    return data.items;
  } catch (error: any) {
    const backendUrl = getBackendUrl();
    const fullUrl = `${backendUrl}/products/collections`;
    logger.error('[API] Error fetching collections:', {
      error,
      message: error?.message,
      code: error?.code,
      response: error?.response?.data,
      status: error?.response?.status,
      statusText: error?.response?.statusText,
      backendUrl,
      fullUrl,
      requestUrl: error?.config?.url,
      requestBaseURL: error?.config?.baseURL,
    });
    throw error;
  }
};

type GetProductsParams = {
  albumId?: string;
  query?: string;
  size?: string;
};

export const getProducts = async (
  params: GetProductsParams = {},
  forceReload = false,
): Promise<Product[]> => {
  try {
    const client = getClient();
    const requestParams: any = {
      album_id: params.albumId,
      q: params.query,
      size: params.size,
    };
    
    // Добавляем timestamp для принудительной перезагрузки
    if (forceReload) {
      requestParams._t = Date.now();
    }

    const { data } = await client.get('/products', {
      params: requestParams,
      timeout: 30000, // 30 секунд - оптимизированный таймаут
    });

    return data.items ?? [];
  } catch (error: any) {
    logger.error('Error fetching products:', error);
    throw error;
  }
};

/**
 * Получает все фото товара (полные фото, не только обложка)
 * @param productId - ID товара
 * @returns Массив URL фото
 */
export const getProductPhotos = async (productId: number): Promise<string[]> => {
  try {
    const client = getClient();
    const { data } = await client.get(`/products/${productId}/photos`, {
      timeout: 15000, // 15 секунд - достаточный таймаут для загрузки фотографий
    });

    return data.photos ?? [];
  } catch (error: any) {
    logger.error('Error fetching product photos:', error);
    throw error;
  }
};

/**
 * Сохраняет данные пользователя на бэкенд
 * @param userData - Данные пользователя из Telegram
 * @returns Promise с результатом сохранения
 */
export const saveUser = async (userData: {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}): Promise<void> => {
  try {
    const client = getClient();
    await client.post('/auth/user', userData, {
      timeout: 10000, // 10 секунд - достаточный таймаут для сохранения
    });
  } catch (error: any) {
    // Логируем только ошибки, не блокируем работу приложения
    logger.warn('[API] Error saving user data:', {
      error: error?.message,
      status: error?.response?.status,
      userId: userData.id,
    });
    // Не пробрасываем ошибку, чтобы не блокировать работу приложения
  }
};

export interface UsersResponse {
  count: number;
  users: User[];
}

/**
 * Получает список всех пользователей (только для администратора)
 * @param adminUsername - Username администратора для проверки прав
 * @returns Promise со списком пользователей
 */
// Функция нормализации username (убирает @ если есть)
const normalizeUsername = (username: string): string => {
  return username.startsWith('@') ? username.slice(1) : username;
};

export const getUsers = async (adminUsername: string): Promise<UsersResponse> => {
  try {
    if (!adminUsername) {
      throw new Error('Admin username is required');
    }
    
    // Нормализуем username (убираем @ если есть)
    const normalizedUsername = normalizeUsername(adminUsername);
    
    const client = getClient();
    logger.debug('[API] Fetching users with admin username:', { original: adminUsername, normalized: normalizedUsername });
    
    const { data } = await client.get<UsersResponse>('/auth/users', {
      headers: {
        'X-Admin-Username': normalizedUsername,
      },
      timeout: 15000,
    });
    
    logger.debug('[API] Users fetched successfully', { count: data.count });
    return data;
  } catch (error: any) {
    logger.error('[API] Error fetching users:', {
      error: error?.message,
      status: error?.response?.status,
      statusText: error?.response?.statusText,
      responseData: error?.response?.data,
      adminUsername,
      config: {
        url: error?.config?.url,
        headers: error?.config?.headers,
      },
    });
    throw error;
  }
};









