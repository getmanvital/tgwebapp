#!/bin/bash

# Скрипт для быстрой настройки .env файлов

echo "🔧 Настройка переменных окружения..."
echo ""

# Цвета
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Backend .env
if [ ! -f "backend/.env" ]; then
    echo "Создание backend/.env из примера..."
    cp backend/.env.example backend/.env 2>/dev/null || {
        echo "Создание backend/.env вручную..."
        cat > backend/.env << EOF
# VK API настройки
VK_API_TOKEN=your_vk_api_token_here
VK_GROUP_ID=your_vk_group_id_here

# Порт HTTP сервера
PORT=4000

# Окружение
NODE_ENV=development

# Лимиты для тестирования
MAX_COLLECTIONS_LIMIT=10
MAX_PRODUCTS_LIMIT=20

# Качество загружаемых фото
PHOTO_QUALITY=high

# Использовать локальную БД
USE_LOCAL_DB=false

# Обогащать товары полными фото
ENRICH_PRODUCTS=false
EOF
    }
    echo -e "${GREEN}✓${NC} backend/.env создан"
    echo -e "${YELLOW}⚠${NC} Не забудьте заполнить VK_API_TOKEN и VK_GROUP_ID!"
else
    echo -e "${GREEN}✓${NC} backend/.env уже существует"
fi

# Frontend .env
if [ ! -f "frontend/.env" ]; then
    echo "Создание frontend/.env из примера..."
    cp frontend/.env.example frontend/.env 2>/dev/null || {
        echo "Создание frontend/.env вручную..."
        cat > frontend/.env << EOF
# URL backend сервера
# Для локальной разработки:
VITE_BACKEND_URL=http://localhost:4000

# Для production (замените на ваш домен):
# VITE_BACKEND_URL=https://api.yourdomain.com
EOF
    }
    echo -e "${GREEN}✓${NC} frontend/.env создан"
    echo -e "${YELLOW}⚠${NC} Не забудьте настроить VITE_BACKEND_URL для production!"
else
    echo -e "${GREEN}✓${NC} frontend/.env уже существует"
fi

echo ""
echo "✅ Настройка завершена!"
echo ""
echo "Следующие шаги:"
echo "1. Отредактируйте backend/.env и заполните VK_API_TOKEN и VK_GROUP_ID"
echo "2. Отредактируйте frontend/.env и настройте VITE_BACKEND_URL"
echo "3. Запустите: npm install в backend/ и frontend/"
echo "4. Для деплоя следуйте инструкциям в docs/DEPLOYMENT.md"

