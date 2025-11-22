import { useEffect } from 'react';
import { logger } from '../utils/logger';

export interface TelegramThemeParams {
  bg_color?: string;
  text_color?: string;
  hint_color?: string;
  link_color?: string;
  button_color?: string;
  button_text_color?: string;
  secondary_bg_color?: string;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready: () => void;
        expand: () => void;
        themeParams: TelegramThemeParams;
        onEvent: (event: string, callback: () => void) => void;
        offEvent: (event: string, callback: () => void) => void;
        MainButton: {
          text: string;
          show: () => void;
          hide: () => void;
          onClick: (cb: () => void) => void;
        };
        initDataUnsafe?: {
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
            language_code?: string;
            is_premium?: boolean;
            photo_url?: string;
          };
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
        logger.warn('Telegram WebApp SDK not found. Running in browser mode.');
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











