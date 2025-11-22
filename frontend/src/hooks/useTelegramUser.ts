import { useState, useEffect } from 'react';
import { logger } from '../utils/logger';

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready: () => void;
        expand: () => void;
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

export const useTelegramUser = (): TelegramUser | null => {
  const [user, setUser] = useState<TelegramUser | null>(null);

  useEffect(() => {
    const getUserData = () => {
      if (!window.Telegram?.WebApp) {
        logger.debug('Telegram WebApp not available, running in browser mode');
        return null;
      }

      const tg = window.Telegram.WebApp;
      const userData = tg.initDataUnsafe?.user;

      if (!userData) {
        logger.debug('User data not available in initDataUnsafe');
        return null;
      }

      const telegramUser: TelegramUser = {
        id: userData.id,
        first_name: userData.first_name,
        last_name: userData.last_name,
        username: userData.username,
        language_code: userData.language_code,
        is_premium: userData.is_premium,
        photo_url: userData.photo_url,
      };

      logger.debug('Telegram user data loaded', { userId: telegramUser.id, username: telegramUser.username });
      return telegramUser;
    };

    const userData = getUserData();
    setUser(userData);
  }, []);

  return user;
};

