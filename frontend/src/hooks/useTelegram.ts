import { useEffect } from 'react';

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready: () => void;
        expand: () => void;
        MainButton: {
          text: string;
          show: () => void;
          hide: () => void;
          onClick: (cb: () => void) => void;
        };
      };
    };
  }
}

export const useTelegram = () => {
  useEffect(() => {
    // Функция инициализации Telegram WebApp
    const initTelegram = () => {
      if (!window.Telegram?.WebApp) {
        console.warn('Telegram WebApp SDK not found. Running in browser mode.');
        return;
      }

      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand();
    };

    if (window.Telegram?.WebApp) {
      initTelegram();
    } else {
      window.addEventListener('load', initTelegram);
      return () => window.removeEventListener('load', initTelegram);
    }
  }, []);
};











