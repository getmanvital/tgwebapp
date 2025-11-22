import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import HomePage from './pages/HomePage';
import UsersPage from './pages/UsersPage';
import { useTelegram } from './hooks/useTelegram';
import { useTelegramTheme } from './hooks/useTelegramTheme';
import { useTelegramUser } from './hooks/useTelegramUser';
import { saveUser } from './services/api';
import { logger } from './utils/logger';
function App() {
    const [isReady, setIsReady] = useState(false);
    const [error, setError] = useState(null);
    const [currentPage, setCurrentPage] = useState('home');
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
            });
            saveUser(user).catch(() => {
                // Ошибка уже обработана в saveUser
            });
        }
        else {
            logger.debug('[App] No user data available to save');
        }
    }, [user]);
    useEffect(() => {
        const isInTelegram = window.Telegram?.WebApp !== undefined;
        const delay = isInTelegram ? 300 : 100;
        const timer = setTimeout(() => {
            if (document.getElementById('root')) {
                setIsReady(true);
            }
            else {
                setError('Root element not found');
            }
        }, delay);
        return () => clearTimeout(timer);
    }, []);
    if (error) {
        return (_jsxs("div", { style: {
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '100vh',
                padding: '20px',
                color: '#1b1b1f',
                textAlign: 'center'
            }, children: [_jsx("p", { style: { color: '#d7263d', marginBottom: '10px' }, children: "\u041E\u0448\u0438\u0431\u043A\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438" }), _jsx("p", { style: { fontSize: '14px', color: '#878a99' }, children: error })] }));
    }
    // Убираем экран загрузки - сразу показываем контент
    // Это поможет избежать проблем с застреванием на "Загрузка..."
    if (!isReady) {
        // Показываем минимальный экран загрузки только на очень короткое время
        return (_jsx("div", { style: {
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '100dvh',
                color: 'var(--tg-theme-text-color, #1b1b1f)',
                backgroundColor: 'var(--tg-theme-bg-color, #f5f5f5)'
            }, children: _jsx("p", { children: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430..." }) }));
    }
    const handleNavigateToUsers = () => {
        setCurrentPage('users');
    };
    const handleNavigateToHome = () => {
        setCurrentPage('home');
    };
    return (_jsxs(_Fragment, { children: [currentPage === 'home' && _jsx(HomePage, { onNavigateToUsers: handleNavigateToUsers }), currentPage === 'users' && _jsx(UsersPage, { onBack: handleNavigateToHome })] }));
}
export default App;
