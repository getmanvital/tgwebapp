import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/global.css';
import { getBackendUrl } from './utils/backendUrl';

// Логирование конфигурации при загрузке приложения
console.log('=== App Initialization ===');
console.log('Environment:', {
  MODE: import.meta.env.MODE,
  DEV: import.meta.env.DEV,
  PROD: import.meta.env.PROD,
  VITE_BACKEND_URL: import.meta.env.VITE_BACKEND_URL,
});
console.log('Backend URL:', getBackendUrl());
console.log('Current location:', window.location.href);
console.log('========================');

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);











