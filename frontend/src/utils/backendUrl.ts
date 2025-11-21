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
    return import.meta.env.VITE_BACKEND_URL;
  }
  
  // В dev режиме используем прокси через Vite
  if (typeof window !== 'undefined' && import.meta.env.DEV) {
    return '/api';
  }
  
  // Fallback для production без явного URL
  return 'http://localhost:4000';
};

