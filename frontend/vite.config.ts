import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false, // Отключаем sourcemaps в production для уменьшения размера
    minify: 'esbuild', // Используем esbuild для быстрой минификации
    cssMinify: true, // Минифицируем CSS
    // Code splitting - настройка разделения бандлов
    rollupOptions: {
      output: {
        // Ручное разделение чанков для лучшего кэширования
        manualChunks: {
          // Выделяем React и его зависимости в отдельный chunk
          'react-vendor': ['react', 'react-dom'],
          // Выделяем Telegram SDK
          'telegram-vendor': ['@telegram-apps/sdk'],
          // Выделяем остальные зависимости
          'vendor': ['axios', 'clsx'],
        },
        // Оптимизация имен чанков
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
    },
    // Предупреждения о размере чанков
    chunkSizeWarningLimit: 500, // Предупреждение если chunk > 500KB
    // Оптимизация для production
    target: 'es2015', // Поддержка современных браузеров
    cssCodeSplit: true, // Разделение CSS
  },
  // Оптимизация зависимостей
  optimizeDeps: {
    include: ['react', 'react-dom', '@telegram-apps/sdk', 'axios'],
  },
});











