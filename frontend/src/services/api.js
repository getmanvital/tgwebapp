import axios from 'axios';
const client = axios.create({
    baseURL: import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:4000',
});
export const getCollections = async (forceReload = false) => {
    try {
        const params = forceReload ? { _t: Date.now() } : {};
        console.log('Fetching collections with params:', params);
        const { data } = await client.get('/products/collections', { params });
        console.log('Collections response:', data);
        return data.items ?? [];
    }
    catch (error) {
        console.error('Error fetching collections:', error);
        throw error;
    }
};
export const getProducts = async (params = {}, forceReload = false) => {
    try {
        const requestParams = {
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
    }
    catch (error) {
        console.error('Error fetching products:', error);
        throw error;
    }
};
/**
 * Получает все фото товара (полные фото, не только обложка)
 * @param productId - ID товара
 * @returns Массив URL фото
 */
export const getProductPhotos = async (productId) => {
    try {
        const { data } = await client.get(`/products/${productId}/photos`, {
            timeout: 10000, // 10 секунд таймаут
        });
        return data.photos ?? [];
    }
    catch (error) {
        console.error('Error fetching product photos:', error);
        throw error;
    }
};
