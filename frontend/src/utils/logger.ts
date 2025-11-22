/**
 * Утилита для условного логирования
 * Логирует только в development режиме
 */

const isDev = import.meta.env.DEV;

export const logger = {
  log: (...args: any[]) => {
    if (isDev) {
      console.log(...args);
    }
  },
  info: (...args: any[]) => {
    if (isDev) {
      console.info(...args);
    }
  },
  warn: (...args: any[]) => {
    if (isDev) {
      console.warn(...args);
    }
  },
  error: (...args: any[]) => {
    // Ошибки логируем всегда, но только в development с полной информацией
    if (isDev) {
      console.error(...args);
    } else {
      // В production логируем только краткую информацию об ошибках
      const errorMessages = args
        .map(arg => {
          if (arg instanceof Error) {
            return arg.message;
          }
          if (typeof arg === 'object' && arg !== null) {
            return JSON.stringify(arg);
          }
          return String(arg);
        })
        .filter(Boolean);
      
      if (errorMessages.length > 0) {
        console.error('[Error]', errorMessages[0]);
      }
    }
  },
  debug: (...args: any[]) => {
    if (isDev) {
      console.debug(...args);
    }
  },
};

