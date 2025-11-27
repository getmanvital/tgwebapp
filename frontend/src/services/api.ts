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
    if (!userData.id || !userData.first_name) {
      logger.warn('[API] Cannot save user: missing id or first_name', {
        hasId: !!userData.id,
        hasFirstName: !!userData.first_name,
        userId: userData.id,
      });
      return;
    }
    
    const client = getClient();
    const response = await client.post('/auth/user', userData, {
      timeout: 10000, // 10 секунд - достаточный таймаут для сохранения
    });
    
    logger.debug('[API] User data saved successfully', {
      userId: userData.id,
      username: userData.username,
      responseStatus: response.status,
    });
  } catch (error: any) {
    // Логируем ошибки подробно для диагностики
    logger.error('[API] Error saving user data:', {
      error: error?.message,
      status: error?.response?.status,
      statusText: error?.response?.statusText,
      responseData: error?.response?.data,
      userId: userData.id,
      username: userData.username,
      firstName: userData.first_name,
      code: error?.code,
      config: {
        url: error?.config?.url,
        method: error?.config?.method,
      },
    });
    // Не пробрасываем ошибку, чтобы не блокировать работу приложения
  }
};

export interface UsersResponse {
  count: number; // Количество пользователей в текущем ответе
  totalCount?: number; // Общее количество пользователей в базе данных
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

export const getUsers = async (adminUsername: string, forceRefresh = false): Promise<UsersResponse> => {
  try {
    if (!adminUsername) {
      throw new Error('Admin username is required');
    }
    
    // Нормализуем username (убираем @ если есть)
    const normalizedUsername = normalizeUsername(adminUsername);
    
    const client = getClient();
    logger.debug('[API] Fetching users with admin username:', { original: adminUsername, normalized: normalizedUsername });
    
    // Добавляем timestamp для обхода кэша при необходимости
    const params: any = {};
    if (forceRefresh) {
      params._t = Date.now();
    }
    
    logger.debug('[API] Making request to /auth/users', {
      normalizedUsername,
      forceRefresh,
      headers: {
        'X-Admin-Username': normalizedUsername,
      },
    });
    
    const { data } = await client.get<UsersResponse>('/auth/users', {
      headers: {
        'X-Admin-Username': normalizedUsername,
      },
      params, // Добавляем параметры для обхода кэша
      timeout: 15000,
    });
    
    logger.info('[API] Users fetched successfully', { 
      count: data.count, 
      totalCount: data.totalCount,
      usersLength: data.users?.length,
      firstUserId: data.users?.[0]?.id,
      allUserIds: data.users?.map(u => u.id),
      responseData: data,
    });
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

/**
 * Получает только количество пользователей в базе данных (только для администратора)
 * @param adminUsername - Username администратора для проверки прав
 * @returns Promise с количеством пользователей
 */
export const getUsersCount = async (adminUsername: string): Promise<number> => {
  try {
    if (!adminUsername) {
      throw new Error('Admin username is required');
    }
    
    const normalizedUsername = normalizeUsername(adminUsername);
    const client = getClient();
    
    const { data } = await client.get<{ count: number }>('/auth/users/count', {
      headers: {
        'X-Admin-Username': normalizedUsername,
      },
      timeout: 10000,
    });
    
    logger.debug('[API] User count fetched successfully', { count: data.count });
    return data.count;
  } catch (error: any) {
    logger.error('[API] Error fetching user count:', {
      error: error?.message,
      status: error?.response?.status,
      responseData: error?.response?.data,
      adminUsername,
    });
    throw error;
  }
};

/**
 * Проверяет, существует ли пользователь в базе данных
 * @param userId - ID пользователя для проверки
 * @returns Promise с данными пользователя или null, если не найден
 */
export const checkUserExists = async (userId: number): Promise<User | null> => {
  try {
    const client = getClient();
    const { data } = await client.get<User>(`/auth/user/${userId}`, {
      timeout: 10000,
    });
    return data;
  } catch (error: any) {
    if (error?.response?.status === 404) {
      return null; // Пользователь не найден
    }
    logger.error('[API] Error checking user existence:', {
      error: error?.message,
      status: error?.response?.status,
      userId,
    });
    throw error;
  }
};

/**
 * Удаляет всех пользователей из базы данных (только для администратора)
 * @param adminUsername - Username администратора для проверки прав
 * @returns Promise с результатом удаления
 */
export const deleteAllUsers = async (adminUsername: string): Promise<{ success: boolean; message: string; deletedCount: number }> => {
  try {
    if (!adminUsername) {
      throw new Error('Admin username is required');
    }
    
    const normalizedUsername = normalizeUsername(adminUsername);
    const client = getClient();
    
    logger.warn('[API] Attempting to delete all users', { adminUsername: normalizedUsername });
    
    const { data } = await client.delete<{ success: boolean; message: string; deletedCount: number }>('/auth/users', {
      headers: {
        'X-Admin-Username': normalizedUsername,
      },
      timeout: 15000,
    });
    
    logger.warn('[API] All users deleted successfully', { deletedCount: data.deletedCount });
    return data;
  } catch (error: any) {
    logger.error('[API] Error deleting all users:', {
      error: error?.message,
      status: error?.response?.status,
      responseData: error?.response?.data,
      adminUsername,
    });
    throw error;
  }
};

/**
 * Отправляет запрос о товаре менеджеру
 * @param userId - ID пользователя Telegram
 * @param productId - ID товара
 * @param productTitle - Название товара
 * @param productPrice - Цена товара (опционально)
 * @returns Promise с результатом отправки
 */
export const sendProductContactRequest = async (
  userId: number,
  productId: number,
  productTitle: string,
  productPrice?: string
): Promise<{ success: boolean; messageId: number; sentAt: string }> => {
  try {
    const client = getClient();
    const { data } = await client.post('/messages/contact', {
      userId,
      productId,
      productTitle,
      productPrice,
    }, {
      timeout: 30000,
    });

    logger.debug('[API] Product contact request sent successfully', {
      userId,
      productId,
      messageId: data.messageId,
    });

    return data;
  } catch (error: any) {
    logger.error('[API] Error sending product contact request:', {
      error: error?.message,
      status: error?.response?.status,
      responseData: error?.response?.data,
      userId,
      productId,
    });
    throw error;
  }
};

export type ChatAttachmentMeta = {
  provider?: string;
  key?: string;
  relativePath?: string;
  mimeType?: string;
  size?: number;
  width?: number;
  height?: number;
  format?: string;
  [key: string]: unknown;
};

export interface Chat {
  userId: number;
  userName: string;
  firstName: string;
  lastName: string | null;
  username: string | null;
  photoUrl: string | null;
  unreadCount: number;
  lastMessage: {
    id: number;
    content: string;
    direction: 'user_to_manager' | 'manager_to_user';
    sentAt: string;
    attachmentType: 'image' | null;
    attachmentUrl: string | null;
    attachmentMeta: ChatAttachmentMeta | null;
  };
  product: {
    id: number;
    title: string;
  } | null;
}

export interface ChatsResponse {
  chats: Chat[];
}

/**
 * Получает список активных чатов (только для администратора)
 * @param adminUsername - Username администратора для проверки прав
 * @returns Promise со списком чатов
 */
export const getChats = async (adminUsername: string): Promise<ChatsResponse> => {
  try {
    if (!adminUsername) {
      throw new Error('Admin username is required');
    }

    const normalizedUsername = normalizeUsername(adminUsername);
    const client = getClient();

    const { data } = await client.get<ChatsResponse>('/messages/chats', {
      headers: {
        'X-Admin-Username': normalizedUsername,
      },
      timeout: 15000,
    });

    logger.debug('[API] Chats fetched successfully', {
      count: data.chats?.length,
    });

    return data;
  } catch (error: any) {
    logger.error('[API] Error fetching chats:', {
      error: error?.message,
      status: error?.response?.status,
      responseData: error?.response?.data,
      adminUsername,
    });
    throw error;
  }
};

export interface ChatMessage {
  id: number;
  direction: 'user_to_manager' | 'manager_to_user';
  content: string;
  productId: number | null;
  productTitle: string | null;
  productPrice: string | null;
  sentAt: string;
  readAt: string | null;
  attachmentType: 'image' | null;
  attachmentUrl: string | null;
  attachmentMeta: ChatAttachmentMeta | null;
}

export interface ChatHistoryResponse {
  user: {
    id: number;
    firstName: string;
    lastName: string | null;
    username: string | null;
    photoUrl: string | null;
  };
  messages: ChatMessage[];
}

/**
 * Получает историю переписки с конкретным пользователем (только для администратора)
 * @param adminUsername - Username администратора для проверки прав
 * @param userId - ID пользователя
 * @returns Promise с историей переписки
 */
export const getChatHistory = async (
  adminUsername: string,
  userId: number
): Promise<ChatHistoryResponse> => {
  try {
    if (!adminUsername) {
      throw new Error('Admin username is required');
    }

    const normalizedUsername = normalizeUsername(adminUsername);
    const client = getClient();

    const { data } = await client.get<ChatHistoryResponse>(`/messages/chats/${userId}`, {
      headers: {
        'X-Admin-Username': normalizedUsername,
      },
      timeout: 15000,
    });

    logger.debug('[API] Chat history fetched successfully', {
      userId,
      messageCount: data.messages?.length,
    });

    return data;
  } catch (error: any) {
    logger.error('[API] Error fetching chat history:', {
      error: error?.message,
      status: error?.response?.status,
      responseData: error?.response?.data,
      adminUsername,
      userId,
    });
    throw error;
  }
};

/**
 * Отправляет сообщение клиенту от менеджера (только для администратора)
 * @param adminUsername - Username администратора для проверки прав
 * @param userId - ID клиента
 * @param message - Текст сообщения
 * @returns Promise с результатом отправки
 */
export const sendMessageToClient = async (
  adminUsername: string,
  userId: number,
  message: string
): Promise<{ success: boolean; messageId: number; sentAt: string }> => {
  try {
    if (!adminUsername) {
      throw new Error('Admin username is required');
    }

    if (!message || message.trim().length === 0) {
      throw new Error('Message cannot be empty');
    }

    const normalizedUsername = normalizeUsername(adminUsername);
    const client = getClient();

    const { data } = await client.post(
      `/messages/chats/${userId}/send`,
      { message: message.trim() },
      {
        headers: {
          'X-Admin-Username': normalizedUsername,
        },
        timeout: 30000,
      }
    );

    logger.debug('[API] Message sent to client successfully', {
      userId,
      messageId: data.messageId,
    });

    return data;
  } catch (error: any) {
    logger.error('[API] Error sending message to client:', {
      error: error?.message,
      status: error?.response?.status,
      responseData: error?.response?.data,
      adminUsername,
      userId,
    });
    throw error;
  }
};

export const sendImageToClient = async (
  adminUsername: string,
  userId: number,
  file: File,
  caption?: string
): Promise<{ success: boolean; messageId: number; sentAt: string; attachmentUrl: string }> => {
  try {
    if (!adminUsername) {
      throw new Error('Admin username is required');
    }

    if (!file) {
      throw new Error('Image file is required');
    }

    const normalizedUsername = normalizeUsername(adminUsername);
    const client = getClient();
    const formData = new FormData();
    formData.append('file', file);
    if (caption && caption.trim().length > 0) {
      formData.append('caption', caption.trim());
    }

    const { data } = await client.post(`/messages/chats/${userId}/send-image`, formData, {
      headers: {
        'X-Admin-Username': normalizedUsername,
        'Content-Type': 'multipart/form-data',
      },
      timeout: 30000,
    });

    logger.debug('[API] Image sent to client successfully', {
      userId,
      messageId: data.messageId,
    });

    return data;
  } catch (error: any) {
    logger.error('[API] Error sending image to client:', {
      error: error?.message,
      status: error?.response?.status,
      responseData: error?.response?.data,
      adminUsername,
      userId,
    });
    throw error;
  }
};





