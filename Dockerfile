FROM node:20-slim

# Установка системных зависимостей
RUN DEBIAN_FRONTEND=noninteractive apt-get update && \
    apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Установка PM2 глобально (опционально, для управления процессами)
RUN npm install -g pm2

# Создание пользователя для приложения
RUN groupadd --gid 2000 app && \
    useradd --uid 2000 --gid 2000 -m -s /bin/bash app

# Установка рабочей директории в backend
WORKDIR /app/backend

# Копирование только package.json и package-lock.json для лучшего кэширования слоев Docker
COPY backend/package*.json ./

# Установка всех зависимостей (включая dev для сборки TypeScript)
RUN npm ci && \
    npm cache clean --force

# Копирование остальных файлов backend (исключая node_modules благодаря .dockerignore)
COPY backend/ ./

# Сборка TypeScript проекта
RUN npm run build

# Удаление dev зависимостей после сборки для уменьшения размера образа
RUN npm prune --production && \
    npm cache clean --force

# Создание директорий для данных и логов
RUN mkdir -p /app/backend/data/photos /app/backend/logs && \
    chown -R app:app /app

# Переключение на пользователя app
USER app

# Открытие порта
EXPOSE 3000

# Установка переменных окружения по умолчанию
ENV NODE_ENV=production
ENV PORT=3000

# Убеждаемся, что мы в правильной директории для запуска
WORKDIR /app/backend

# Команда запуска
CMD ["node", "dist/server.js"]

