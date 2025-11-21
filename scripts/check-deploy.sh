#!/bin/bash

# Скрипт проверки готовности проекта к деплою

echo "🔍 Проверка готовности проекта к деплою..."
echo ""

ERRORS=0
WARNINGS=0

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Функция для проверки файла
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1 существует"
        return 0
    else
        echo -e "${RED}✗${NC} $1 не найден"
        ((ERRORS++))
        return 1
    fi
}

# Функция для проверки директории
check_dir() {
    if [ -d "$1" ]; then
        echo -e "${GREEN}✓${NC} $1 существует"
        return 0
    else
        echo -e "${RED}✗${NC} $1 не найден"
        ((ERRORS++))
        return 1
    fi
}

# Функция для предупреждения
warn() {
    echo -e "${YELLOW}⚠${NC} $1"
    ((WARNINGS++))
}

echo "📦 Проверка структуры проекта..."
check_dir "backend"
check_dir "frontend"
check_dir "docs"
check_file "ecosystem.config.js"

echo ""
echo "🔧 Проверка Backend..."

cd backend || exit 1

# Проверка package.json
check_file "package.json"

# Проверка .env
if [ -f ".env" ]; then
    echo -e "${GREEN}✓${NC} .env существует"
    
    # Проверка обязательных переменных
    if grep -q "VK_API_TOKEN=" .env && ! grep -q "VK_API_TOKEN=your_vk_api_token_here" .env; then
        echo -e "${GREEN}✓${NC} VK_API_TOKEN настроен"
    else
        warn "VK_API_TOKEN не настроен или использует значение по умолчанию"
    fi
    
    if grep -q "VK_GROUP_ID=" .env && ! grep -q "VK_GROUP_ID=your_vk_group_id_here" .env; then
        echo -e "${GREEN}✓${NC} VK_GROUP_ID настроен"
    else
        warn "VK_GROUP_ID не настроен или использует значение по умолчанию"
    fi
else
    echo -e "${RED}✗${NC} .env не найден (создайте из .env.example)"
    ((ERRORS++))
fi

# Проверка сборки
if [ -d "dist" ] && [ "$(ls -A dist)" ]; then
    echo -e "${GREEN}✓${NC} Backend собран (dist/ существует)"
else
    warn "Backend не собран. Запустите: npm run build"
fi

# Проверка node_modules
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✓${NC} Зависимости backend установлены"
else
    warn "Зависимости backend не установлены. Запустите: npm install"
fi

cd ..

echo ""
echo "🎨 Проверка Frontend..."

cd frontend || exit 1

# Проверка package.json
check_file "package.json"

# Проверка .env
if [ -f ".env" ]; then
    echo -e "${GREEN}✓${NC} .env существует"
    
    # Проверка VITE_BACKEND_URL
    if grep -q "VITE_BACKEND_URL=" .env && ! grep -q "VITE_BACKEND_URL=http://localhost:4000" .env; then
        BACKEND_URL=$(grep "VITE_BACKEND_URL=" .env | cut -d '=' -f2)
        if [[ $BACKEND_URL == https://* ]]; then
            echo -e "${GREEN}✓${NC} VITE_BACKEND_URL использует HTTPS: $BACKEND_URL"
        else
            warn "VITE_BACKEND_URL не использует HTTPS (рекомендуется для production): $BACKEND_URL"
        fi
    else
        warn "VITE_BACKEND_URL не настроен или использует localhost"
    fi
else
    echo -e "${RED}✗${NC} .env не найден (создайте из .env.example)"
    ((ERRORS++))
fi

# Проверка сборки
if [ -d "dist" ] && [ "$(ls -A dist)" ]; then
    echo -e "${GREEN}✓${NC} Frontend собран (dist/ существует)"
    
    # Проверка index.html
    if [ -f "dist/index.html" ]; then
        echo -e "${GREEN}✓${NC} dist/index.html существует"
    else
        echo -e "${RED}✗${NC} dist/index.html не найден"
        ((ERRORS++))
    fi
else
    warn "Frontend не собран. Запустите: npm run build"
fi

# Проверка node_modules
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✓${NC} Зависимости frontend установлены"
else
    warn "Зависимости frontend не установлены. Запустите: npm install"
fi

cd ..

echo ""
echo "📚 Проверка документации..."
check_file "docs/DEPLOYMENT.md"
check_file "docs/QUICK_DEPLOY.md"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Результаты проверки:"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ Все проверки пройдены успешно!${NC}"
    echo ""
    echo "Проект готов к деплою. Следуйте инструкциям в docs/DEPLOYMENT.md"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠ Найдено предупреждений: $WARNINGS${NC}"
    echo -e "${GREEN}✓ Критических ошибок не найдено${NC}"
    echo ""
    echo "Проект можно деплоить, но рекомендуется исправить предупреждения."
    exit 0
else
    echo -e "${RED}✗ Найдено ошибок: $ERRORS${NC}"
    if [ $WARNINGS -gt 0 ]; then
        echo -e "${YELLOW}⚠ Найдено предупреждений: $WARNINGS${NC}"
    fi
    echo ""
    echo "Исправьте ошибки перед деплоем."
    exit 1
fi

