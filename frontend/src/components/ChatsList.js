import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const ChatsList = ({ chats, loading, onChatSelect }) => {
    if (loading) {
        return (_jsx("div", { style: { padding: '20px', textAlign: 'center' }, children: _jsx("p", { children: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u0447\u0430\u0442\u043E\u0432..." }) }));
    }
    if (chats.length === 0) {
        return (_jsx("div", { style: { padding: '20px', textAlign: 'center' }, children: _jsx("p", { children: "\u0410\u043A\u0442\u0438\u0432\u043D\u044B\u0445 \u0447\u0430\u0442\u043E\u0432 \u043D\u0435\u0442" }) }));
    }
    const formatTime = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        if (diffMins < 1)
            return 'только что';
        if (diffMins < 60)
            return `${diffMins} мин назад`;
        if (diffHours < 24)
            return `${diffHours} ч назад`;
        if (diffDays < 7)
            return `${diffDays} дн назад`;
        return date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
        });
    };
    const truncateMessage = (text, maxLength = 50) => {
        if (text.length <= maxLength)
            return text;
        return text.substring(0, maxLength) + '...';
    };
    return (_jsx("div", { className: "chats-list", style: { padding: '16px' }, children: chats.map((chat) => (_jsxs("div", { className: "chat-item", onClick: () => onChatSelect(chat.userId), style: {
                display: 'flex',
                alignItems: 'center',
                padding: '12px',
                marginBottom: '8px',
                backgroundColor: 'var(--tg-theme-secondary-bg-color, #f5f5f5)',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
                border: chat.unreadCount > 0 ? '2px solid var(--tg-theme-button-color, #3390ec)' : '2px solid transparent',
            }, onMouseEnter: (e) => {
                e.currentTarget.style.backgroundColor = 'var(--tg-theme-secondary-bg-color, #e0e0e0)';
            }, onMouseLeave: (e) => {
                e.currentTarget.style.backgroundColor = 'var(--tg-theme-secondary-bg-color, #f5f5f5)';
            }, children: [chat.photoUrl ? (_jsx("img", { src: chat.photoUrl, alt: chat.userName, style: {
                        width: '50px',
                        height: '50px',
                        borderRadius: '50%',
                        marginRight: '12px',
                        objectFit: 'cover',
                    } })) : (_jsx("div", { style: {
                        width: '50px',
                        height: '50px',
                        borderRadius: '50%',
                        marginRight: '12px',
                        backgroundColor: 'var(--tg-theme-button-color, #3390ec)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '18px',
                        fontWeight: 'bold',
                    }, children: chat.firstName[0].toUpperCase() })), _jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }, children: [_jsx("h3", { style: {
                                        margin: 0,
                                        fontSize: '16px',
                                        fontWeight: chat.unreadCount > 0 ? 'bold' : 'normal',
                                        color: 'var(--tg-theme-text-color, #000)',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                    }, children: chat.userName }), _jsx("span", { style: {
                                        fontSize: '12px',
                                        color: 'var(--tg-theme-hint-color, #999)',
                                        marginLeft: '8px',
                                        flexShrink: 0,
                                    }, children: formatTime(chat.lastMessage.sentAt) })] }), chat.product && (_jsxs("div", { style: {
                                fontSize: '12px',
                                color: 'var(--tg-theme-button-color, #3390ec)',
                                marginBottom: '4px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                            }, children: ["\uD83D\uDCE6 ", chat.product.title] })), _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx("p", { style: {
                                        margin: 0,
                                        fontSize: '14px',
                                        color: 'var(--tg-theme-hint-color, #666)',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        flex: 1,
                                    }, children: truncateMessage(chat.lastMessage.content) }), chat.unreadCount > 0 && (_jsx("span", { style: {
                                        backgroundColor: 'var(--tg-theme-button-color, #3390ec)',
                                        color: '#fff',
                                        borderRadius: '12px',
                                        padding: '2px 8px',
                                        fontSize: '12px',
                                        fontWeight: 'bold',
                                        marginLeft: '8px',
                                        flexShrink: 0,
                                        minWidth: '20px',
                                        textAlign: 'center',
                                    }, children: chat.unreadCount > 99 ? '99+' : chat.unreadCount }))] })] })] }, chat.userId))) }));
};
export default ChatsList;
