import { useEffect, useRef, useCallback } from 'react';
import { useTelegramUser } from './useTelegramUser';
import { sendProductContactRequest } from '../services/api';
import { logger } from '../utils/logger';
export const useTelegramContact = () => {
    const user = useTelegramUser();
    const handlerRef = useRef(null);
    const currentProductRef = useRef(null);
    const isSendingRef = useRef(false);
    // Очистка обработчика при размонтировании
    useEffect(() => {
        return () => {
            if (window.Telegram?.WebApp?.MainButton && handlerRef.current) {
                try {
                    // Пытаемся убрать обработчик, если есть метод offClick
                    if ('offClick' in window.Telegram.WebApp.MainButton && typeof window.Telegram.WebApp.MainButton.offClick === 'function') {
                        window.Telegram.WebApp.MainButton.offClick(handlerRef.current);
                    }
                }
                catch (e) {
                    logger.warn('[useTelegramContact] Failed to remove MainButton handler', e);
                }
                window.Telegram.WebApp.MainButton.hide();
            }
        };
    }, []);
    const showContactButton = useCallback((product, onSuccess, onError) => {
        if (!window.Telegram?.WebApp?.MainButton) {
            logger.warn('[useTelegramContact] MainButton not available');
            return;
        }
        if (!user?.id) {
            logger.warn('[useTelegramContact] User ID not available', { user });
            return;
        }
        const tg = window.Telegram.WebApp;
        currentProductRef.current = product;
        logger.debug('[useTelegramContact] Showing contact button', {
            productId: product.id,
            productTitle: product.title,
            userId: user.id,
        });
        // Удаляем предыдущий обработчик
        if (handlerRef.current) {
            try {
                if ('offClick' in tg.MainButton && typeof tg.MainButton.offClick === 'function') {
                    tg.MainButton.offClick(handlerRef.current);
                }
            }
            catch (e) {
                logger.warn('[useTelegramContact] Error removing previous handler', e);
            }
        }
        // Создаем новый обработчик
        const handleClick = async () => {
            logger.debug('[useTelegramContact] MainButton clicked', {
                isSending: isSendingRef.current,
                currentProduct: currentProductRef.current?.id,
                userId: user?.id,
            });
            if (isSendingRef.current) {
                logger.debug('[useTelegramContact] Already sending, ignoring click');
                return;
            }
            if (!currentProductRef.current || !user?.id) {
                logger.warn('[useTelegramContact] Missing product or user ID', {
                    hasProduct: !!currentProductRef.current,
                    hasUserId: !!user?.id,
                });
                return;
            }
            isSendingRef.current = true;
            try {
                // Показываем состояние загрузки
                tg.MainButton.text = 'Отправка...';
                if (tg.MainButton.showProgress) {
                    tg.MainButton.showProgress();
                }
                const product = currentProductRef.current;
                logger.info('[useTelegramContact] Sending product contact request', {
                    userId: user.id,
                    productId: product.id,
                    productTitle: product.title,
                });
                const result = await sendProductContactRequest(user.id, product.id, product.title, product.price?.text);
                logger.info('[useTelegramContact] Contact request sent successfully', {
                    result,
                });
                // Скрываем кнопку после успешной отправки
                tg.MainButton.hide();
                handlerRef.current = null;
                currentProductRef.current = null;
                // Тактильная обратная связь
                if (tg.HapticFeedback?.notificationOccurred) {
                    tg.HapticFeedback.notificationOccurred('success');
                }
                // Показываем уведомление
                if (tg.showAlert) {
                    tg.showAlert('Запрос отправлен менеджеру!');
                }
                onSuccess?.();
            }
            catch (error) {
                logger.error('[useTelegramContact] Error sending contact request:', {
                    error: error?.message,
                    stack: error?.stack,
                    response: error?.response?.data,
                    status: error?.response?.status,
                });
                // Скрываем прогресс
                if (tg.MainButton.hideProgress) {
                    tg.MainButton.hideProgress();
                }
                tg.MainButton.text = `Написать про ${currentProductRef.current?.title || 'товар'}`;
                // Тактильная обратная связь для ошибки
                if (tg.HapticFeedback?.notificationOccurred) {
                    tg.HapticFeedback.notificationOccurred('error');
                }
                // Показываем ошибку
                if (tg.showAlert) {
                    tg.showAlert(`Не удалось отправить запрос: ${error?.response?.data?.error || error?.message || 'Попробуйте позже'}`);
                }
                onError?.(error);
            }
            finally {
                isSendingRef.current = false;
            }
        };
        handlerRef.current = handleClick;
        // Настраиваем кнопку
        const buttonText = `Написать про ${product.title}`;
        tg.MainButton.text = buttonText;
        // Устанавливаем обработчик
        try {
            tg.MainButton.onClick(handleClick);
            logger.debug('[useTelegramContact] MainButton onClick handler set', { buttonText });
        }
        catch (e) {
            logger.error('[useTelegramContact] Error setting MainButton onClick handler', e);
            return;
        }
        tg.MainButton.show();
        // Тактильная обратная связь
        if (tg.HapticFeedback?.impactOccurred) {
            tg.HapticFeedback.impactOccurred('light');
        }
    }, [user?.id]);
    const hideContactButton = useCallback(() => {
        if (!window.Telegram?.WebApp?.MainButton)
            return;
        const tg = window.Telegram.WebApp;
        if (handlerRef.current) {
            try {
                if ('offClick' in tg.MainButton && typeof tg.MainButton.offClick === 'function') {
                    tg.MainButton.offClick(handlerRef.current);
                }
            }
            catch (e) {
                // Игнорируем ошибки
            }
            handlerRef.current = null;
        }
        currentProductRef.current = null;
        tg.MainButton.hide();
    }, []);
    return {
        showContactButton,
        hideContactButton,
    };
};
