import { useEffect, useState, useCallback, useRef } from 'react';
import UsersList from '../components/UsersList';
import { getUsers, deleteAllUsers } from '../services/api';
import { useTelegramUser } from '../hooks/useTelegramUser';
import { useIsAdmin } from '../hooks/useIsAdmin';
import type { User } from '../types';
import { logger } from '../utils/logger';

const UsersPage = ({ onBack }: { onBack: () => void }) => {
  const user = useTelegramUser();
  const isAdmin = useIsAdmin();
  const [users, setUsers] = useState<User[]>([]);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const hasUsersRef = useRef(false);

  const fetchUsers = useCallback(async (isRefresh = false) => {
    if (!isAdmin || !user?.username) {
      setError('Доступ запрещен. Только администратор может просматривать пользователей.');
      setInitialLoading(false);
      return;
    }

    setLoading(true);
    if (!hasUsersRef.current) {
      setInitialLoading(true);
    }
    setError(null);
    
    logger.info('[UsersPage] Fetching users', {
      isAdmin,
      username: user.username,
    });
    
    try {
      // Всегда используем forceRefresh для получения актуальных данных
      const response = await getUsers(user.username!, true);
      logger.info('[UsersPage] Users received', {
        count: response.count,
        totalCount: response.totalCount,
        usersLength: response.users?.length,
        firstUserId: response.users?.[0]?.id,
      });
      
      // Обновляем данные сразу, чтобы пользователи видели их без задержки
      const newUsers = response.users || [];
      setUsers(newUsers);
      setTotalCount(response.totalCount ?? response.count ?? 0);
      hasUsersRef.current = newUsers.length > 0;
      setInitialLoading(false);
      
      if (!response.users || response.users.length === 0) {
        logger.warn('[UsersPage] No users in response', { response });
      }
    } catch (err: any) {
      setInitialLoading(false);
      logger.error('[UsersPage] Error loading users:', {
        error: err,
        message: err?.message,
        status: err?.response?.status,
        statusText: err?.response?.statusText,
        data: err?.response?.data,
        username: user?.username,
        responseHeaders: err?.response?.headers,
        requestHeaders: err?.config?.headers,
      });
      
      if (err?.response?.status === 403) {
        setError('Доступ запрещен. У вас нет прав администратора.');
      } else if (err?.response?.status === 500) {
        setError('Ошибка сервера. Попробуйте позже.');
      } else if (err?.code === 'ECONNABORTED' || err?.message?.includes('timeout')) {
        setError('Превышено время ожидания. Проверьте подключение к интернету.');
      } else if (err?.message?.includes('Network Error')) {
        setError('Ошибка сети. Проверьте подключение к интернету.');
      } else {
        setError(`Ошибка загрузки пользователей: ${err?.response?.data?.error || err?.message || 'Неизвестная ошибка'}`);
      }
    } finally {
      setLoading(false);
    }
  }, [isAdmin, user?.username]);

  // Первая загрузка при монтировании - ВСЕГДА загружаем свежие данные
  useEffect(() => {
    if (isAdmin && user?.username) {
      // Принудительно загружаем данные при открытии страницы
      logger.info('[UsersPage] Component mounted, fetching users immediately');
      fetchUsers(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, user?.username]); // Добавляем зависимости для перезагрузки при изменении


  const handleDeleteAllUsers = async () => {
    if (!user?.username) {
      setError('Не удалось определить пользователя');
      return;
    }

    const confirmMessage = `Вы уверены, что хотите удалить всех пользователей из базы данных?\n\nЭто действие необратимо!\n\nБудет удалено: ${totalCount ?? users.length} ${totalCount === 1 ? 'пользователь' : totalCount && totalCount < 5 ? 'пользователя' : 'пользователей'}`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    setDeleting(true);
    setError(null);

    try {
      const result = await deleteAllUsers(user.username);
      logger.warn('[UsersPage] All users deleted', { deletedCount: result.deletedCount });
      
      // Обновляем список пользователей после удаления
      setUsers([]);
      setTotalCount(0);
      fetchUsers(false); // Обновляем список
      
      // Показываем сообщение об успехе
      alert(`База данных очищена. Удалено пользователей: ${result.deletedCount}`);
    } catch (err: any) {
      logger.error('[UsersPage] Error deleting users:', {
        error: err?.message,
        status: err?.response?.status,
        responseData: err?.response?.data,
      });
      
      if (err?.response?.status === 403) {
        setError('Доступ запрещен. У вас нет прав администратора.');
      } else if (err?.response?.status === 500) {
        setError('Ошибка сервера при удалении пользователей.');
      } else {
        setError(`Ошибка при удалении пользователей: ${err?.response?.data?.error || err?.message || 'Неизвестная ошибка'}`);
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <main className="flex flex-col gap-4 w-full max-w-full box-border pb-[calc(72px+max(16px,env(safe-area-inset-bottom)))]">
      <header className="flex flex-col gap-3">
        <div className="flex items-center">
          <button
            className="border-none bg-transparent text-tg-link cursor-pointer py-2 px-0 text-sm font-medium flex items-center gap-1 transition-opacity hover:opacity-70 disabled:opacity-50"
            onClick={onBack}
            disabled={deleting}
          >
            ← Назад
          </button>
        </div>
        <h1>
          Пользователи
          {totalCount !== null && (
            <span className="text-[0.7em] font-normal text-tg-hint ml-2">
              ({totalCount} {totalCount === 1 ? 'пользователь' : totalCount < 5 ? 'пользователя' : 'пользователей'})
            </span>
          )}
        </h1>
        {isAdmin && (
          <div className="mt-3 flex gap-2 flex-wrap">
            {totalCount !== null && totalCount > 0 && (
              <button
                onClick={handleDeleteAllUsers}
                disabled={deleting}
                className="px-4 py-2 bg-tg-destructive-text text-white border-none rounded-lg text-sm font-medium transition-opacity disabled:opacity-60 disabled:cursor-not-allowed hover:opacity-90 min-h-[44px]"
              >
                {deleting ? 'Удаление...' : '🗑️ Очистить базу'}
              </button>
            )}
          </div>
        )}
      </header>

      {error && (
        <div className="error p-4 my-4">
          {error}
        </div>
      )}

      {!error && (
        <div className="mt-4">
          <UsersList users={users} loading={initialLoading} />
        </div>
      )}
    </main>
  );
};

export default UsersPage;

