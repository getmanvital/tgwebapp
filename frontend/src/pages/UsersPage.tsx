import { useEffect, useState } from 'react';
import UsersList from '../components/UsersList';
import { getUsers } from '../services/api';
import { useTelegramUser } from '../hooks/useTelegramUser';
import { useIsAdmin } from '../hooks/useIsAdmin';
import type { User } from '../types';
import { logger } from '../utils/logger';

const UsersPage = ({ onBack }: { onBack: () => void }) => {
  const user = useTelegramUser();
  const isAdmin = useIsAdmin();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin || !user?.username) {
      setError('Доступ запрещен. Только администратор может просматривать пользователей.');
      return;
    }

    const fetchUsers = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await getUsers(user.username!);
        setUsers(response.users);
        logger.debug('Users loaded', { count: response.count });
      } catch (err: any) {
        logger.error('Error loading users:', {
          error: err,
          message: err?.message,
          status: err?.response?.status,
          statusText: err?.response?.statusText,
          data: err?.response?.data,
          username: user?.username,
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
    };

    fetchUsers();
  }, [isAdmin, user?.username]);

  return (
    <main>
      <header>
        <div className="header-actions">
          <button
            className="back-button"
            onClick={onBack}
          >
            ← Назад
          </button>
        </div>
        <h1>Пользователи</h1>
      </header>

      {error && (
        <div className="error" style={{ padding: '16px', margin: '16px 0' }}>
          {error}
        </div>
      )}

      {!error && (
        <div style={{ marginTop: '16px' }}>
          <UsersList users={users} loading={loading} />
        </div>
      )}
    </main>
  );
};

export default UsersPage;

