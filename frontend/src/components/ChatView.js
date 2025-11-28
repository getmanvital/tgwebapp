import React, { useEffect, useRef, useState } from 'react';

const SendIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const ChatView = ({ messages, product, onSendMessage, loading }) => {
    const [inputValue, setInputValue] = useState('');
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef(null);
    const textareaRef = useRef(null);

    // Автопрокрутка к последнему сообщению
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Сброс высоты textarea при отправке
    useEffect(() => {
        if (textareaRef.current && inputValue === '') {
            textareaRef.current.style.height = 'auto';
        }
    }, [inputValue]);

    const formatTime = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const handleSend = async () => {
        if (!inputValue.trim() || sending) return;

        const messageText = inputValue.trim();
        setInputValue('');
        setSending(true);

        try {
            await onSendMessage(messageText);
        } catch (error) {
            // Ошибка обрабатывается в родительском компоненте
            setInputValue(messageText); // Возвращаем текст в поле ввода
        } finally {
            setSending(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#8EBBDA]">
            {/* Product Header (Sticky) */}
            {product && (
                <div className="bg-white/90 backdrop-blur-sm border-b border-gray-200 p-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
                    <div className="flex flex-col">
                        <span className="text-xs text-[#3390ec]">Интересующий товар</span>
                        <span className="font-semibold text-sm truncate max-w-[200px] text-black">
                            📦 {product.title}
                        </span>
                        {product.price && (
                            <span className="text-xs text-gray-500">💰 {product.price}</span>
                        )}
                    </div>
                </div>
            )}

            {/* Messages List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {loading && messages.length === 0 && (
                    <div className="text-center text-white text-sm py-4 bg-black/20 rounded-full w-fit mx-auto px-4 my-4">
                        Загрузка сообщений...
                    </div>
                )}
                
                {!loading && messages.length === 0 && (
                    <div className="text-center text-white text-sm py-4 bg-black/20 rounded-full w-fit mx-auto px-4 my-4">
                        Нет сообщений
                    </div>
                )}

                {messages.map((message) => {
                    const isManager = message.direction === 'manager_to_user'; // Outgoing (me)
                    // Assuming manager_to_user is "me" (the one using this view)
                    // Wait, in ChatsPage:
                    // direction: 'manager_to_user' is added when *we* send a message.
                    // So manager_to_user = outgoing (Green)
                    // user_to_manager = incoming (White)

                    return (
                        <div 
                            key={message.id} 
                            className={`flex w-full ${isManager ? 'justify-end' : 'justify-start'}`}
                        >
                            <div 
                                className={`
                                    relative max-w-[85%] px-3 py-1.5 shadow-sm text-[15px] leading-snug break-words
                                    ${isManager 
                                        ? 'bg-[#EEFFDE] text-black rounded-2xl rounded-br-md' 
                                        : 'bg-white text-black rounded-2xl rounded-bl-md'
                                    }
                                `}
                            >
                                {message.productTitle && (
                                    <div className="mb-1 pb-1 border-b border-black/10 text-[11px] text-[#3390ec] font-medium">
                                        📦 {message.productTitle}
                                    </div>
                                )}
                                
                                <span className="whitespace-pre-wrap">{message.content}</span>

                                <div className={`float-right ml-2 mt-1 flex items-center gap-1 select-none text-[11px] ${isManager ? 'text-[#4fae4e]' : 'text-gray-400'}`}>
                                    {formatTime(message.sentAt)}
                                    {isManager && (
                                        // Simple checkmark simulation using text or unicode
                                        <span className="font-bold">
                                            {message.readAt ? '✓✓' : '✓'}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-2 bg-white border-t border-gray-200 flex items-end gap-2 sticky bottom-0">
                <div className="flex-1 bg-gray-100 rounded-2xl min-h-[40px] max-h-[120px] flex items-center px-4 py-2 transition-colors focus-within:bg-white focus-within:ring-1 focus-within:ring-[#3390ec]">
                    <textarea 
                        ref={textareaRef}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Сообщение"
                        disabled={sending}
                        className="w-full bg-transparent border-none outline-none resize-none text-[16px] h-[24px] leading-[24px] overflow-hidden text-black placeholder-gray-400"
                        rows={1}
                        style={{ height: 'auto', minHeight: '24px' }}
                        onInput={(e) => {
                            e.target.style.height = 'auto';
                            e.target.style.height = e.target.scrollHeight + 'px';
                        }}
                    />
                </div>

                <button 
                    onClick={handleSend}
                    disabled={!inputValue.trim() || sending}
                    className={`
                        p-2.5 rounded-full flex items-center justify-center transition-all duration-200
                        ${!inputValue.trim() || sending 
                            ? 'text-gray-400 bg-transparent' 
                            : 'text-white bg-[#3390ec] hover:bg-[#2f83d6] shadow-md'
                        }
                    `}
                >
                    <SendIcon />
                </button>
            </div>
        </div>
    );
};

export default ChatView;
