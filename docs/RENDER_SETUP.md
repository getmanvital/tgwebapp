# Настройка переменных окружения на Render.com

## Проблема: "Подборки не найдены"

Фронтенд не может подключиться к бэкенду из-за отсутствия правильной конфигурации.

## Решение

### 1. Настройка Frontend сервиса на Render.com

В настройках Frontend сервиса добавьте переменную окружения:

**Имя переменной:** `VITE_BACKEND_URL`  
**Значение:** URL вашего Backend сервиса на Render.com (например: `https://tgwebapp-backend.onrender.com`)

⚠️ **Важно:** 
- URL должен быть полным (с `https://`)
- Не должно быть слеша в конце (`/`)
- После добавления переменной нужно пересобрать Frontend сервис

### 2. Настройка Backend сервиса на Render.com

Убедитесь, что в Backend сервисе установлены следующие переменные окружения:

#### Обязательные:
- `PORT` - обычно Render устанавливает автоматически, но можно указать явно (например: `10000`)
- `NODE_ENV` - `production`

#### Для работы с VK API (если используется):
- `VK_ACCESS_TOKEN` - токен доступа VK API
- `VK_GROUP_ID` - ID группы VK

#### Для локальной БД (если используется):
- `USE_LOCAL_DB=true` - использовать локальную SQLite базу данных
- `USE_MOCK_PRODUCTS=false` - отключить мок-режим

### 3. Проверка работы

1. Откройте URL Frontend сервиса
2. Откройте консоль браузера (F12)
3. Проверьте, что запросы идут на правильный URL бэкенда
4. Проверьте ответы от бэкенда в Network вкладке

### 4. Отладка

Если проблема сохраняется:

1. **Проверьте логи Backend** на Render.com:
   - Должны быть сообщения о запуске сервера
   - Проверьте, что сервер слушает правильный порт

2. **Проверьте логи Frontend** на Render.com:
   - Убедитесь, что переменная `VITE_BACKEND_URL` правильно подставилась при сборке

3. **Проверьте CORS**:
   - Backend уже настроен на разрешение запросов с любого источника (`Access-Control-Allow-Origin: *`)
   - Если проблема с CORS, проверьте логи браузера

4. **Проверьте endpoint бэкенда напрямую**:
   - Откройте в браузере: `https://your-backend-url.onrender.com/products/collections`
   - Должен вернуться JSON с коллекциями или пустой массив

### 5. Пример конфигурации

**Frontend Environment Variables:**
```
VITE_BACKEND_URL=https://tgwebapp-backend.onrender.com
```

**Backend Environment Variables:**
```
PORT=10000
NODE_ENV=production
USE_MOCK_PRODUCTS=false
USE_LOCAL_DB=true
VK_ACCESS_TOKEN=your_token_here
VK_GROUP_ID=your_group_id
```


