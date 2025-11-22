import { useMemo } from 'react';
import { useTelegramUser } from './useTelegramUser';

const ADMIN_USERNAME = 'getmanvit';

/**
 * Хук для проверки, является ли текущий пользователь администратором
 * @returns true если пользователь администратор, false в противном случае
 */
export const useIsAdmin = (): boolean => {
  const user = useTelegramUser();
  
  return useMemo(() => {
    if (!user || !user.username) {
      return false;
    }
    return user.username === ADMIN_USERNAME;
  }, [user]);
};

