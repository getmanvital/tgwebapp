import { useEffect, useState } from 'react';
import type { TelegramThemeParams } from './useTelegram';

/**
 * Хук для определения темы Telegram и отслеживания её изменений
 * @returns Объект с информацией о теме: isDark, themeParams
 */
export const useTelegramTheme = () => {
  const [isDark, setIsDark] = useState(false);
  const [themeParams, setThemeParams] = useState<TelegramThemeParams | null>(null);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg) {
      // Если не в Telegram, используем системную тему
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        setIsDark(true);
      }
      return;
    }

    const calculateBrightness = (color: string): number => {
      // Убираем # если есть
      const hex = color.replace('#', '');
      const rgb = parseInt(hex, 16);
      const r = (rgb >> 16) & 0xff;
      const g = (rgb >> 8) & 0xff;
      const b = rgb & 0xff;
      // Формула для расчета яркости (0-255)
      return (r * 299 + g * 587 + b * 114) / 1000;
    };

    const updateTheme = () => {
      const theme = tg.themeParams;
      setThemeParams(theme);

      if (theme.bg_color) {
        const brightness = calculateBrightness(theme.bg_color);
        // Если яркость меньше 128, считаем тему темной
        setIsDark(brightness < 128);
        
        // Применяем класс к body для CSS-селекторов
        if (brightness < 128) {
          document.body.classList.add('tg-theme-dark');
          document.body.classList.remove('tg-theme-light');
        } else {
          document.body.classList.add('tg-theme-light');
          document.body.classList.remove('tg-theme-dark');
        }
      } else {
        // Если тема не определена, используем системную
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
          setIsDark(true);
          document.body.classList.add('tg-theme-dark');
        } else {
          setIsDark(false);
          document.body.classList.add('tg-theme-light');
        }
      }
    };

    // Инициализация темы
    updateTheme();

    // Подписываемся на изменения темы
    if (tg.onEvent) {
      tg.onEvent('themeChanged', updateTheme);
    }

    // Cleanup при размонтировании
    return () => {
      if (tg.offEvent) {
        tg.offEvent('themeChanged', updateTheme);
      }
    };
  }, []);

  return { isDark, themeParams };
};













