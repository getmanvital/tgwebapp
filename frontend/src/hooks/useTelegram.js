import { useEffect } from 'react';
import { logger } from '../utils/logger';
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
        }
        else {
            window.addEventListener('load', initTelegram);
            return () => window.removeEventListener('load', initTelegram);
        }
    }, []);
};
