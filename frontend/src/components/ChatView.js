import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
const ChatView = ({ messages, product, onSendMessage, loading }) => {
    const [inputValue, setInputValue] = useState('');
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef(null);
    // Автопрокрутка к последнему сообщению
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);
    const formatTime = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };
    const handleSend = async () => {
        if (!inputValue.trim() || sending)
            return;
        const messageText = inputValue.trim();
        setInputValue('');
        setSending(true);
        try {
            await onSendMessage(messageText);
        }
        catch (error) {
            // Ошибка обрабатывается в родительском компоненте
            setInputValue(messageText); // Возвращаем текст в поле ввода
        }
        finally {
            setSending(false);
        }
    };
    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };
    return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', height: '100%' }, children: [product && (_jsxs("div", { style: {
                    padding: '12px',
                    backgroundColor: 'var(--tg-theme-secondary-bg-color, #f0f0f0)',
                    borderBottom: '1px solid var(--tg-theme-hint-color, #ddd)',
                }, children: [_jsx("div", { style: { fontSize: '12px', color: 'var(--tg-theme-hint-color, #999)', marginBottom: '4px' }, children: "\u0418\u043D\u0442\u0435\u0440\u0435\u0441\u0443\u044E\u0449\u0438\u0439 \u0442\u043E\u0432\u0430\u0440:" }), _jsxs("div", { style: { fontSize: '14px', fontWeight: 'bold', color: 'var(--tg-theme-text-color, #000)' }, children: ["\uD83D\uDCE6 ", product.title] }), product.price && (_jsxs("div", { style: { fontSize: '12px', color: 'var(--tg-theme-hint-color, #666)', marginTop: '4px' }, children: ["\uD83D\uDCB0 ", product.price] }))] })), _jsxs("div", { style: {
                    flex: 1,
                    overflowY: 'auto',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                }, children: [loading && messages.length === 0 ? (_jsx("div", { style: { textAlign: 'center', color: 'var(--tg-theme-hint-color, #999)' }, children: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0439..." })) : messages.length === 0 ? (_jsx("div", { style: { textAlign: 'center', color: 'var(--tg-theme-hint-color, #999)' }, children: "\u041D\u0435\u0442 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0439" })) : (messages.map((message) => (_jsx("div", { style: {
                            display: 'flex',
                            justifyContent: message.direction === 'user_to_manager' ? 'flex-start' : 'flex-end',
                        }, children: _jsxs("div", { style: {
                                maxWidth: '75%',
                                padding: '10px 14px',
                                borderRadius: '12px',
                                backgroundColor: message.direction === 'user_to_manager'
                                    ? 'var(--tg-theme-secondary-bg-color, #f5f5f5)'
                                    : 'var(--tg-theme-button-color, #3390ec)',
                                color: message.direction === 'user_to_manager'
                                    ? 'var(--tg-theme-text-color, #000)'
                                    : '#fff',
                                wordWrap: 'break-word',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                            }, children: [message.productTitle && (_jsxs("div", { style: {
                                        fontSize: '11px',
                                        opacity: 0.8,
                                        marginBottom: '4px',
                                        paddingBottom: '4px',
                                        borderBottom: `1px solid ${message.direction === 'user_to_manager' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.3)'}`,
                                    }, children: ["\uD83D\uDCE6 ", message.productTitle] })), _jsx("div", { style: { whiteSpace: 'pre-wrap' }, children: message.content }), _jsx("div", { style: {
                                        fontSize: '10px',
                                        opacity: 0.7,
                                        marginTop: '4px',
                                        textAlign: 'right',
                                    }, children: formatTime(message.sentAt) })] }) }, message.id)))), _jsx("div", { ref: messagesEndRef })] }), _jsx("div", { style: {
                    padding: '12px',
                    borderTop: '1px solid var(--tg-theme-hint-color, #ddd)',
                    backgroundColor: 'var(--tg-theme-bg-color, #fff)',
                }, children: _jsxs("div", { style: { display: 'flex', gap: '8px', alignItems: 'center' }, children: [_jsx("input", { type: "text", value: inputValue, onChange: (e) => setInputValue(e.target.value), onKeyPress: handleKeyPress, placeholder: "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435...", disabled: sending, style: {
                                flex: 1,
                                padding: '10px 14px',
                                borderRadius: '20px',
                                border: '1px solid var(--tg-theme-hint-color, #ddd)',
                                fontSize: '14px',
                                backgroundColor: 'var(--tg-theme-bg-color, #fff)',
                                color: 'var(--tg-theme-text-color, #000)',
                            } }), _jsx("button", { onClick: handleSend, disabled: !inputValue.trim() || sending, style: {
                                padding: '10px 20px',
                                borderRadius: '20px',
                                border: 'none',
                                backgroundColor: !inputValue.trim() || sending
                                    ? 'var(--tg-theme-hint-color, #ccc)'
                                    : 'var(--tg-theme-button-color, #3390ec)',
                                color: '#fff',
                                fontSize: '14px',
                                fontWeight: 'bold',
                                cursor: !inputValue.trim() || sending ? 'not-allowed' : 'pointer',
                                transition: 'background-color 0.2s',
                            }, children: sending ? '...' : '→' })] }) })] }));
};
export default ChatView;
