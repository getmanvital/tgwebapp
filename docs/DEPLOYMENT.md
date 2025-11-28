# Инструкция по деплою проекта на сервер и настройке Telegram WebApp

## Содержание
1. [Подготовка к деплою](#подготовка-к-деплою)
2. [Деплой Backend](#деплой-backend)
3. [Деплой Frontend](#деплой-frontend)
4. [Настройка Telegram WebApp](#настройка-telegram-webapp)
5. [Проверка работы](#проверка-работы)

---

## Подготовка к деплою

### Требования
- Сервер с установленным Node.js (версия 18 или выше)
- Nginx (или другой веб-сервер) для раздачи статики frontend
- Домен или поддомен с SSL-сертификатом (HTTPS обязателен для Telegram WebApp)
- Токен VK API и ID группы VK

### Структура на сервере
Рекомендуемая структура:
```
/var/www/tgwebapp/
├── backend/          # Backend приложение
├── frontend/         # Собранный frontend (dist/)
└── nginx/            # Конфигурация Nginx (опционально)
```

---

## Деплой Backend

### 1. Подготовка на сервере

```bash
# Создаем директорию для проекта
sudo mkdir -p /var/www/tgwebapp
sudo chown $USER:$USER /var/www/tgwebapp
cd /var/www/tgwebapp

# Клонируем репозиторий (или загружаем файлы)
git clone <your-repo-url> .
# ИЛИ загрузите файлы через scp/sftp
```

### 2. Установка зависимостей и сборка Backend

```bash
cd backend

# Устанавливаем зависимости
npm install --production=false

# Собираем TypeScript проект
npm run build
```

### 3. Настройка переменных окружения

Создайте файл `.env` в директории `backend/`:

```bash
cd backend
nano .env
```

Содержимое `.env`:
```env
# VK API настройки
# Получите токен на https://vk.com/apps?act=manage
VK_API_TOKEN=your_vk_api_token_here
# ID группы можно получить через: npm run get-group-id
VK_GROUP_ID=your_vk_group_id_here

# Сервер
PORT=4000
NODE_ENV=production

# Лимиты (для тестирования можно уменьшить)
MAX_COLLECTIONS_LIMIT=10
MAX_PRODUCTS_LIMIT=20

# Качество фото (original, high, medium, low)
# original - максимальное качество
# high - ~1000x600px (рекомендуется для production)
# medium - ~500x300px
# low - ~200x150px
PHOTO_QUALITY=high

# Использование локальной БД (true/false)
USE_LOCAL_DB=false

# Обогащение товаров полными фото при загрузке
ENRICH_PRODUCTS=false
```

**Важно:** 
- Замените `your_vk_api_token_here` и `your_vk_group_id_here` на реальные значения
- Для получения VK API токена создайте standalone приложение на https://vk.com/apps?act=manage
- ID группы можно получить, запустив `npm run get-group-id` в директории backend

### 4. Запуск Backend через PM2 (рекомендуется)

Установите PM2 для управления процессом:
```bash
npm install -g pm2
```

Создайте файл `ecosystem.config.js` в корне проекта:
```javascript
module.exports = {
  apps: [{
    name: 'tgwebapp-backend',
    script: './backend/dist/server.js',
    cwd: '/var/www/tgwebapp',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 4000
    },
    error_file: './logs/backend-error.log',
    out_file: './logs/backend-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    watch: false
  }]
};
```

Запустите backend:
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # Настройка автозапуска при перезагрузке сервера
```

### 5. Настройка Nginx для Backend (опционально)

Если хотите использовать Nginx как reverse proxy для backend:

```nginx
# /etc/nginx/sites-available/tgwebapp-backend
server {
    listen 80;
    server_name api.yourdomain.com;  # Замените на ваш домен

    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Активируйте конфигурацию:
```bash
sudo ln -s /etc/nginx/sites-available/tgwebapp-backend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## Деплой Frontend

### 1. Сборка Frontend

```bash
cd /var/www/tgwebapp/frontend

# Устанавливаем зависимости
npm install

# Создаем .env файл для сборки
nano .env
```

Содержимое `.env` в `frontend/`:
```env
# URL backend сервера
# Для production (обязательно HTTPS):
VITE_BACKEND_URL=https://api.yourdomain.com

# ИЛИ если backend на том же домене:
# VITE_BACKEND_URL=https://yourdomain.com:4000

# Для локальной разработки:
# VITE_BACKEND_URL=http://localhost:4000
```

**Важно:** 
- Используйте HTTPS URL для production (Telegram WebApp требует HTTPS)
- Если backend и frontend на одном домене, можно использовать относительные пути или тот же домен с портом
- Убедитесь, что backend доступен по указанному URL

Собираем проект:
```bash
npm run build
```

После сборки в директории `frontend/dist/` будут готовые файлы для деплоя.

### 2. Настройка Nginx для Frontend

Создайте конфигурацию Nginx:

```nginx
# /etc/nginx/sites-available/tgwebapp-frontend
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;  # Замените на ваш домен

    root /var/www/tgwebapp/frontend/dist;
    index index.html;

    # Логирование
    access_log /var/log/nginx/tgwebapp-access.log;
    error_log /var/log/nginx/tgwebapp-error.log;

    # Основная конфигурация
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Кэширование статических файлов
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Безопасность
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

Активируйте конфигурацию:
```bash
sudo ln -s /etc/nginx/sites-available/tgwebapp-frontend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 3. Настройка SSL (обязательно для Telegram WebApp)

Telegram WebApp требует HTTPS. Используйте Let's Encrypt:

```bash
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx

# Получаем сертификат
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Автоматическое обновление
sudo certbot renew --dry-run
```

После этого Nginx автоматически обновится для использования HTTPS.

---

## Настройка Telegram WebApp

### 1. Создание бота через BotFather

1. Откройте Telegram и найдите [@BotFather](https://t.me/BotFather)
2. Отправьте команду `/newbot`
3. Следуйте инструкциям для создания бота
4. Сохраните полученный токен бота

### 2. Настройка WebApp через BotFather

1. Отправьте BotFather команду `/newapp`
2. Выберите вашего бота из списка
3. Заполните информацию:
   - **Title:** Название вашего приложения (например, "Каталог товаров")
   - **Short name:** Короткое имя (латиницей, без пробелов)
   - **Description:** Описание приложения
   - **Photo:** Загрузите иконку приложения (640x360px, JPG/PNG)
   - **Web App URL:** `https://yourdomain.com` (URL вашего frontend)
   - **GIF:** (опционально) Анимированная превью
   - **Video:** (опционально) Видео демонстрация

4. BotFather предоставит вам:
   - Ссылку на ваше WebApp
   - Инструкции по добавлению кнопки в меню бота

### 3. Настройка Webhook для получения сообщений

Для того чтобы менеджер получал уведомления о сообщениях от клиентов, необходимо настроить webhook:

#### 3.1. Получение ID менеджера

1. Найдите в Telegram бота [@userinfobot](https://t.me/userinfobot)
2. Отправьте ему любое сообщение
3. Скопируйте ваш числовой ID (например: `123456789`)
4. Добавьте в `.env` файл Backend: `TELEGRAM_MANAGER_ID=123456789`

#### 3.2. Автоматическая настройка webhook (рекомендуется)

Добавьте в `backend/.env` на сервере:

```env
AUTO_SETUP_WEBHOOK=true
```

Webhook автоматически настроится при старте/перезапуске сервера:

```bash
pm2 restart backend
# Webhook настроится автоматически
```

Проверьте логи:
```bash
pm2 logs backend
# Должно быть: ✅ Webhook auto-configured successfully
```

#### 3.3. Ручная настройка webhook (если AUTO_SETUP_WEBHOOK=false)

**Способ 1: Post-deploy скрипт**

```bash
bash scripts/post-deploy.sh
```

**Способ 2: Через npm скрипт**

```bash
cd backend
npm run webhook:setup
```

**Способ 3: Вручную через curl**

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://yourdomain.com/messages/webhook",
    "allowed_updates": ["message"]
  }'
```

**Проверка статуса webhook:**

```bash
# Через npm
cd backend
npm run webhook:info

# Через health endpoint
curl https://yourdomain.com/health

# Или напрямую через Telegram API
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"
```

**Важно:**
- Webhook требует HTTPS (Telegram не работает с HTTP)
- Убедитесь, что `BACKEND_URL` в `.env` указывает на публичный URL с HTTPS
- С `AUTO_SETUP_WEBHOOK=true` webhook настроится автоматически при старте
- После настройки webhook сообщения от пользователей будут приходить менеджеру в Telegram

### 4. Добавление кнопки в меню бота

Отправьте BotFather команду `/mybots`, выберите вашего бота, затем:
1. Выберите "Bot Settings" → "Menu Button"
2. Выберите "Configure Menu Button"
3. Введите текст кнопки (например, "Открыть каталог")
4. Выберите "Web App"
5. Введите URL: `https://yourdomain.com`

### 5. Альтернативный способ: через Bot API

Вы также можете настроить кнопку программно через Bot API:

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setChatMenuButton" \
  -H "Content-Type: application/json" \
  -d '{
    "menu_button": {
      "type": "web_app",
      "text": "Открыть каталог",
      "web_app": {
        "url": "https://yourdomain.com"
      }
    }
  }'
```

---

## Проверка работы

### 1. Проверка Backend

```bash
# Проверка здоровья сервиса
curl http://localhost:4000/health

# Или через домен
curl https://api.yourdomain.com/health
```

Должен вернуться JSON: `{"status":"ok","timestamp":...}`

### 2. Проверка Frontend

Откройте в браузере: `https://yourdomain.com`

Должна загрузиться главная страница приложения.

### 3. Проверка в Telegram

1. Откройте вашего бота в Telegram
2. Нажмите на кнопку меню (или отправьте команду `/start`, если настроена кнопка)
3. Должно открыться WebApp с вашим приложением

### 4. Проверка CORS

Если возникают проблемы с CORS, убедитесь, что:
- Backend настроен на разрешение запросов с вашего домена
- В `backend/src/server.ts` правильно настроены заголовки CORS

---

## Обновление приложения

### Обновление Backend

```bash
cd /var/www/tgwebapp/backend
git pull  # или загрузите новые файлы
npm install
npm run build
pm2 restart tgwebapp-backend
```

### Обновление Frontend

```bash
cd /var/www/tgwebapp/frontend
git pull  # или загрузите новые файлы
npm install
npm run build
# Nginx автоматически будет раздавать новые файлы
```

---

## Решение проблем

### Backend не запускается
- Проверьте логи: `pm2 logs tgwebapp-backend`
- Убедитесь, что порт 4000 свободен: `netstat -tulpn | grep 4000`
- Проверьте переменные окружения в `.env`

### Frontend не загружается
- Проверьте, что файлы собраны: `ls -la frontend/dist/`
- Проверьте логи Nginx: `sudo tail -f /var/log/nginx/tgwebapp-error.log`
- Убедитесь, что SSL сертификат действителен

### WebApp не открывается в Telegram
- Убедитесь, что используется HTTPS (не HTTP)
- Проверьте, что домен доступен извне
- Проверьте настройки в BotFather
- Убедитесь, что URL начинается с `https://`

### Ошибки CORS
- Проверьте настройки CORS в `backend/src/server.ts`
- Убедитесь, что `VITE_BACKEND_URL` в frontend указывает на правильный адрес

---

## Безопасность

### Рекомендации для production:

1. **Ограничьте доступ к backend:**
   - Используйте firewall для ограничения доступа к порту 4000
   - Настройте Nginx для защиты backend

2. **Защитите токены:**
   - Никогда не коммитьте `.env` файлы в git
   - Используйте переменные окружения системы вместо файлов `.env` в production

3. **Настройте мониторинг:**
   - Используйте PM2 мониторинг: `pm2 monit`
   - Настройте логирование ошибок

4. **Регулярные обновления:**
   - Обновляйте зависимости: `npm audit fix`
   - Следите за обновлениями безопасности

---

## Полезные команды

```bash
# Просмотр статуса PM2
pm2 status

# Просмотр логов
pm2 logs tgwebapp-backend

# Перезапуск backend
pm2 restart tgwebapp-backend

# Проверка конфигурации Nginx
sudo nginx -t

# Перезагрузка Nginx
sudo systemctl reload nginx

# Проверка портов
sudo netstat -tulpn | grep -E '4000|80|443'
```

---

## Дополнительные ресурсы

- [Telegram Bot API Documentation](https://core.telegram.org/bots/api)
- [Telegram Web Apps Documentation](https://core.telegram.org/bots/webapps)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)

