# Быстрый деплой для тестирования

Это упрощенная инструкция для быстрого деплоя на тестовый сервер.

## Вариант 1: Деплой на VPS/сервер

### Шаг 1: Подготовка сервера

```bash
# На сервере
sudo apt update
sudo apt install -y nodejs npm nginx git

# Проверка версии Node.js (нужна 18+)
node --version
```

### Шаг 2: Загрузка проекта

```bash
# Создайте директорию
sudo mkdir -p /var/www/tgwebapp
sudo chown $USER:$USER /var/www/tgwebapp
cd /var/www/tgwebapp

# Загрузите проект (через git или scp)
# Если через git:
git clone <your-repo> .

# Если через scp (с локальной машины):
# scp -r . user@server:/var/www/tgwebapp/
```

### Шаг 3: Настройка Backend

```bash
cd /var/www/tgwebapp/backend

# Установка зависимостей
npm install

# Создание .env файла
cp .env.example .env
nano .env  # Заполните VK_API_TOKEN и VK_GROUP_ID

# Сборка
npm run build

# Установка PM2
sudo npm install -g pm2

# Запуск через PM2
cd /var/www/tgwebapp
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Шаг 4: Настройка Frontend

```bash
cd /var/www/tgwebapp/frontend

# Установка зависимостей
npm install

# Создание .env файла
cp .env.example .env
nano .env  # Укажите URL backend (например: http://your-server-ip:4000)

# Сборка
npm run build
```

### Шаг 5: Настройка Nginx

```bash
sudo nano /etc/nginx/sites-available/tgwebapp
```

Вставьте конфигурацию:

```nginx
# Frontend
server {
    listen 80;
    server_name your-server-ip;  # или ваш домен

    root /var/www/tgwebapp/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}

# Backend (опционально, если хотите через домен)
server {
    listen 80;
    server_name api.your-server-ip;

    location / {
        proxy_pass http://localhost:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Активируйте:

```bash
sudo ln -s /etc/nginx/sites-available/tgwebapp /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Шаг 6: Настройка SSL (для Telegram WebApp)

```bash
# Установка Certbot
sudo apt install -y certbot python3-certbot-nginx

# Получение сертификата (замените на ваш домен)
sudo certbot --nginx -d yourdomain.com

# Если нет домена, можно использовать временный сертификат или ngrok
```

### Шаг 7: Настройка Telegram Bot

1. Создайте бота через [@BotFather](https://t.me/BotFather)
2. Отправьте `/newapp`
3. Укажите URL вашего frontend: `https://yourdomain.com`
4. Настройте кнопку меню через `/mybots`

---

## Вариант 2: Быстрый тест через ngrok (без домена)

Если у вас нет домена, можно использовать ngrok для тестирования:

### 1. Установите ngrok

```bash
# На сервере
wget https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.tgz
tar -xzf ngrok-v3-stable-linux-amd64.tgz
sudo mv ngrok /usr/local/bin/
```

### 2. Зарегистрируйтесь на ngrok.com и получите токен

### 3. Настройте ngrok

```bash
ngrok config add-authtoken YOUR_NGROK_TOKEN
```

### 4. Запустите туннель для frontend

```bash
ngrok http 80
```

Или если frontend на другом порту:
```bash
ngrok http 5173  # для dev сервера
```

### 5. Используйте полученный HTTPS URL в BotFather

ngrok предоставит URL вида: `https://xxxx-xx-xx-xx-xx.ngrok-free.app`

**Важно:** Бесплатный ngrok меняет URL при каждом перезапуске. Для production нужен постоянный домен.

---

## Вариант 3: Деплой на бесплатные хостинги

### Render.com

1. Зарегистрируйтесь на [render.com](https://render.com)
2. Создайте новый Web Service для backend
3. Укажите:
   - Build Command: `cd backend && npm install && npm run build`
   - Start Command: `cd backend && node dist/server.js`
   - Environment Variables: добавьте все из `.env.example`
4. Создайте Static Site для frontend
5. Укажите:
   - Build Command: `cd frontend && npm install && npm run build`
   - Publish Directory: `frontend/dist`
   - Environment Variables: `VITE_BACKEND_URL=https://your-backend.onrender.com`

### Railway.app

1. Зарегистрируйтесь на [railway.app](https://railway.app)
2. Создайте новый проект
3. Добавьте два сервиса: один для backend, один для frontend
4. Настройте переменные окружения
5. Railway автоматически предоставит HTTPS URL

### Vercel (только frontend)

Vercel отлично подходит для frontend:

```bash
# Установите Vercel CLI
npm i -g vercel

# В директории frontend
cd frontend
vercel

# Следуйте инструкциям
```

Backend нужно деплоить отдельно (например, на Render или Railway).

---

## Проверка работы

### Проверка Backend

```bash
# Локально на сервере
curl http://localhost:4000/health

# Извне
curl https://your-backend-url/health
```

### Проверка Frontend

Откройте в браузере URL вашего frontend.

### Проверка в Telegram

1. Откройте вашего бота
2. Нажмите кнопку меню
3. Должно открыться WebApp

---

## Частые проблемы

### Backend не отвечает
- Проверьте логи: `pm2 logs`
- Проверьте, что порт открыт: `sudo ufw allow 4000`
- Проверьте .env файл

### Frontend не загружается
- Проверьте, что файлы собраны: `ls -la frontend/dist/`
- Проверьте права доступа: `sudo chown -R www-data:www-data frontend/dist`
- Проверьте логи Nginx: `sudo tail -f /var/log/nginx/error.log`

### Telegram WebApp не открывается
- **Обязательно HTTPS!** Telegram не работает с HTTP
- Проверьте, что URL доступен извне
- Проверьте настройки в BotFather

---

## Минимальная конфигурация для теста

Если нужно быстро протестировать локально:

1. Backend: `cd backend && npm run dev` (порт 4000)
2. Frontend: `cd frontend && npm run dev` (порт 5173)
3. Используйте ngrok для frontend: `ngrok http 5173`
4. Используйте полученный HTTPS URL в BotFather

**Примечание:** Это только для тестирования. Для production нужен полноценный деплой.

