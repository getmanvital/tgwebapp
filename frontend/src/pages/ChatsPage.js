import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState, useCallback } from 'react';
import ChatsList from '../components/ChatsList';
import ChatView from '../components/ChatView';
import { getChats, getChatHistory, sendMessageToClient } from '../services/api';
import { useTelegramUser } from '../hooks/useTelegramUser';
import { useIsAdmin } from '../hooks/useIsAdmin';
import { logger } from '../utils/logger';
const ChatsPage = ({ onBack }) => {
    const user = useTelegramUser();
    const isAdmin = useIsAdmin();
    const [chats, setChats] = useState([]);
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);
    const fetchChats = useCallback(async () => {
        if (!isAdmin || !user?.username) {
            setError('Доступ запрещен. Только администратор может просматривать чаты.');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const response = await getChats(user.username);
            setChats(response.chats || []);
        }
        catch (err) {
            logger.error('[ChatsPage] Error loading chats:', err);
            if (err?.response?.status === 403) {
                setError('Доступ запрещен. У вас нет прав администратора.');
            }
            else {
                setError(`Ошибка загрузки чатов: ${err?.message || 'Неизвестная ошибка'}`);
            }
        }
        finally {
            setLoading(false);
        }
    }, [isAdmin, user?.username]);
    const fetchChatHistory = useCallback(async (userId, silent = false) => {
        if (!isAdmin || !user?.username) {
            return;
        }
        if (!silent) {
            setLoading(true);
            setError(null);
        }
        try {
            const response = await getChatHistory(user.username, userId);
            setMessages(response.messages || []);
            // Находим товар из первого сообщения с productId
            const firstProductMessage = response.messages.find((msg) => msg.productId !== null);
            if (firstProductMessage) {
                setProduct({
                    id: firstProductMessage.productId,
                    title: firstProductMessage.productTitle || 'Товар',
                    price: firstProductMessage.productPrice || undefined,
                });
            }
            else {
                setProduct(null);
            }
        }
        catch (err) {
            logger.error('[ChatsPage] Error loading chat history:', err);
            if (!silent) {
                setError(`Ошибка загрузки истории: ${err?.message || 'Неизвестная ошибка'}`);
            }
        }
        finally {
            if (!silent) {
                setLoading(false);
            }
        }
    }, [isAdmin, user?.username]);
    useEffect(() => {
        fetchChats();
        // Автообновление списка чатов каждые 3 секунды, если чат не открыт
        const chatsInterval = setInterval(() => {
            if (!selectedUserId) {
                fetchChats();
            }
        }, 3000);
        return () => clearInterval(chatsInterval);
    }, [fetchChats, selectedUserId, refreshKey]);
    useEffect(() => {
        if (selectedUserId) {
            fetchChatHistory(selectedUserId);
            // Автообновление истории каждые 2 секунды (тихое обновление без показа loading)
            const interval = setInterval(() => {
                fetchChatHistory(selectedUserId, true);
            }, 2000);
            return () => clearInterval(interval);
        }
        else {
            setMessages([]);
            setProduct(null);
        }
    }, [selectedUserId, fetchChatHistory]);
    const handleChatSelect = (userId) => {
        setSelectedUserId(userId);
    };
    const handleSendMessage = async (messageText) => {
        if (!selectedUserId || !user?.username) {
            throw new Error('User ID or admin username not available');
        }
        try {
            await sendMessageToClient(user.username, selectedUserId, messageText);
            // Добавляем сообщение в локальное состояние
            const newMessage = {
                id: Date.now(), // Временный ID
                direction: 'manager_to_user',
                content: messageText,
                productId: null,
                productTitle: null,
                productPrice: null,
                sentAt: new Date().toISOString(),
                readAt: null,
            };
            setMessages((prev) => [...prev, newMessage]);
            // Обновляем список чатов
            setRefreshKey((prev) => prev + 1);
            // Обновляем историю для получения реального ID сообщения
            setTimeout(() => {
                fetchChatHistory(selectedUserId);
            }, 500);
        }
        catch (error) {
            logger.error('[ChatsPage] Error sending message:', error);
            throw error;
        }
    };
    const handleBackToList = () => {
        setSelectedUserId(null);
        setMessages([]);
        setProduct(null);
        fetchChats();
    };
    return (_jsxs("main", { style: { height: '100%', display: 'flex', flexDirection: 'column' }, children: [_jsx("header", { children: selectedUserId ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "header-actions", children: _jsx("button", { className: "back-button", onClick: handleBackToList, children: "\u2190 \u041D\u0430\u0437\u0430\u0434 \u043A \u0447\u0430\u0442\u0430\u043C" }) }), _jsx("h1", { children: "\u0427\u0430\u0442" })] })) : (_jsxs(_Fragment, { children: [_jsx("div", { className: "header-actions", children: _jsx("button", { className: "back-button", onClick: onBack, children: "\u2190 \u041D\u0430\u0437\u0430\u0434" }) }), _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }, children: [_jsxs("h1", { children: ["\u0427\u0430\u0442\u044B", chats.length > 0 && (_jsxs("span", { style: {
                                                fontSize: '0.7em',
                                                fontWeight: 'normal',
                                                color: 'var(--tg-theme-hint-color, #999)',
                                                marginLeft: '8px',
                                            }, children: ["(", chats.length, ")"] }))] }), _jsx("button", { onClick: () => {
                                        setRefreshKey((prev) => prev + 1);
                                        fetchChats();
                                    }, disabled: loading, style: {
                                        padding: '8px 16px',
                                        background: 'var(--tg-theme-button-color, #0f62fe)',
                                        color: 'var(--tg-theme-button-text-color, #fff)',
                                        border: 'none',
                                        borderRadius: '8px',
                                        cursor: loading ? 'not-allowed' : 'pointer',
                                        fontSize: '14px',
                                        opacity: loading ? 0.6 : 1,
                                        transition: 'opacity 0.2s',
                                    }, children: "\uD83D\uDD04 \u041E\u0431\u043D\u043E\u0432\u0438\u0442\u044C" })] })] })) }), error && (_jsx("div", { className: "error", style: { padding: '16px', margin: '16px' }, children: error })), selectedUserId ? (_jsx("div", { style: { flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }, children: _jsx(ChatView, { messages: messages, product: product, onSendMessage: handleSendMessage, loading: loading }) })) : (_jsx("div", { style: { flex: 1, overflowY: 'auto' }, children: _jsx(ChatsList, { chats: chats, loading: loading, onChatSelect: handleChatSelect }) }))] }));
};
export default ChatsPage;
