import axios from 'axios';
import type { Collection, Product } from '../types';
import { getBackendUrl } from '../utils/backendUrl';

// Создаем функцию для получения клиента с актуальным baseURL
const getClient = () => {
  const baseURL = getBackendUrl();
  console.log('[API] Creating axios client with baseURL:', baseURL);
  console.log('[API] VITE_BACKEND_URL from env:', import.meta.env.VITE_BACKEND_URL);
  console.log('[API] import.meta.env:', {
    MODE: import.meta.env.MODE,
    DEV: import.meta.env.DEV,
    PROD: import.meta.env.PROD,
    VITE_BACKEND_URL: import.meta.env.VITE_BACKEND_URL,
  });
  
  return axios.create({
    baseURL,
    timeout: 30000,
  });
};


export const getCollections = async (forceReload = false): Promise<Collection[]> => {
  const params = forceReload ? { _t: Date.now() } : {};
  
  try {
    const client = getClient();
    const backendUrl = getBackendUrl();
    const fullUrl = `${backendUrl}/products/collections`;
    console.log('[API] Fetching collections from:', fullUrl);
    console.log('[API] Request params:', params);
    
    const { data } = await client.get('/products/collections', { params });
    
    console.log('Collections response:', data);
    
    if (!data || !Array.isArray(data.items)) {
      console.warn('Unexpected response format:', data);
      return [];
    }
    
    console.log('[API] Collections response received:', {
      count: data?.count,
      itemsLength: data?.items?.length,
      data,
    });
    return data.items;
  } catch (error: any) {
    const backendUrl = getBackendUrl();
    const fullUrl = `${backendUrl}/products/collections`;
    console.error('[API] Error fetching collections:', {
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
      timeout: 60000, // 60 секунд таймаут для обогащения товаров
    });

    return data.items ?? [];
  } catch (error: any) {
    console.error('Error fetching products:', error);
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
      timeout: 10000, // 10 секунд таймаут
    });

    return data.photos ?? [];
  } catch (error: any) {
    console.error('Error fetching product photos:', error);
    throw error;
  }
};









