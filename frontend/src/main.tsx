import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/global.css';
import { getBackendUrl } from './utils/backendUrl';
import { logger } from './utils/logger';

// Логирование конфигурации при загрузке приложения (только в development)
logger.log('=== App Initialization ===');
logger.log('Environment:', {
  MODE: import.meta.env.MODE,
  DEV: import.meta.env.DEV,
  PROD: import.meta.env.PROD,
  VITE_BACKEND_URL: import.meta.env.VITE_BACKEND_URL,
});
logger.log('Backend URL:', getBackendUrl());
logger.log('Current location:', window.location.href);
logger.log('========================');

// Динамическое добавление preconnect для backend URL
const backendUrl = getBackendUrl();
if (backendUrl && typeof window !== 'undefined') {
  try {
    const url = new URL(backendUrl, window.location.href);
    const origin = url.origin;
    
    // Проверяем, нет ли уже preconnect для этого origin
    const existingPreconnect = document.querySelector(`link[rel="preconnect"][href="${origin}"]`);
    if (!existingPreconnect && origin !== window.location.origin) {
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = origin;
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
      logger.debug('Added preconnect for backend URL:', origin);
    }
  } catch (e) {
    // Если не удалось распарсить URL, игнорируем
    logger.debug('Could not parse backend URL for preconnect:', backendUrl);
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);











