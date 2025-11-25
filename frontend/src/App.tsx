import { useEffect, useState } from 'react';
import HomePage from './pages/HomePage';
import UsersPage from './pages/UsersPage';
import ChatsPage from './pages/ChatsPage';
import CartPage from './pages/CartPage';
import ProfilePage from './pages/ProfilePage';
import BottomNavigation from './components/BottomNavigation';
import CartPreview from './components/CartPreview';
import { CartProvider } from './contexts/CartContext';
import { ToastProvider } from './contexts/ToastContext';
import { useTelegram } from './hooks/useTelegram';
import { useTelegramTheme } from './hooks/useTelegramTheme';
import { useTelegramUser } from './hooks/useTelegramUser';
import { useSwipeNavigation } from './hooks/useSwipeNavigation';
import { saveUser } from './services/api';
import { logger } from './utils/logger';

type Page = 'home' | 'cart' | 'profile' | 'users' | 'chats';

function App() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [usersPageKey, setUsersPageKey] = useState(0);
  const [chatsPageKey, setChatsPageKey] = useState(0);
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
      <div className="flex flex-col justify-center items-center min-h-screen p-5 text-tg-text text-center">
        <p className="text-tg-destructive-text mb-2.5">Ошибка загрузки</p>
        <p className="text-sm text-tg-hint">{error}</p>
      </div>
    );
  }

  // Убираем экран загрузки - сразу показываем контент
  // Это поможет избежать проблем с застреванием на "Загрузка..."
  if (!isReady) {
    // Показываем минимальный экран загрузки только на очень короткое время
    return (
      <div className="flex justify-center items-center min-h-[100dvh] text-tg-text bg-tg-bg">
        <p>Загрузка...</p>
      </div>
    );
  }

  const handleNavigate = (page: 'home' | 'cart' | 'profile') => {
    if (page === 'home') {
      setCurrentPage('home');
    } else if (page === 'cart') {
      setCurrentPage('cart');
    } else if (page === 'profile') {
      setCurrentPage('profile');
    }
  };

  const handleNavigateToUsers = () => {
    logger.info('[App] Navigating to Users page');
    setCurrentPage('users');
    setUsersPageKey(prev => prev + 1);
  };

  const handleNavigateToChats = () => {
    logger.info('[App] Navigating to Chats page');
    setCurrentPage('chats');
    setChatsPageKey(prev => prev + 1);
  };

  const handleNavigateToHome = () => {
    setCurrentPage('home');
  };

  const handleNavigateToProfile = () => {
    setCurrentPage('profile');
  };

  const getBottomNavPage = (): 'home' | 'cart' | 'profile' => {
    if (currentPage === 'users' || currentPage === 'chats') {
      return 'profile';
    }
    if (currentPage === 'cart') {
      return 'cart';
    }
    return 'home';
  };

  // Навигация свайпом: при свайпе вправо возвращаемся назад
  useSwipeNavigation({
    onSwipeRight: () => {
      if (currentPage === 'users' || currentPage === 'chats') {
        handleNavigateToProfile();
      } else if (currentPage === 'cart' || currentPage === 'profile') {
        handleNavigate('home');
      }
    },
    disabled: currentPage === 'home', // Отключаем на главной странице
  });

  return (
    <CartProvider>
      <ToastProvider>
        <div className="min-h-screen bg-tg-bg">
          {currentPage === 'home' && <HomePage />}
          {currentPage === 'cart' && <CartPage />}
          {currentPage === 'profile' && (
            <ProfilePage
              onNavigateToUsers={handleNavigateToUsers}
              onNavigateToChats={handleNavigateToChats}
            />
          )}
          {currentPage === 'users' && <UsersPage key={usersPageKey} onBack={handleNavigateToProfile} />}
          {currentPage === 'chats' && <ChatsPage key={chatsPageKey} onBack={handleNavigateToProfile} />}
          
          {(currentPage === 'home' || currentPage === 'cart' || currentPage === 'profile' || currentPage === 'users' || currentPage === 'chats') && (
            <BottomNavigation currentPage={getBottomNavPage()} onNavigate={handleNavigate} />
          )}
          <CartPreview />
        </div>
      </ToastProvider>
    </CartProvider>
  );
}

export default App;











