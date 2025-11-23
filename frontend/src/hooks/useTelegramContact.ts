import { useEffect, useRef, useCallback } from 'react';
import { useTelegramUser } from './useTelegramUser';
import { sendProductContactRequest } from '../services/api';
import { logger } from '../utils/logger';
import type { Product } from '../types';

export const useTelegramContact = () => {
  const user = useTelegramUser();
  const handlerRef = useRef<(() => void) | null>(null);
  const currentProductRef = useRef<Product | null>(null);
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
        } catch (e) {
          logger.warn('[useTelegramContact] Failed to remove MainButton handler', e);
        }
        window.Telegram.WebApp.MainButton.hide();
      }
    };
  }, []);

  const showContactButton = useCallback((product: Product, onSuccess?: () => void, onError?: (error: Error) => void) => {
    if (!window.Telegram?.WebApp?.MainButton) {
      logger.warn('[useTelegramContact] MainButton not available');
      return;
    }

    if (!user?.id) {
      logger.warn('[useTelegramContact] User ID not available');
      return;
    }

    const tg = window.Telegram.WebApp;
    currentProductRef.current = product;

    // Удаляем предыдущий обработчик
    if (handlerRef.current) {
      try {
        if ('offClick' in tg.MainButton && typeof tg.MainButton.offClick === 'function') {
          tg.MainButton.offClick(handlerRef.current);
        }
      } catch (e) {
        // Игнорируем ошибки при удалении обработчика
      }
    }

    // Создаем новый обработчик
    const handleClick = async () => {
      if (isSendingRef.current || !currentProductRef.current || !user?.id) {
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
        
        await sendProductContactRequest(
          user.id,
          product.id,
          product.title,
          product.price?.text
        );

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
      } catch (error: any) {
        logger.error('[useTelegramContact] Error sending contact request:', error);
        
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
          tg.showAlert('Не удалось отправить запрос. Попробуйте позже.');
        }

        onError?.(error);
      } finally {
        isSendingRef.current = false;
      }
    };

    handlerRef.current = handleClick;

    // Настраиваем кнопку
    tg.MainButton.text = `Написать про ${product.title}`;
    tg.MainButton.onClick(handleClick);
    tg.MainButton.show();

    // Тактильная обратная связь
    if (tg.HapticFeedback?.impactOccurred) {
      tg.HapticFeedback.impactOccurred('light');
    }
  }, [user?.id]);

  const hideContactButton = useCallback(() => {
    if (!window.Telegram?.WebApp?.MainButton) return;

    const tg = window.Telegram.WebApp;

    if (handlerRef.current) {
      try {
        if ('offClick' in tg.MainButton && typeof tg.MainButton.offClick === 'function') {
          tg.MainButton.offClick(handlerRef.current);
        }
      } catch (e) {
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

