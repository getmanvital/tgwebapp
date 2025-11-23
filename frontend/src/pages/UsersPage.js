import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import UsersList from '../components/UsersList';
import { getUsers, deleteAllUsers } from '../services/api';
import { useTelegramUser } from '../hooks/useTelegramUser';
import { useIsAdmin } from '../hooks/useIsAdmin';
import { logger } from '../utils/logger';
const UsersPage = ({ onBack }) => {
    const user = useTelegramUser();
    const isAdmin = useIsAdmin();
    const [users, setUsers] = useState([]);
    const [totalCount, setTotalCount] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [deleting, setDeleting] = useState(false);
    useEffect(() => {
        if (!isAdmin || !user?.username) {
            setError('Доступ запрещен. Только администратор может просматривать пользователей.');
            return;
        }
        const fetchUsers = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await getUsers(user.username);
                setUsers(response.users);
                setTotalCount(response.totalCount ?? response.count);
                logger.debug('Users loaded', {
                    count: response.count,
                    totalCount: response.totalCount
                });
            }
            catch (err) {
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
                }
                else if (err?.response?.status === 500) {
                    setError('Ошибка сервера. Попробуйте позже.');
                }
                else if (err?.code === 'ECONNABORTED' || err?.message?.includes('timeout')) {
                    setError('Превышено время ожидания. Проверьте подключение к интернету.');
                }
                else if (err?.message?.includes('Network Error')) {
                    setError('Ошибка сети. Проверьте подключение к интернету.');
                }
                else {
                    setError(`Ошибка загрузки пользователей: ${err?.response?.data?.error || err?.message || 'Неизвестная ошибка'}`);
                }
            }
            finally {
                setLoading(false);
            }
        };
        fetchUsers();
    }, [isAdmin, user?.username]);
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
            // Показываем сообщение об успехе
            alert(`База данных очищена. Удалено пользователей: ${result.deletedCount}`);
        }
        catch (err) {
            logger.error('[UsersPage] Error deleting users:', {
                error: err?.message,
                status: err?.response?.status,
                responseData: err?.response?.data,
            });
            if (err?.response?.status === 403) {
                setError('Доступ запрещен. У вас нет прав администратора.');
            }
            else if (err?.response?.status === 500) {
                setError('Ошибка сервера при удалении пользователей.');
            }
            else {
                setError(`Ошибка при удалении пользователей: ${err?.response?.data?.error || err?.message || 'Неизвестная ошибка'}`);
            }
        }
        finally {
            setDeleting(false);
        }
    };
    return (_jsxs("main", { children: [_jsxs("header", { children: [_jsx("div", { className: "header-actions", children: _jsx("button", { className: "back-button", onClick: onBack, disabled: deleting, children: "\u2190 \u041D\u0430\u0437\u0430\u0434" }) }), _jsxs("h1", { children: ["\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u0438", totalCount !== null && (_jsxs("span", { style: {
                                    fontSize: '0.7em',
                                    fontWeight: 'normal',
                                    color: 'var(--tg-theme-hint-color, #999)',
                                    marginLeft: '8px'
                                }, children: ["(", totalCount, " ", totalCount === 1 ? 'пользователь' : totalCount < 5 ? 'пользователя' : 'пользователей', ")"] }))] }), isAdmin && totalCount !== null && totalCount > 0 && (_jsx("div", { style: { marginTop: '12px' }, children: _jsx("button", { onClick: handleDeleteAllUsers, disabled: deleting || loading, style: {
                                padding: '8px 16px',
                                backgroundColor: 'var(--tg-theme-destructive-text-color, #d7263d)',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '14px',
                                fontWeight: '500',
                                cursor: deleting || loading ? 'not-allowed' : 'pointer',
                                opacity: deleting || loading ? 0.6 : 1,
                                transition: 'opacity 0.2s',
                            }, children: deleting ? 'Удаление...' : 'Очистить базу данных' }) }))] }), error && (_jsx("div", { className: "error", style: { padding: '16px', margin: '16px 0' }, children: error })), !error && (_jsx("div", { style: { marginTop: '16px' }, children: _jsx(UsersList, { users: users, loading: loading }) }))] }));
};
export default UsersPage;
