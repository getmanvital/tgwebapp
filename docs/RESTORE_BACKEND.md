# Восстановление Backend на Render.com

Если backend сервис пропал или не работает, следуйте этой инструкции.

## Проверка существующего Backend

1. В Render Dashboard проверьте вкладку **"All"** (вместо "Active")
2. Возможно, backend был приостановлен или удален

## Создание нового Backend сервиса

### Шаг 1: Создание Web Service

1. В Render Dashboard нажмите **"New +"** → **"Web Service"**
2. Подключите GitHub репозиторий `getmanvital/tgwebapp`
3. Выберите репозиторий

### Шаг 2: Настройка

**Основные настройки:**
- **Name**: `tgwebapp-backend`
- **Region**: выберите ближайший регион
- **Branch**: `main`
- **Root Directory**: `backend` ⚠️ **Важно!**
- **Runtime**: `Node`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`

**Environment Variables:**
Добавьте следующие переменные:

```env
VK_API_TOKEN=your_vk_api_token_here
VK_GROUP_ID=your_vk_group_id_here
PORT=4000
NODE_ENV=production
USE_LOCAL_DB=false
ENRICH_PRODUCTS=false
MAX_COLLECTIONS_LIMIT=10
MAX_PRODUCTS_LIMIT=20
PHOTO_QUALITY=high
```

**Важно:** Замените `your_vk_api_token_here` и `your_vk_group_id_here` на реальные значения!

### Шаг 3: Создание

Нажмите **"Create Web Service"** и дождитесь завершения деплоя.

## Обновление Frontend

После создания backend получите его URL (например, `https://tgwebapp-backend-xxxx.onrender.com`).

Затем обновите переменные окружения frontend:

1. Откройте ваш frontend сервис в Render Dashboard
2. Перейдите в **"Environment"**
3. Найдите переменную `VITE_BACKEND_URL`
4. Обновите её на новый URL backend
5. Сохраните изменения

Render автоматически пересоберет frontend с новым URL.

## Проверка работы

1. Проверьте backend: откройте `https://your-backend-url.onrender.com/health`
2. Должен вернуться: `{"status":"ok","timestamp":...}`
3. Проверьте frontend: откройте URL frontend в браузере
4. Коллекции должны загрузиться














