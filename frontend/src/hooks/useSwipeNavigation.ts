import { useEffect, useRef } from 'react';

type SwipeDirection = 'left' | 'right';

type UseSwipeNavigationOptions = {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number; // Минимальное расстояние для свайпа в пикселях
  disabled?: boolean; // Отключить обработку свайпов
};

export function useSwipeNavigation({
  onSwipeLeft,
  onSwipeRight,
  threshold = 50,
  disabled = false,
}: UseSwipeNavigationOptions) {
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const elementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (disabled || (!onSwipeLeft && !onSwipeRight)) {
      return;
    }

    const handleTouchStart = (e: TouchEvent) => {
      // Игнорируем свайпы, если открыта модальная галерея
      const gallery = document.querySelector('[class*="z-[1000]"]');
      if (gallery) {
        return;
      }

      const touch = e.touches[0];
      touchStartX.current = touch.clientX;
      touchStartY.current = touch.clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (touchStartX.current === null || touchStartY.current === null) {
        return;
      }

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartX.current;
      const deltaY = touch.clientY - touchStartY.current;

      // Проверяем, что это горизонтальный свайп (не вертикальный)
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > threshold) {
        if (deltaX > 0 && onSwipeRight) {
          // Свайп вправо
          onSwipeRight();
        } else if (deltaX < 0 && onSwipeLeft) {
          // Свайп влево
          onSwipeLeft();
        }
      }

      touchStartX.current = null;
      touchStartY.current = null;
    };

    const element = elementRef.current || document.body;
    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onSwipeLeft, onSwipeRight, threshold, disabled]);

  // Отключаем стандартное поведение Telegram при свайпе
  useEffect(() => {
    if (disabled) {
      return;
    }

    if (window.Telegram?.WebApp) {
      try {
        // Пытаемся отключить закрытие приложения при свайпе
        // Используем type assertion, так как метод может быть доступен, но не в типах
        const webApp = window.Telegram.WebApp as any;
        if (typeof webApp.enableClosingConfirmation === 'function') {
          webApp.enableClosingConfirmation();
        }
      } catch (error) {
        console.warn('Failed to enable closing confirmation:', error);
      }
    }
  }, [disabled]);

  return elementRef;
}

