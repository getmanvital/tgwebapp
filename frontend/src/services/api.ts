import axios from 'axios';
import type { Collection, Product } from '../types';
import { getBackendUrl } from '../utils/backendUrl';

const client = axios.create({
  baseURL: getBackendUrl(),
  timeout: 30000,
});


export const getCollections = async (forceReload = false): Promise<Collection[]> => {
  const params = forceReload ? { _t: Date.now() } : {};
  
  try {
    const backendUrl = getBackendUrl();
    console.log('Fetching collections from:', `${backendUrl}/products/collections`);
    
    const { data } = await client.get('/products/collections', { params });
    
    console.log('Collections response:', data);
    
    if (!data || !Array.isArray(data.items)) {
      console.warn('Unexpected response format:', data);
      return [];
    }
    
    return data.items;
  } catch (error: any) {
    const backendUrl = getBackendUrl();
    console.error('Error fetching collections:', {
      error,
      message: error?.message,
      response: error?.response?.data,
      status: error?.response?.status,
      backendUrl,
      fullUrl: `${backendUrl}/products/collections`,
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
    const { data } = await client.get(`/products/${productId}/photos`, {
      timeout: 10000, // 10 секунд таймаут
    });

    return data.photos ?? [];
  } catch (error: any) {
    console.error('Error fetching product photos:', error);
    throw error;
  }
};









