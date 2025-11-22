import { useMemo } from 'react';
import { useTelegramUser } from './useTelegramUser';
const ADMIN_USERNAME = 'getmanvit';
// Функция нормализации username (убирает @ если есть)
const normalizeUsername = (username) => {
    if (!username)
        return null;
    return username.startsWith('@') ? username.slice(1) : username;
};
/**
 * Хук для проверки, является ли текущий пользователь администратором
 * @returns true если пользователь администратор, false в противном случае
 */
export const useIsAdmin = () => {
    const user = useTelegramUser();
    return useMemo(() => {
        if (!user || !user.username) {
            return false;
        }
        const normalized = normalizeUsername(user.username);
        return normalized === ADMIN_USERNAME;
    }, [user]);
};
