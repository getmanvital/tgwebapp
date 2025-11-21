import { useEffect } from 'react';
export const useTelegram = () => {
    useEffect(() => {
        if (!window.Telegram?.WebApp)
            return;
        window.Telegram.WebApp.ready();
        window.Telegram.WebApp.expand();
    }, []);
};
