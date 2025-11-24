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

# === СБОРКА FRONTEND ===
WORKDIR /app/frontend

# Копирование package.json для фронтенда
COPY frontend/package*.json ./

# Установка зависимостей фронтенда
RUN npm ci && \
    npm cache clean --force

# Копирование исходников фронтенда
COPY frontend/ ./

# Сборка фронтенда (VITE_BACKEND_URL будет установлена в runtime через переменные окружения)
# Если переменная не установлена, используем относительный путь или текущий домен
RUN npm run build && \
    npm cache clean --force

# === СБОРКА BACKEND ===
WORKDIR /app/backend

# Копирование package.json для бэкенда
COPY backend/package*.json ./

# Установка зависимостей бэкенда (включая dev для сборки TypeScript)
RUN npm ci && \
    npm cache clean --force

# Копирование остальных файлов backend
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

