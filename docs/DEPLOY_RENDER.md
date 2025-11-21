# Деплой приложения на Render.com

Подробная инструкция по деплою Telegram Web App на Render.com (бесплатный хостинг с HTTPS).

## Содержание

1. [Подготовка](#подготовка)
2. [Деплой Backend](#деплой-backend)
3. [Деплой Frontend](#деплой-frontend)
4. [Настройка Telegram WebApp](#настройка-telegram-webapp)
5. [Проверка работы](#проверка-работы)
6. [Обновление приложения](#обновление-приложения)

---

## Подготовка

### Что нужно:

1. **Аккаунт на Render.com** — зарегистрируйтесь на [render.com](https://render.com)
2. **GitHub репозиторий** — ваш проект должен быть в GitHub (Render.com подключается через GitHub)
3. **VK API токен** — получите на [vk.com/apps?act=manage](https://vk.com/apps?act=manage)
4. **VK Group ID** — ID вашей группы VK

### Структура проекта

Убедитесь, что ваш проект имеет следующую структуру:
```
tgwebapp/
├── backend/          # Backend приложение
├── frontend/         # Frontend приложение
├── docs/             # Документация
└── README.md
```

---

## Деплой Backend

### Шаг 1: Создание Web Service

1. Войдите в [Render Dashboard](https://dashboard.render.com)
2. Нажмите **"New +"** → **"Web Service"**
3. Подключите ваш GitHub репозиторий
4. Выберите репозиторий с проектом

### Шаг 2: Настройка Backend Service

Заполните следующие параметры:

#### Основные настройки:

- **Name**: `tgwebapp-backend` (или любое другое имя)
- **Region**: выберите ближайший регион (например, `Frankfurt` или `Oregon`)
- **Branch**: `main` (или ваша основная ветка)
- **Root Directory**: `backend` ⚠️ **Важно!**
- **Runtime**: `Node`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`

#### Environment Variables (переменные окружения):

Нажмите **"Add Environment Variable"** и добавьте:

```env
# Обязательные переменные
VK_API_TOKEN=your_vk_api_token_here
VK_GROUP_ID=your_vk_group_id_here

# Опциональные (можно оставить значения по умолчанию)
PORT=4000
NODE_ENV=production
USE_LOCAL_DB=false
ENRICH_PRODUCTS=false
MAX_COLLECTIONS_LIMIT=10
MAX_PRODUCTS_LIMIT=20
PHOTO_QUALITY=high
```

**Важно:**
- Замените `your_vk_api_token_here` на реальный токен VK API
- Замените `your_vk_group_id_here` на ID вашей группы VK
- `PORT` должен быть `4000` (или другой, если измените)

#### План:

- Выберите **"Free"** план (для тестирования)
- ⚠️ На бесплатном плане сервис "засыпает" после 15 минут неактивности и просыпается при первом запросе (может занять до 1 минуты)

### Шаг 3: Создание сервиса

1. Нажмите **"Create Web Service"**
2. Render начнет деплой
3. Дождитесь завершения сборки (обычно 3-5 минут)
4. После успешного деплоя вы получите URL вида: `https://tgwebapp-backend.onrender.com`

### Шаг 4: Проверка Backend

После деплоя проверьте:

```bash
# Проверка health endpoint
curl https://your-backend-name.onrender.com/health

# Должен вернуть:
# {"status":"ok","timestamp":1234567890}
```

**Сохраните URL вашего backend** — он понадобится для настройки frontend!

---

## Деплой Frontend

### Шаг 1: Создание Static Site

1. В Render Dashboard нажмите **"New +"** → **"Static Site"**
2. Выберите тот же GitHub репозиторий

### Шаг 2: Настройка Frontend

Заполните следующие параметры:

#### Основные настройки:

- **Name**: `tgwebapp-frontend` (или любое другое имя)
- **Branch**: `main` (или ваша основная ветка)
- **Root Directory**: `frontend` ⚠️ **Важно!**
- **Build Command**: `npm install && npm run build`
- **Publish Directory**: `dist` ⚠️ **Важно!**

#### Environment Variables:

Добавьте переменную окружения:

```env
VITE_BACKEND_URL=https://your-backend-name.onrender.com
```

**Важно:** 
- Замените `your-backend-name.onrender.com` на реальный URL вашего backend сервиса!
- Эта переменная используется только в production. В dev режиме frontend использует прокси через Vite (`/api` → `http://localhost:4000`)

### Шаг 3: Создание Static Site

1. Нажмите **"Create Static Site"**
2. Render начнет сборку frontend
3. Дождитесь завершения (обычно 2-3 минуты)
4. После успешного деплоя вы получите URL вида: `https://tgwebapp-frontend.onrender.com`

### Шаг 4: Проверка Frontend

Откройте URL в браузере — должна загрузиться главная страница приложения.

---

## Настройка Telegram WebApp

### Шаг 1: Создание бота (если еще нет)

1. Откройте [@BotFather](https://t.me/BotFather) в Telegram
2. Отправьте `/newbot` и следуйте инструкциям
3. Сохраните токен бота (он не нужен для WebApp, но может пригодиться)

### Шаг 2: Создание Web App

1. В [@BotFather](https://t.me/BotFather) отправьте `/newapp`
2. Выберите вашего бота
3. Введите название приложения (например, `Каталог товаров`)
4. Введите описание (например, `Витрина товаров из VK`)
5. **URL**: вставьте URL вашего frontend: `https://tgwebapp-frontend.onrender.com`
6. **Short name**: введите короткое имя (например, `catalog`)

### Шаг 3: Настройка кнопки меню

1. В [@BotFather](https://t.me/BotFather) отправьте `/mybots`
2. Выберите вашего бота
3. Выберите **"Bot Settings"** → **"Menu Button"**
4. Выберите **"Configure menu button"**
5. Введите текст кнопки (например, `Открыть каталог`)
6. Выберите созданное Web App

### Шаг 4: Проверка в Telegram

1. Откройте вашего бота в Telegram
2. Нажмите на кнопку меню (или отправьте `/start`)
3. Должно открыться Web App с вашим приложением

---

## Проверка работы

### 1. Проверка Backend

```bash
# Health check
curl https://your-backend-name.onrender.com/health

# Проверка коллекций
curl https://your-backend-name.onrender.com/products/collections
```

### 2. Проверка Frontend

- Откройте URL frontend в браузере
- Проверьте консоль браузера (F12) на наличие ошибок
- Убедитесь, что запросы к API идут на правильный backend URL

### 3. Проверка в Telegram

- Откройте бота в Telegram
- Нажмите на кнопку меню
- Проверьте, что загружаются коллекции
- Проверьте, что товары отображаются корректно

### Возможные проблемы:

#### Backend не отвечает / долго отвечает

- На бесплатном плане Render сервис "засыпает" после 15 минут неактивности
- Первый запрос после пробуждения может занять до 1 минуты
- Решение: используйте платный план или настройте cron job для "пробуждения"

#### CORS ошибки

- Убедитесь, что в backend настроен CORS для вашего frontend домена
- Проверьте, что `VITE_BACKEND_URL` в frontend указывает на правильный backend URL

#### Коллекции не загружаются

- Проверьте логи backend в Render Dashboard
- Убедитесь, что `VK_API_TOKEN` и `VK_GROUP_ID` заполнены правильно
- Проверьте, что токен VK имеет необходимые права

---

## Обновление приложения

### Обновление Backend

1. Внесите изменения в код
2. Закоммитьте и запушьте в GitHub
3. Render автоматически обнаружит изменения и начнет новый деплой
4. Дождитесь завершения деплоя (можно отслеживать в Dashboard)

### Обновление Frontend

1. Внесите изменения в код
2. Закоммитьте и запушьте в GitHub
3. Render автоматически обнаружит изменения и начнет новую сборку
4. Дождитесь завершения сборки

### Ручной деплой (если авто-деплой отключен)

1. В Render Dashboard откройте ваш сервис
2. Перейдите на вкладку **"Manual Deploy"**
3. Выберите ветку и нажмите **"Deploy latest commit"**

---

## Полезные ссылки

- [Render.com Documentation](https://render.com/docs)
- [Render.com Free Tier Limitations](https://render.com/docs/free)
- [Telegram Web Apps Documentation](https://core.telegram.org/bots/webapps)
- [VK API Documentation](https://dev.vk.com/api)

---

## Стоимость

### Бесплатный план (Free):

- ✅ Backend Web Service — бесплатно (с ограничениями)
- ✅ Static Site — бесплатно
- ✅ HTTPS — бесплатно
- ⚠️ Backend "засыпает" после 15 минут неактивности
- ⚠️ Пробуждение может занять до 1 минуты

### Платный план (Starter — $7/месяц):

- ✅ Backend всегда активен
- ✅ Быстрое пробуждение
- ✅ Больше ресурсов

Для тестирования бесплатного плана достаточно. Для production рекомендуется платный план.

---

## Альтернативы

Если Render.com не подходит, рассмотрите:

- **Railway.app** — похожий сервис с бесплатным планом
- **Fly.io** — хороший выбор для Node.js приложений
- **Vercel** — отлично для frontend (backend нужно деплоить отдельно)
- **Netlify** — похож на Vercel, хорош для статических сайтов

