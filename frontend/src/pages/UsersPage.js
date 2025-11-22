import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import UsersList from '../components/UsersList';
import { getUsers } from '../services/api';
import { useTelegramUser } from '../hooks/useTelegramUser';
import { useIsAdmin } from '../hooks/useIsAdmin';
import { logger } from '../utils/logger';
const UsersPage = ({ onBack }) => {
    const user = useTelegramUser();
    const isAdmin = useIsAdmin();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
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
                logger.debug('Users loaded', { count: response.count });
            }
            catch (err) {
                logger.error('Error loading users:', err);
                if (err?.response?.status === 403) {
                    setError('Доступ запрещен. У вас нет прав администратора.');
                }
                else {
                    setError('Ошибка загрузки пользователей. Попробуйте позже.');
                }
            }
            finally {
                setLoading(false);
            }
        };
        fetchUsers();
    }, [isAdmin, user?.username]);
    return (_jsxs("main", { children: [_jsxs("header", { children: [_jsx("div", { className: "header-actions", children: _jsx("button", { className: "back-button", onClick: onBack, children: "\u2190 \u041D\u0430\u0437\u0430\u0434" }) }), _jsx("h1", { children: "\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u0438" })] }), error && (_jsx("div", { className: "error", style: { padding: '16px', margin: '16px 0' }, children: error })), !error && (_jsx("div", { style: { marginTop: '16px' }, children: _jsx(UsersList, { users: users, loading: loading }) }))] }));
};
export default UsersPage;
