# Шпаргалка по деплою

Краткая инструкция для быстрого деплоя.

## 🚀 Быстрый старт (5 минут)

### 1. Backend
```bash
cd backend
npm install
npm run build
cp .env.example .env
nano .env  # Заполните VK_API_TOKEN и VK_GROUP_ID
pm2 start ecosystem.config.js
```

### 2. Frontend
```bash
cd frontend
npm install
cp .env.example .env
nano .env  # Укажите VITE_BACKEND_URL=https://your-backend-url
npm run build
```

### 3. Nginx
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    root /var/www/tgwebapp/frontend/dist;
    location / { try_files $uri /index.html; }
}
```

### 4. SSL
```bash
sudo certbot --nginx -d yourdomain.com
```

### 5. Telegram Bot
1. [@BotFather](https://t.me/BotFather) → `/newapp`
2. URL: `https://yourdomain.com`
3. `/mybots` → Menu Button → Web App

## ✅ Проверка

```bash
# Backend
curl https://api.yourdomain.com/health

# Frontend
curl https://yourdomain.com

# PM2
pm2 status
pm2 logs
```

## 🔧 Полезные команды

```bash
# Обновление backend
cd backend && git pull && npm install && npm run build && pm2 restart tgwebapp-backend

# Обновление frontend
cd frontend && git pull && npm install && npm run build

# Проверка готовности
bash scripts/check-deploy.sh

# Настройка .env
bash scripts/setup-env.sh
```

## ⚠️ Важно

- ✅ HTTPS обязателен для Telegram WebApp
- ✅ Backend должен быть доступен извне
- ✅ CORS настроен правильно
- ✅ VK_API_TOKEN и VK_GROUP_ID заполнены

## 📚 Подробные инструкции

- [Полная инструкция](DEPLOYMENT.md)
- [Быстрый деплой](QUICK_DEPLOY.md)

