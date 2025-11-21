/**
 * Получает URL backend сервера
 * 
 * В production (когда задан VITE_BACKEND_URL) использует его.
 * В dev режиме использует прокси через Vite (/api).
 * 
 * @returns URL backend сервера
 */
export const getBackendUrl = (): string => {
  // Если задан явный URL backend (для production), используем его
  if (import.meta.env.VITE_BACKEND_URL) {
    const url = import.meta.env.VITE_BACKEND_URL;
    console.log('Using backend URL from VITE_BACKEND_URL:', url);
    return url;
  }
  
  // В dev режиме используем прокси через Vite
  if (typeof window !== 'undefined' && import.meta.env.DEV) {
    console.log('Using Vite proxy (/api) for backend');
    return '/api';
  }
  
  // В production без явного URL
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    // Если это localhost, используем стандартный порт
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      console.warn('Running on localhost without VITE_BACKEND_URL, using http://localhost:4000');
      return 'http://localhost:4000';
    }
    
    // В production на render.com или другом хостинге
    console.error(
      'VITE_BACKEND_URL не задан в production! ' +
      'Установите переменную окружения VITE_BACKEND_URL на Render.com ' +
      'со значением URL вашего Backend сервиса (например: https://your-backend.onrender.com)'
    );
  }
  
  // Fallback - пустая строка (будет использован относительный путь)
  // Это может работать, если фронтенд и бэкенд на одном домене
  return '';
};

