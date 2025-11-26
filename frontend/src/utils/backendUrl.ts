import { logger } from './logger';

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
    logger.debug('Using backend URL from VITE_BACKEND_URL:', url);
    return url;
  }
  
  // В dev режиме используем прокси через Vite
  if (typeof window !== 'undefined' && import.meta.env.DEV) {
    logger.debug('Using Vite proxy (/api) for backend');
    return '/api';
  }
  
  // В production без явного URL
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    // Если это localhost, используем стандартный порт
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      logger.warn('Running on localhost without VITE_BACKEND_URL, using http://localhost:4000');
      return 'http://localhost:4000';
    }
    
    // Если фронтенд и бэкенд на одном домене (деплой вместе),
    // используем относительные пути (пустая строка)
    logger.debug(
      'VITE_BACKEND_URL не задан. ' +
      'Используются относительные пути (подходит если фронтенд и бэкенд на одном домене).'
    );
  }
  
  // Fallback - пустая строка (будет использован относительный путь)
  // Это работает, если фронтенд и бэкенд на одном домене
  return '';
};

/**
 * Получает URL Socket.io сервера
 * 
 * Socket.io использует тот же хост что и backend, но может работать через WebSocket.
 * В dev режиме использует прокси через Vite, в production - тот же URL что и backend.
 * 
 * @returns URL Socket.io сервера
 */
export const getSocketUrl = (): string => {
  // Если задан явный URL backend (для production), используем его для Socket.io
  if (import.meta.env.VITE_BACKEND_URL) {
    const url = import.meta.env.VITE_BACKEND_URL;
    logger.debug('Using Socket.io URL from VITE_BACKEND_URL:', url);
    return url;
  }
  
  // В dev режиме используем прокси через Vite
  if (typeof window !== 'undefined' && import.meta.env.DEV) {
    logger.debug('Using Vite proxy for Socket.io');
    // Socket.io автоматически определит правильный URL через window.location
    return '';
  }
  
  // В production без явного URL
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    // Если это localhost, используем стандартный порт
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      logger.warn('Running on localhost without VITE_BACKEND_URL, using http://localhost:4000 for Socket.io');
      return 'http://localhost:4000';
    }
    
    // Если фронтенд и бэкенд на одном домене (деплой вместе),
    // используем пустую строку - Socket.io определит URL автоматически
    logger.debug(
      'VITE_BACKEND_URL не задан. ' +
      'Socket.io будет использовать текущий домен.'
    );
  }
  
  // Fallback - пустая строка (Socket.io использует текущий домен)
  return '';
};

