#!/bin/bash

# Post-deploy скрипт для автоматической настройки после деплоя
# Использование: bash scripts/post-deploy.sh

set -e

echo "🚀 Running post-deploy setup..."
echo ""

# Переходим в директорию backend
cd "$(dirname "$0")/../backend" || exit 1

# Проверяем наличие .env файла
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found in backend/"
    echo "💡 Create .env from env.example and configure it"
    exit 1
fi

# Загружаем переменные из .env
set -a
source .env
set +a

# Проверяем необходимые переменные
if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
    echo "⚠️  Warning: TELEGRAM_BOT_TOKEN not set in .env"
fi

if [ -z "$TELEGRAM_MANAGER_ID" ]; then
    echo "⚠️  Warning: TELEGRAM_MANAGER_ID not set in .env"
fi

if [ -z "$BACKEND_URL" ]; then
    echo "⚠️  Warning: BACKEND_URL not set in .env"
fi

# Проверяем доступность backend
echo "🔍 Checking backend availability..."
HEALTH_URL="${BACKEND_URL:-http://localhost:4000}/health"

if curl -s -f "$HEALTH_URL" > /dev/null 2>&1; then
    echo "✅ Backend is running"
else
    echo "⚠️  Backend is not accessible at $HEALTH_URL"
    echo "💡 Make sure backend is running before setting up webhook"
fi

# Настраиваем webhook если AUTO_SETUP_WEBHOOK не установлен в true
if [ "$AUTO_SETUP_WEBHOOK" != "true" ]; then
    echo ""
    echo "📡 Setting up Telegram webhook..."
    
    if command -v npm &> /dev/null; then
        npm run webhook:setup
    else
        echo "⚠️  npm not found, skipping webhook setup"
        echo "💡 Run 'npm run webhook:setup' manually"
    fi
else
    echo "✅ Webhook will be auto-configured on server start (AUTO_SETUP_WEBHOOK=true)"
fi

echo ""
echo "✅ Post-deploy setup completed!"
echo ""
echo "📝 Next steps:"
echo "   1. Check backend logs: pm2 logs backend"
echo "   2. Verify webhook status: npm run webhook:info"
echo "   3. Test by sending a message to your bot"
echo ""
