import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const UserAuthStatus = ({ user }) => {
    if (!user) {
        return null;
    }
    // Получаем инициалы для аватара, если нет фото
    const getInitials = () => {
        const first = user.first_name?.[0]?.toUpperCase() || '';
        const last = user.last_name?.[0]?.toUpperCase() || '';
        return `${first}${last}` || 'U';
    };
    // Формируем полное имя
    const getFullName = () => {
        if (user.last_name) {
            return `${user.first_name} ${user.last_name}`;
        }
        return user.first_name;
    };
    return (_jsx("div", { className: "user-auth-status", children: _jsxs("div", { className: "user-auth-status__content", children: [_jsx("div", { className: "user-auth-status__avatar", children: user.photo_url ? (_jsx("img", { src: user.photo_url, alt: getFullName(), className: "user-auth-status__avatar-img" })) : (_jsx("div", { className: "user-auth-status__avatar-initials", children: getInitials() })) }), _jsxs("div", { className: "user-auth-status__info", children: [_jsx("div", { className: "user-auth-status__name", children: getFullName() }), _jsx("div", { className: "user-auth-status__status", children: "\u0410\u0432\u0442\u043E\u0440\u0438\u0437\u043E\u0432\u0430\u043D" })] })] }) }));
};
export default UserAuthStatus;
