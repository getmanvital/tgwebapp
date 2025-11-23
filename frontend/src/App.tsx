import { useEffect, useState } from 'react';
import HomePage from './pages/HomePage';
import UsersPage from './pages/UsersPage';
import { useTelegram } from './hooks/useTelegram';
import { useTelegramTheme } from './hooks/useTelegramTheme';
import { useTelegramUser } from './hooks/useTelegramUser';
import { saveUser } from './services/api';
import { logger } from './utils/logger';

type Page = 'home' | 'users';

function App() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [usersPageKey, setUsersPageKey] = useState(0);
  const user = useTelegramUser();
  
  useTelegram();
  useTelegramTheme(); // Определяем и применяем тему Telegram

  // Сохраняем данные пользователя при загрузке приложения
  useEffect(() => {
    if (user) {
      logger.debug('[App] Attempting to save user', {
        id: user.id,
        username: user.username,
        firstName: user.first_name,
        hasLastName: !!user.last_name,
        hasPhoto: !!user.photo_url,
      });
      saveUser(user)
        .then(() => {
          logger.debug('[App] User saved successfully', { userId: user.id });
        })
        .catch((error) => {
          logger.error('[App] Failed to save user', {
            userId: user.id,
            username: user.username,
            error: error?.message,
            status: error?.response?.status,
          });
        });
    } else {
      logger.debug('[App] No user data available to save');
    }
  }, [user]);

  useEffect(() => {
    const isInTelegram = window.Telegram?.WebApp !== undefined;
    const delay = isInTelegram ? 300 : 100;
    
    const timer = setTimeout(() => {
      if (document.getElementById('root')) {
        setIsReady(true);
      } else {
        setError('Root element not found');
      }
    }, delay);

    return () => clearTimeout(timer);
  }, []);

  if (error) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        padding: '20px',
        color: '#1b1b1f',
        textAlign: 'center'
      }}>
        <p style={{ color: '#d7263d', marginBottom: '10px' }}>Ошибка загрузки</p>
        <p style={{ fontSize: '14px', color: '#878a99' }}>{error}</p>
      </div>
    );
  }

  // Убираем экран загрузки - сразу показываем контент
  // Это поможет избежать проблем с застреванием на "Загрузка..."
  if (!isReady) {
    // Показываем минимальный экран загрузки только на очень короткое время
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100dvh',
        color: 'var(--tg-theme-text-color, #1b1b1f)',
        backgroundColor: 'var(--tg-theme-bg-color, #f5f5f5)'
      }}>
        <p>Загрузка...</p>
      </div>
    );
  }

  const handleNavigateToUsers = () => {
    setCurrentPage('users');
    setUsersPageKey(prev => prev + 1); // Принудительно перемонтируем компонент для обновления данных
  };

  const handleNavigateToHome = () => {
    setCurrentPage('home');
  };

  return (
    <>
      {currentPage === 'home' && <HomePage onNavigateToUsers={handleNavigateToUsers} />}
      {currentPage === 'users' && <UsersPage key={usersPageKey} onBack={handleNavigateToHome} />}
    </>
  );
}

export default App;











